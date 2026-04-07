"""Live metric computation from patient data. Every metric is a real SQL query."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import and_, func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cohort import CohortAssignment
from app.models.communication import ConciergeAction
from app.models.patient import Patient, PatientLab


def _base_patient_filter(tenant_id: uuid.UUID, program_id: uuid.UUID, cohort_id: uuid.UUID | None):
    """Return a list of WHERE clauses to filter active patients in a program (optionally a cohort)."""
    conditions = [
        CohortAssignment.tenant_id == tenant_id,
        CohortAssignment.program_id == program_id,
        CohortAssignment.is_current == True,
    ]
    if cohort_id is not None:
        conditions.append(CohortAssignment.cohort_id == cohort_id)
    return conditions


async def _get_active_patient_ids(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None,
) -> list[uuid.UUID]:
    """Get patient IDs with current assignments in the program/cohort."""
    q = select(CohortAssignment.patient_id).where(
        *_base_patient_filter(tenant_id, program_id, cohort_id)
    )
    result = await db.execute(q)
    return [row[0] for row in result.all()]


# ── Clinical Metrics ─────────────────────────────────────────────────────

async def hba1c_control_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% of patients with latest HbA1c < 7.0"""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    rn = (
        func.row_number()
        .over(partition_by=PatientLab.patient_id, order_by=PatientLab.recorded_at.desc())
        .label("rn")
    )
    date_filters = [PatientLab.patient_id.in_(patient_ids), PatientLab.test_type == "HbA1c"]
    if period_end is not None:
        date_filters.append(PatientLab.recorded_at <= datetime.combine(period_end, datetime.max.time(), tzinfo=timezone.utc))

    sq = select(PatientLab.patient_id, PatientLab.value, rn).where(*date_filters).subquery()
    latest = select(sq.c.patient_id, sq.c.value).where(sq.c.rn == 1).subquery()

    total = (await db.execute(select(func.count()).select_from(latest))).scalar_one()
    if total == 0:
        return {"value": None, "data_available": False}

    controlled = (await db.execute(
        select(func.count()).select_from(latest).where(latest.c.value < 7.0)
    )).scalar_one()

    return {"value": round(controlled / total * 100, 1), "data_available": True}


async def hba1c_improvement_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% of patients whose latest HbA1c is lower than their first recorded HbA1c."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    rn_first = (
        func.row_number()
        .over(partition_by=PatientLab.patient_id, order_by=PatientLab.recorded_at.asc())
        .label("rn")
    )
    first_sq = select(PatientLab.patient_id, PatientLab.value.label("first_val"), rn_first).where(
        PatientLab.patient_id.in_(patient_ids), PatientLab.test_type == "HbA1c"
    ).subquery()
    first = select(first_sq.c.patient_id, first_sq.c.first_val).where(first_sq.c.rn == 1).subquery()

    rn_last = (
        func.row_number()
        .over(partition_by=PatientLab.patient_id, order_by=PatientLab.recorded_at.desc())
        .label("rn")
    )
    last_sq = select(PatientLab.patient_id, PatientLab.value.label("last_val"), rn_last).where(
        PatientLab.patient_id.in_(patient_ids), PatientLab.test_type == "HbA1c"
    ).subquery()
    last = select(last_sq.c.patient_id, last_sq.c.last_val).where(last_sq.c.rn == 1).subquery()

    joined = (
        select(first.c.patient_id, first.c.first_val, last.c.last_val)
        .join(last, first.c.patient_id == last.c.patient_id)
        .subquery()
    )

    total = (await db.execute(select(func.count()).select_from(joined))).scalar_one()
    if total == 0:
        return {"value": None, "data_available": False}

    improved = (await db.execute(
        select(func.count()).select_from(joined).where(joined.c.last_val < joined.c.first_val)
    )).scalar_one()

    return {"value": round(improved / total * 100, 1), "data_available": True}


