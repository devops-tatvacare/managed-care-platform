"""Action generation engine — evaluates templates against patient data."""

from __future__ import annotations

import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.action import ActionTemplate, PatientAction
from app.models.patient import Patient


async def generate_patient_actions(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient_id: uuid.UUID,
    program_id: uuid.UUID,
) -> list[dict]:
    """Generate actions for a patient based on active templates. Returns dicts (not yet persisted)."""
    patient = (await db.execute(
        select(Patient).where(Patient.id == patient_id)
    )).scalar_one_or_none()
    if not patient:
        return []

    templates = (await db.execute(
        select(ActionTemplate).where(
            ActionTemplate.program_id == program_id,
            ActionTemplate.tenant_id == tenant_id,
            ActionTemplate.is_active == True,  # noqa: E712
        )
    )).scalars().all()

    care_gaps = patient.care_gaps or []
    risk_score = patient.risk_score or 0
    patient_name = f"{patient.first_name} {patient.last_name}"

    actions = []
    for tmpl in templates:
        if not _should_trigger(tmpl, care_gaps, risk_score):
            continue

        # Check for existing open action with same template
        existing = (await db.execute(
            select(func.count()).where(
                PatientAction.patient_id == patient_id,
                PatientAction.template_id == tmpl.id,
                PatientAction.status.in_(["open", "in_progress"]),
            )
        )).scalar_one()
        if existing > 0:
            continue

        title = tmpl.title_template.replace("{patient_name}", patient_name)
        description = (tmpl.description_template or "").replace("{patient_name}", patient_name)
        for gap in care_gaps:
            title = title.replace("{gap_type}", gap)
            description = description.replace("{gap_type}", gap)

        priority = int(tmpl.priority_base + (risk_score * tmpl.score_weight))

        actions.append({
            "tenant_id": tenant_id,
            "patient_id": patient_id,
            "template_id": tmpl.id,
            "program_id": program_id,
            "priority": min(priority, 100),
            "title": title,
            "description": description or None,
            "status": "open",
            "assigned_to": patient.assigned_to,
            "trigger_data": {"care_gaps": care_gaps, "risk_score": risk_score},
            "resolution_options": tmpl.resolution_options or [],
        })

    return actions


def _should_trigger(tmpl: ActionTemplate, care_gaps: list[str], risk_score: float) -> bool:
    trigger_type = tmpl.trigger_type
    config = tmpl.trigger_config or {}

    if trigger_type == "care_gap":
        gap_type = config.get("gap_type", "")
        if gap_type:
            return any(gap_type.lower() in g.lower() for g in care_gaps)
        return len(care_gaps) > 0

    if trigger_type == "score_threshold":
        threshold = config.get("threshold", 0)
        return risk_score >= threshold

    if trigger_type == "lab_overdue":
        gap_type = config.get("gap_type", "")
        return any(gap_type.lower() in g.lower() for g in care_gaps)

    return False


async def persist_actions(db: AsyncSession, action_dicts: list[dict]) -> list[PatientAction]:
    actions = []
    for d in action_dicts:
        action = PatientAction(**d)
        db.add(action)
        actions.append(action)
    await db.flush()
    return actions
