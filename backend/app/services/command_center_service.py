"""Command Center data aggregation service."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cohort import CohortAssignment
from app.models.patient import Patient, PatientLab
from app.models.program import Program

_insights_cache: dict[str, dict] = {}
INSIGHTS_CACHE_TTL_SECONDS = 86400


async def get_kpis(db: AsyncSession, tenant_id: uuid.UUID) -> dict:
    total_members = (await db.execute(
        select(func.count()).where(Patient.tenant_id == tenant_id, Patient.is_active == True)
    )).scalar_one()

    avg_risk_score = (await db.execute(
        select(func.avg(CohortAssignment.score)).where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.is_current == True,
            CohortAssignment.score.isnot(None),
        )
    )).scalar_one()

    latest_hba1c_sq = (
        select(
            PatientLab.patient_id,
            PatientLab.value,
            func.row_number()
            .over(partition_by=PatientLab.patient_id, order_by=PatientLab.recorded_at.desc())
            .label("rn"),
        )
        .where(
            PatientLab.tenant_id == tenant_id,
            PatientLab.test_type == "HbA1c",
        )
        .subquery()
    )
    latest_hba1c = select(latest_hba1c_sq.c.patient_id, latest_hba1c_sq.c.value).where(
        latest_hba1c_sq.c.rn == 1
    ).subquery()

    total_with_hba1c = (await db.execute(
        select(func.count()).select_from(latest_hba1c)
    )).scalar_one()

    controlled_count = (await db.execute(
        select(func.count()).select_from(latest_hba1c).where(latest_hba1c.c.value < 7.0)
    )).scalar_one()

    hba1c_control_rate = round(controlled_count / total_with_hba1c * 100, 1) if total_with_hba1c > 0 else None

    open_care_gaps = (await db.execute(
        select(func.count()).where(
            Patient.tenant_id == tenant_id,
            Patient.is_active == True,
            Patient.care_gaps.isnot(None),
            func.jsonb_array_length(Patient.care_gaps) > 0,
        )
    )).scalar_one()

    result = await db.execute(
        select(Patient.active_medications).where(
            Patient.tenant_id == tenant_id,
            Patient.is_active == True,
            Patient.active_medications.isnot(None),
        )
    )
    med_rows = result.all()
    total_with_meds = 0
    pdc_compliant = 0
    for (meds,) in med_rows:
        if not meds or not isinstance(meds, list) or len(meds) == 0:
            continue
        pdc_values = [m.get("pdc_90day", 0) for m in meds if isinstance(m, dict)]
        if not pdc_values:
            continue
        total_with_meds += 1
        avg_pdc = sum(pdc_values) / len(pdc_values)
        if avg_pdc >= 0.80:
            pdc_compliant += 1

    pdc_above_80_rate = round(pdc_compliant / total_with_meds * 100, 1) if total_with_meds > 0 else None

    return {
        "total_members": total_members,
        "avg_risk_score": round(avg_risk_score, 1) if avg_risk_score is not None else None,
        "hba1c_control_rate": hba1c_control_rate,
        "open_care_gaps": open_care_gaps,
        "pdc_above_80_rate": pdc_above_80_rate,
    }


async def get_action_queue(
    db: AsyncSession, tenant_id: uuid.UUID, limit: int = 20,
) -> dict:
    items: list[dict] = []
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    overdue_q = (
        select(CohortAssignment)
        .where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.is_current == True,
            CohortAssignment.review_due_at.isnot(None),
            CohortAssignment.review_due_at < now,
        )
        .options(
            selectinload(CohortAssignment.patient),
            selectinload(CohortAssignment.cohort),
        )
        .order_by(CohortAssignment.review_due_at.asc())
        .limit(limit)
    )
    overdue_result = await db.execute(overdue_q)
    for a in overdue_result.scalars().all():
        if not a.patient:
            continue
        name = f"{a.patient.first_name} {a.patient.last_name}"
        cohort_name = a.cohort.name if a.cohort else "Unknown"
        cohort_color = a.cohort.color if a.cohort else "#e2e8f0"
        items.append({
            "id": f"overdue-{a.id}",
            "patient_id": str(a.patient_id),
            "patient_name": name,
            "alert_type": "overdue_review",
            "title": f"Overdue review for {name}",
            "description": f"Review was due {a.review_due_at.strftime('%b %d, %Y')}",
            "priority": "high",
            "cohort_name": cohort_name,
            "cohort_color": cohort_color,
            "actions": [
                {"label": "View Patient", "action_type": "navigate", "target": str(a.patient_id)},
                {"label": "Schedule Review", "action_type": "outreach", "target": "schedule_review"},
            ],
        })

    gap_q = (
        select(Patient)
        .where(
            Patient.tenant_id == tenant_id,
            Patient.is_active == True,
            Patient.care_gaps.isnot(None),
            func.jsonb_array_length(Patient.care_gaps) > 0,
        )
        .limit(limit)
    )
    gap_result = await db.execute(gap_q)
    for p in gap_result.scalars().all():
        ca_q = (
            select(CohortAssignment)
            .where(
                CohortAssignment.tenant_id == tenant_id,
                CohortAssignment.patient_id == p.id,
                CohortAssignment.is_current == True,
            )
            .options(selectinload(CohortAssignment.cohort))
            .limit(1)
        )
        ca_result = await db.execute(ca_q)
        ca = ca_result.scalar_one_or_none()
        cohort_name = ca.cohort.name if ca and ca.cohort else "Unassigned"
        cohort_color = ca.cohort.color if ca and ca.cohort else "#e2e8f0"

        gaps = p.care_gaps if isinstance(p.care_gaps, list) else []
        gap_str = ", ".join(gaps[:3])
        items.append({
            "id": f"gap-{p.id}",
            "patient_id": str(p.id),
            "patient_name": f"{p.first_name} {p.last_name}",
            "alert_type": "care_gap",
            "title": f"Open care gaps: {gap_str}",
            "description": f"{len(gaps)} care gap(s) need attention",
            "priority": "medium",
            "cohort_name": cohort_name,
            "cohort_color": cohort_color,
            "actions": [
                {"label": "View Patient", "action_type": "navigate", "target": str(p.id)},
                {"label": "Send Outreach", "action_type": "outreach", "target": "care_gap_outreach"},
            ],
        })

    change_q = (
        select(CohortAssignment)
        .where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.is_current == True,
            CohortAssignment.previous_cohort_id.isnot(None),
        )
        .options(
            selectinload(CohortAssignment.patient),
            selectinload(CohortAssignment.cohort),
        )
        .order_by(CohortAssignment.assigned_at.desc())
        .limit(limit)
    )
    change_result = await db.execute(change_q)
    for a in change_result.scalars().all():
        if not a.patient:
            continue
        name = f"{a.patient.first_name} {a.patient.last_name}"
        cohort_name = a.cohort.name if a.cohort else "Unknown"
        cohort_color = a.cohort.color if a.cohort else "#e2e8f0"
        items.append({
            "id": f"change-{a.id}",
            "patient_id": str(a.patient_id),
            "patient_name": name,
            "alert_type": "cohort_change",
            "title": f"{name} moved to {cohort_name}",
            "description": "Recent cohort reassignment — verify care plan alignment",
            "priority": "low",
            "cohort_name": cohort_name,
            "cohort_color": cohort_color,
            "actions": [
                {"label": "View Patient", "action_type": "navigate", "target": str(a.patient_id)},
            ],
        })

    priority_order = {"high": 0, "medium": 1, "low": 2}
    items.sort(key=lambda x: priority_order.get(x["priority"], 9))
    items = items[:limit]

    return {"items": items, "total": len(items)}


async def get_population_insights(
    db: AsyncSession, tenant_id: uuid.UUID,
) -> dict:
    cache_key = f"insights-{tenant_id}"
    now = datetime.now(timezone.utc)

    if cache_key in _insights_cache:
        cached = _insights_cache[cache_key]
        age = (now - datetime.fromisoformat(cached["generated_at"])).total_seconds()
        if age < INSIGHTS_CACHE_TTL_SECONDS:
            return {**cached, "is_cached": True}

    kpis = await get_kpis(db, tenant_id)

    try:
        from app.llm import get_provider
        from app.llm.prompts import PROMPT_REGISTRY

        provider = get_provider()
        template = PROMPT_REGISTRY["population_insights"]
        system_prompt, user_prompt = template.render(
            total_members=kpis["total_members"],
            avg_risk_score=kpis["avg_risk_score"],
            hba1c_control_rate=kpis["hba1c_control_rate"],
            open_care_gaps=kpis["open_care_gaps"],
            pdc_above_80_rate=kpis["pdc_above_80_rate"],
        )

        markdown = await provider.generate(user_prompt, system=system_prompt, max_tokens=512)
    except Exception:
        markdown = _build_static_insights(kpis)

    result = {
        "markdown": markdown,
        "generated_at": now.isoformat(),
        "is_cached": False,
    }
    _insights_cache[cache_key] = result
    return result


def _build_static_insights(kpis: dict) -> str:
    total = kpis["total_members"]
    avg_score = kpis["avg_risk_score"]
    hba1c_rate = kpis["hba1c_control_rate"]
    gaps = kpis["open_care_gaps"]
    pdc_rate = kpis["pdc_above_80_rate"]

    lines = ["## Daily Population Digest\n"]
    lines.append(f"- **{total}** active members under management")
    if avg_score is not None:
        lines.append(f"- Average risk score: **{avg_score}** across all programs")
    if hba1c_rate is not None:
        lines.append(f"- HbA1c control rate (<7%): **{hba1c_rate}%** of tested patients")
    lines.append(f"- **{gaps}** patients have open care gaps requiring attention")
    if pdc_rate is not None:
        lines.append(f"- Medication adherence (PDC ≥80%): **{pdc_rate}%** of patients on therapy")
    lines.append("\n**Recommended actions:**")
    if gaps > 0:
        lines.append(f"- Prioritise outreach to {min(gaps, 20)} patients with overdue screenings")
    if pdc_rate is not None and pdc_rate < 80:
        lines.append("- Review medication adherence barriers for non-compliant patients")

    return "\n".join(lines)


async def get_upcoming_reviews(
    db: AsyncSession, tenant_id: uuid.UUID, limit: int = 20,
) -> dict:
    now = datetime.now(timezone.utc)

    q = (
        select(CohortAssignment)
        .where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.is_current == True,
            CohortAssignment.review_due_at.isnot(None),
            CohortAssignment.review_due_at >= now,
        )
        .options(
            selectinload(CohortAssignment.patient),
            selectinload(CohortAssignment.cohort),
        )
        .order_by(CohortAssignment.review_due_at.asc())
        .limit(limit)
    )
    result = await db.execute(q)
    assignments = result.scalars().all()

    program_ids = list({a.program_id for a in assignments})
    programs_map: dict[uuid.UUID, str] = {}
    if program_ids:
        prog_result = await db.execute(
            select(Program.id, Program.name).where(Program.id.in_(program_ids))
        )
        for pid, pname in prog_result.all():
            programs_map[pid] = pname

    items = []
    for a in assignments:
        if not a.patient:
            continue
        days_until = (a.review_due_at - now).days
        items.append({
            "patient_id": str(a.patient_id),
            "patient_name": f"{a.patient.first_name} {a.patient.last_name}",
            "program_id": str(a.program_id),
            "program_name": programs_map.get(a.program_id, "Unknown"),
            "cohort_name": a.cohort.name if a.cohort else "Unknown",
            "cohort_color": a.cohort.color if a.cohort else "#e2e8f0",
            "review_due_at": a.review_due_at.isoformat(),
            "days_until_due": max(days_until, 0),
        })

    return {"items": items, "total": len(items)}