async def hospitalisation_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """Hospitalizations per 1000 member-months. Derived from diagnosis codes."""
    from app.models.patient import PatientDiagnosis

    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    member_months = len(patient_ids) * 12

    hosp_codes = ("I50%", "E11.10", "E10.10", "N17%")
    conditions = [
        PatientDiagnosis.patient_id.in_(patient_ids),
        PatientDiagnosis.is_active == True,
    ]
    code_filters = [PatientDiagnosis.icd10_code.like(code) for code in hosp_codes]
    conditions.append(or_(*code_filters))

    hosp_count = (await db.execute(
        select(func.count()).where(*conditions)
    )).scalar_one()

    rate = round(hosp_count / member_months * 1000, 1) if member_months > 0 else 0
    return {"value": rate, "data_available": True}


async def care_gap_closure_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% of patients who had care gaps that are now resolved (empty care_gaps array)."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    total = len(patient_ids)

    no_gaps = (await db.execute(
        select(func.count()).where(
            Patient.id.in_(patient_ids),
            Patient.is_active == True,
        ).where(
            func.coalesce(func.json_array_length(Patient.care_gaps), 0) == 0
        )
    )).scalar_one()

    return {"value": round(no_gaps / total * 100, 1), "data_available": True}


async def avg_pdc(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """Average PDC across all active medications for the filtered population."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    result = await db.execute(
        select(Patient.active_medications).where(
            Patient.id.in_(patient_ids),
            Patient.is_active == True,
            Patient.active_medications.isnot(None),
        )
    )
    med_rows = result.all()

    pdc_sum = 0.0
    pdc_count = 0
    for (meds,) in med_rows:
        if not meds or not isinstance(meds, list):
            continue
        for m in meds:
            if isinstance(m, dict) and "pdc_90day" in m:
                pdc_sum += m["pdc_90day"]
                pdc_count += 1

    if pdc_count == 0:
        return {"value": None, "data_available": False}

    return {"value": round(pdc_sum / pdc_count * 100, 1), "data_available": True}


async def pdc_above_80_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% of patients with average PDC >= 0.80."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    result = await db.execute(
        select(Patient.active_medications).where(
            Patient.id.in_(patient_ids),
            Patient.is_active == True,
            Patient.active_medications.isnot(None),
        )
    )
    med_rows = result.all()

    total_with_meds = 0
    compliant = 0
    for (meds,) in med_rows:
        if not meds or not isinstance(meds, list) or len(meds) == 0:
            continue
        pdc_values = [m.get("pdc_90day", 0) for m in meds if isinstance(m, dict)]
        if not pdc_values:
            continue
        total_with_meds += 1
        if sum(pdc_values) / len(pdc_values) >= 0.80:
            compliant += 1

    if total_with_meds == 0:
        return {"value": None, "data_available": False}

    return {"value": round(compliant / total_with_meds * 100, 1), "data_available": True}


# ── HEDIS Metrics ────────────────────────────────────────────────────────

async def hedis_hba1c_testing(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% of diabetic patients with at least 1 HbA1c test in the measurement period."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    total = len(patient_ids)

    date_filters = [PatientLab.patient_id.in_(patient_ids), PatientLab.test_type == "HbA1c"]
    if period_start:
        date_filters.append(PatientLab.recorded_at >= datetime.combine(period_start, datetime.min.time(), tzinfo=timezone.utc))
    if period_end:
        date_filters.append(PatientLab.recorded_at <= datetime.combine(period_end, datetime.max.time(), tzinfo=timezone.utc))

    tested = (await db.execute(
        select(func.count(func.distinct(PatientLab.patient_id))).where(*date_filters)
    )).scalar_one()

    return {"value": round(tested / total * 100, 1), "data_available": True}


async def hedis_eye_exam(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% with eye exam — proxied via care_gaps (patients WITHOUT 'Eye exam' in care_gaps have completed it)."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    total = len(patient_ids)

    result = await db.execute(
        select(Patient.id, Patient.care_gaps).where(Patient.id.in_(patient_ids))
    )
    compliant = 0
    for pid, gaps in result.all():
        gap_list = gaps if isinstance(gaps, list) else []
        if "Eye exam" not in gap_list:
            compliant += 1

    return {"value": round(compliant / total * 100, 1), "data_available": True}


async def hedis_nephropathy(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% with nephropathy screening (eGFR or uACR test in patient_labs)."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    total = len(patient_ids)

    date_filters = [
        PatientLab.patient_id.in_(patient_ids),
        PatientLab.test_type.in_(["eGFR", "uACR"]),
    ]
    if period_start:
        date_filters.append(PatientLab.recorded_at >= datetime.combine(period_start, datetime.min.time(), tzinfo=timezone.utc))
    if period_end:
        date_filters.append(PatientLab.recorded_at <= datetime.combine(period_end, datetime.max.time(), tzinfo=timezone.utc))

    screened = (await db.execute(
        select(func.count(func.distinct(PatientLab.patient_id))).where(*date_filters)
    )).scalar_one()

    return {"value": round(screened / total * 100, 1), "data_available": True}


async def hedis_bp_control(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% with BP < 140/90 (from latest BP Systolic in patient_labs)."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    rn = (
        func.row_number()
        .over(partition_by=PatientLab.patient_id, order_by=PatientLab.recorded_at.desc())
        .label("rn")
    )
    sq = select(PatientLab.patient_id, PatientLab.value, rn).where(
        PatientLab.patient_id.in_(patient_ids),
        PatientLab.test_type == "BP Systolic",
    ).subquery()
    latest = select(sq.c.patient_id, sq.c.value).where(sq.c.rn == 1).subquery()

    total = (await db.execute(select(func.count()).select_from(latest))).scalar_one()
    if total == 0:
        return {"value": None, "data_available": False}

    controlled = (await db.execute(
        select(func.count()).select_from(latest).where(latest.c.value < 140)
    )).scalar_one()

    return {"value": round(controlled / total * 100, 1), "data_available": True}


# ── Engagement Metrics ───────────────────────────────────────────────────

async def enrollment_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% of active patients with a current cohort assignment in this program."""
    total_active = (await db.execute(
        select(func.count()).where(Patient.tenant_id == tenant_id, Patient.is_active == True)
    )).scalar_one()

    if total_active == 0:
        return {"value": None, "data_available": False}

    enrolled = (await db.execute(
        select(func.count(func.distinct(CohortAssignment.patient_id))).where(
            *_base_patient_filter(tenant_id, program_id, cohort_id)
        )
    )).scalar_one()

    return {"value": round(enrolled / total_active * 100, 1), "data_available": True}


async def touchpoint_completion_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% of concierge_actions with status='success'."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    total_actions = (await db.execute(
        select(func.count()).where(
            ConciergeAction.tenant_id == tenant_id,
            ConciergeAction.patient_id.in_(patient_ids),
        )
    )).scalar_one()

    if total_actions == 0:
        return {"value": None, "data_available": False}

    success_actions = (await db.execute(
        select(func.count()).where(
            ConciergeAction.tenant_id == tenant_id,
            ConciergeAction.patient_id.in_(patient_ids),
            ConciergeAction.status == "success",
        )
    )).scalar_one()

    return {"value": round(success_actions / total_actions * 100, 1), "data_available": True}


