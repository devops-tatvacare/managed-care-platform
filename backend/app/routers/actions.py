"""Action queue API endpoints."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.models.action import PatientAction
from app.schemas.action import ActionQueueResponse, PatientActionRead, PatientActionUpdate

router = APIRouter()


def _serialize_action(a: PatientAction) -> dict:
    return {
        "id": str(a.id),
        "patient_id": str(a.patient_id),
        "patient_name": f"{a.patient.first_name} {a.patient.last_name}" if a.patient else "Unknown",
        "template_id": str(a.template_id),
        "program_id": str(a.program_id),
        "cohort_id": str(a.cohort_id) if a.cohort_id else None,
        "cohort_name": None,
        "priority": a.priority,
        "title": a.title,
        "description": a.description,
        "status": a.status,
        "assigned_to": a.assigned_to,
        "resolution_options": a.resolution_options or [],
        "trigger_data": a.trigger_data,
        "created_at": a.created_at.isoformat() if a.created_at else "",
    }


@router.get("", response_model=ActionQueueResponse)
async def list_actions(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    status: str = Query("open"),
    limit: int = Query(20, le=100),
):
    stmt = (
        select(PatientAction)
        .where(PatientAction.tenant_id == auth.tenant_id, PatientAction.status == status)
        .order_by(PatientAction.priority.desc())
        .limit(limit)
    )
    actions = (await db.execute(stmt)).scalars().all()
    total = (await db.execute(
        select(func.count()).where(PatientAction.tenant_id == auth.tenant_id, PatientAction.status == status)
    )).scalar_one()

    return ActionQueueResponse(
        items=[PatientActionRead(**_serialize_action(a)) for a in actions],
        total=total,
    )


@router.patch("/{action_id}")
async def update_action(
    action_id: uuid.UUID,
    body: PatientActionUpdate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    action = (await db.execute(
        select(PatientAction).where(PatientAction.id == action_id, PatientAction.tenant_id == auth.tenant_id)
    )).scalar_one_or_none()

    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    if body.status:
        action.status = body.status
        if body.status in ("resolved", "dismissed"):
            action.resolved_at = datetime.now(timezone.utc)
            action.resolved_by = auth.user_id
    if body.resolution_type:
        action.resolution_type = body.resolution_type
    if body.resolution_note:
        action.resolution_note = body.resolution_note

    await db.commit()
    return _serialize_action(action)
