"""Thread service — derives conversation threads from concierge_actions."""

from __future__ import annotations

import uuid

from sqlalchemy import case, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.communication import ConciergeAction
from app.models.patient import Patient


async def get_threads(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    *,
    page: int = 1,
    page_size: int = 20,
    channel: str | None = None,
) -> tuple[list[dict], int]:
    """Return paginated thread summaries grouped by patient."""

    base = select(ConciergeAction).where(ConciergeAction.tenant_id == tenant_id)
    if channel:
        base = base.where(ConciergeAction.channel == channel)

    # Subquery: latest action per patient
    latest_sq = (
        select(
            ConciergeAction.patient_id,
            func.max(ConciergeAction.created_at).label("last_at"),
            func.count().label("total_actions"),
            func.sum(
                case(
                    (ConciergeAction.action_type.in_(["wa_delivered", "sms_delivered"]), 1),
                    else_=0,
                )
            ).label("unread_count"),
            func.sum(
                case(
                    (ConciergeAction.triggered_by == "auto", 1),
                    else_=0,
                )
            ).label("auto_count"),
        )
        .where(ConciergeAction.tenant_id == tenant_id)
    )
    if channel:
        latest_sq = latest_sq.where(ConciergeAction.channel == channel)
    latest_sq = latest_sq.group_by(ConciergeAction.patient_id).subquery()

    # Total distinct patients
    count_q = select(func.count()).select_from(latest_sq)
    total = (await db.execute(count_q)).scalar_one()

    if total == 0:
        return [], 0

    # Paginated patient IDs ordered by most recent action
    page_q = (
        select(latest_sq.c.patient_id, latest_sq.c.last_at, latest_sq.c.total_actions, latest_sq.c.unread_count, latest_sq.c.auto_count)
        .order_by(desc(latest_sq.c.last_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(page_q)).all()
    patient_ids = [r.patient_id for r in rows]

    # Fetch patient names
    patients_q = select(Patient).where(Patient.id.in_(patient_ids))
    patient_map = {
        p.id: p for p in (await db.execute(patients_q)).scalars().all()
    }

    # Fetch latest action per patient for channel/type/status
    latest_actions_q = (
        select(ConciergeAction)
        .where(
            ConciergeAction.tenant_id == tenant_id,
            ConciergeAction.patient_id.in_(patient_ids),
        )
        .order_by(ConciergeAction.created_at.desc())
    )
    all_actions = (await db.execute(latest_actions_q)).scalars().all()
    latest_by_patient: dict[uuid.UUID, ConciergeAction] = {}
    for a in all_actions:
        if a.patient_id not in latest_by_patient:
            latest_by_patient[a.patient_id] = a

    items = []
    for r in rows:
        pid = r.patient_id
        patient = patient_map.get(pid)
        latest = latest_by_patient.get(pid)
        items.append({
            "patient_id": str(pid),
            "patient_name": f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
            "channel": latest.channel if latest else "",
            "last_action_type": latest.action_type if latest else "",
            "last_action_status": latest.status if latest else "",
            "last_action_at": latest.created_at.isoformat() if latest else "",
            "last_triggered_by": latest.triggered_by if latest else "manual",
            "unread_count": r.unread_count or 0,
            "total_actions": r.total_actions or 0,
            "auto_count": r.auto_count or 0,
        })

    return items, total


async def get_thread_detail(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient_id: uuid.UUID,
) -> dict:
    """Return all actions for a patient, chronologically."""

    patient = (
        await db.execute(select(Patient).where(Patient.id == patient_id, Patient.tenant_id == tenant_id))
    ).scalar_one_or_none()

    q = (
        select(ConciergeAction)
        .where(
            ConciergeAction.tenant_id == tenant_id,
            ConciergeAction.patient_id == patient_id,
        )
        .order_by(ConciergeAction.created_at.asc())
    )
    actions = (await db.execute(q)).scalars().all()

    return {
        "patient_id": str(patient_id),
        "patient_name": f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
        "actions": [
            {
                "id": str(a.id),
                "patient_id": str(a.patient_id),
                "pathway_block_id": str(a.pathway_block_id) if a.pathway_block_id else None,
                "triggered_by": a.triggered_by,
                "channel": a.channel,
                "action_type": a.action_type,
                "status": a.status,
                "template_id": str(a.template_id) if a.template_id else None,
                "payload": a.payload,
                "response": a.response,
                "error": a.error,
                "created_at": a.created_at.isoformat(),
                "completed_at": a.completed_at.isoformat() if a.completed_at else None,
            }
            for a in actions
        ],
    }