async def avg_response_time(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """Average hours between wa_dispatched and wa_replied actions per patient."""
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    dispatched = await db.execute(
        select(ConciergeAction.patient_id, ConciergeAction.created_at).where(
            ConciergeAction.tenant_id == tenant_id,
            ConciergeAction.patient_id.in_(patient_ids),
            ConciergeAction.action_type == "wa_dispatched",
        ).order_by(ConciergeAction.patient_id, ConciergeAction.created_at)
    )
    dispatch_map: dict[uuid.UUID, list[datetime]] = {}
    for pid, ts in dispatched.all():
        dispatch_map.setdefault(pid, []).append(ts)

    replied = await db.execute(
        select(ConciergeAction.patient_id, ConciergeAction.created_at).where(
            ConciergeAction.tenant_id == tenant_id,
            ConciergeAction.patient_id.in_(patient_ids),
            ConciergeAction.action_type == "wa_replied",
        ).order_by(ConciergeAction.patient_id, ConciergeAction.created_at)
    )
    reply_map: dict[uuid.UUID, list[datetime]] = {}
    for pid, ts in replied.all():
        reply_map.setdefault(pid, []).append(ts)

    total_hours = 0.0
    pair_count = 0
    for pid, dispatches in dispatch_map.items():
        replies = reply_map.get(pid, [])
        reply_idx = 0
        for d_ts in dispatches:
            while reply_idx < len(replies) and replies[reply_idx] <= d_ts:
                reply_idx += 1
            if reply_idx < len(replies):
                delta = (replies[reply_idx] - d_ts).total_seconds() / 3600
                total_hours += delta
                pair_count += 1
                reply_idx += 1

    if pair_count == 0:
        return {"value": None, "data_available": False}

    return {"value": round(total_hours / pair_count, 1), "data_available": True}


async def active_sequence_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% of patients with at least one concierge_action in last 30 days."""
    from datetime import timedelta
    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    total = len(patient_ids)
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    active_patients = (await db.execute(
        select(func.count(func.distinct(ConciergeAction.patient_id))).where(
            ConciergeAction.tenant_id == tenant_id,
            ConciergeAction.patient_id.in_(patient_ids),
            ConciergeAction.created_at >= cutoff,
        )
    )).scalar_one()

    return {"value": round(active_patients / total * 100, 1), "data_available": True}


# ── Financial Metrics ────────────────────────────────────────────────────

async def cost_avoidance_per_member(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
    savings_per_migration: float = 500.0,
) -> dict:
    """Estimated cost avoidance from patients who moved to lower-risk cohorts."""
    from app.models.cohort import Cohort

    cohorts_result = await db.execute(
        select(Cohort.id, Cohort.sort_order).where(Cohort.program_id == program_id)
    )
    sort_map = {cid: order for cid, order in cohorts_result.all()}

    if not sort_map:
        return {"value": None, "data_available": False}

    migrations = await db.execute(
        select(CohortAssignment.cohort_id, CohortAssignment.previous_cohort_id).where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.program_id == program_id,
            CohortAssignment.previous_cohort_id.isnot(None),
        )
    )

    improvement_count = 0
    total_members = len(await _get_active_patient_ids(db, tenant_id, program_id, cohort_id))

    for to_cohort, from_cohort in migrations.all():
        from_order = sort_map.get(from_cohort)
        to_order = sort_map.get(to_cohort)
        if from_order is not None and to_order is not None and to_order < from_order:
            improvement_count += 1

    if total_members == 0:
        return {"value": None, "data_available": False}

    total_avoidance = improvement_count * savings_per_migration
    per_member = round(total_avoidance / total_members, 2)

    return {"value": per_member, "data_available": True}


async def roi_ratio(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
    savings_per_migration: float = 500.0,
    per_member_cost: float = 50.0,
) -> dict:
    """ROI = total cost avoidance / estimated program cost."""
    from app.models.cohort import Cohort

    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    cohorts_result = await db.execute(
        select(Cohort.id, Cohort.sort_order).where(Cohort.program_id == program_id)
    )
    sort_map = {cid: order for cid, order in cohorts_result.all()}

    migrations = await db.execute(
        select(CohortAssignment.cohort_id, CohortAssignment.previous_cohort_id).where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.program_id == program_id,
            CohortAssignment.previous_cohort_id.isnot(None),
        )
    )

    improvement_count = 0
    for to_cohort, from_cohort in migrations.all():
        from_order = sort_map.get(from_cohort)
        to_order = sort_map.get(to_cohort)
        if from_order is not None and to_order is not None and to_order < from_order:
            improvement_count += 1

    total_avoidance = improvement_count * savings_per_migration
    program_cost = len(patient_ids) * per_member_cost

    if program_cost == 0:
        return {"value": None, "data_available": False}

    return {"value": round(total_avoidance / program_cost, 2), "data_available": True}


async def er_avoidance_rate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> dict:
    """% reduction in ER-related diagnoses comparing first vs latest quarter."""
    from app.models.patient import PatientDiagnosis
    from datetime import timedelta

    patient_ids = await _get_active_patient_ids(db, tenant_id, program_id, cohort_id)
    if not patient_ids:
        return {"value": None, "data_available": False}

    er_codes = [PatientDiagnosis.icd10_code.like(c) for c in ("I50%", "E11.10", "E10.10", "N17%")]

    result = await db.execute(
        select(PatientDiagnosis.diagnosed_at).where(
            PatientDiagnosis.patient_id.in_(patient_ids),
            or_(*er_codes),
            PatientDiagnosis.diagnosed_at.isnot(None),
        ).order_by(PatientDiagnosis.diagnosed_at)
    )
    dates = [row[0] for row in result.all()]

    if len(dates) < 2:
        return {"value": None, "data_available": False}

    span = (dates[-1] - dates[0]).days
    if span < 180:
        return {"value": None, "data_available": False}

    quarter_days = 90
    first_cutoff = dates[0] + timedelta(days=quarter_days)
    last_start = dates[-1] - timedelta(days=quarter_days)

    first_q = sum(1 for d in dates if d <= first_cutoff)
    last_q = sum(1 for d in dates if d >= last_start)

    if first_q == 0:
        return {"value": None, "data_available": False}

    reduction = round((first_q - last_q) / first_q * 100, 1)
    return {"value": reduction, "data_available": True}


# ── Aggregation ──────────────────────────────────────────────────────────

METRIC_REGISTRY: dict[str, dict] = {
    "hba1c_control_rate": {"fn": hba1c_control_rate, "category": "clinical", "label": "HbA1c Control Rate (<7%)", "unit": "percent", "target": 60.0},
    "hba1c_improvement_rate": {"fn": hba1c_improvement_rate, "category": "clinical", "label": "HbA1c Improvement Rate", "unit": "percent", "target": 50.0},
    "hospitalisation_rate": {"fn": hospitalisation_rate, "category": "clinical", "label": "Hospitalisation Rate", "unit": "per_1k_mm", "target": 5.0},
    "care_gap_closure_rate": {"fn": care_gap_closure_rate, "category": "clinical", "label": "Care Gap Closure Rate", "unit": "percent", "target": 80.0},
    "avg_pdc": {"fn": avg_pdc, "category": "clinical", "label": "Average PDC", "unit": "percent", "target": 85.0},
    "pdc_above_80_rate": {"fn": pdc_above_80_rate, "category": "clinical", "label": "PDC ≥80% Adherence", "unit": "percent", "target": 75.0},
    "hedis_hba1c_testing": {"fn": hedis_hba1c_testing, "category": "hedis", "label": "HbA1c Testing Rate", "unit": "percent", "target": 90.0},
    "hedis_eye_exam": {"fn": hedis_eye_exam, "category": "hedis", "label": "Diabetic Eye Exam", "unit": "percent", "target": 70.0},
    "hedis_nephropathy": {"fn": hedis_nephropathy, "category": "hedis", "label": "Nephropathy Screening", "unit": "percent", "target": 80.0},
    "hedis_bp_control": {"fn": hedis_bp_control, "category": "hedis", "label": "BP Control (<140 mmHg)", "unit": "percent", "target": 65.0},
    "enrollment_rate": {"fn": enrollment_rate, "category": "engagement", "label": "Enrollment Rate", "unit": "percent", "target": 90.0},
    "touchpoint_completion_rate": {"fn": touchpoint_completion_rate, "category": "engagement", "label": "Touchpoint Completion", "unit": "percent", "target": 80.0},
    "avg_response_time": {"fn": avg_response_time, "category": "engagement", "label": "Avg Response Time", "unit": "hours", "target": 24.0},
    "active_sequence_rate": {"fn": active_sequence_rate, "category": "engagement", "label": "Active Sequence Rate", "unit": "percent", "target": 70.0},
    "cost_avoidance_per_member": {"fn": cost_avoidance_per_member, "category": "financial", "label": "Cost Avoidance / Member", "unit": "currency", "target": None},
    "roi_ratio": {"fn": roi_ratio, "category": "financial", "label": "ROI Ratio", "unit": "ratio", "target": 2.0},
    "er_avoidance_rate": {"fn": er_avoidance_rate, "category": "financial", "label": "ER Avoidance Rate", "unit": "percent", "target": 20.0},
}


async def compute_category(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    category: str,
    cohort_id: uuid.UUID | None = None,
    period_start: date | None = None,
    period_end: date | None = None,
) -> list[dict]:
    """Compute all metrics in a category. Returns list of MetricValue-shaped dicts."""
    results = []
    for key, meta in METRIC_REGISTRY.items():
        if meta["category"] != category:
            continue
        computed = await meta["fn"](db, tenant_id, program_id, cohort_id, period_start, period_end)
        results.append({
            "metric_key": key,
            "category": meta["category"],
            "label": meta["label"],
            "value": computed["value"],
            "unit": meta["unit"],
            "data_available": computed["data_available"],
            "baseline_value": None,
            "target_value": meta.get("target"),
        })
    return results
