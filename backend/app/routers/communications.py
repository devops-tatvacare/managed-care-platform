"""Communications router — threads, orchestration, templates, manual send."""

from __future__ import annotations

import math
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.models.communication import ConciergeAction
from app.schemas.communication import (
    MessageTemplateCreate,
    MessageTemplateListResponse,
    MessageTemplateRead,
    MessageTemplateUpdate,
    OrchestrationResponse,
    OrchestrationStats,
    SendActionRequest,
    ThreadDetail,
    ThreadListResponse,
    ThreadSummary,
)
from app.services import orchestration_service, template_service, thread_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Threads
# ---------------------------------------------------------------------------


@router.get("/threads", response_model=ThreadListResponse)
async def threads_list(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    channel: str | None = None,
):
    items, total = await thread_service.get_threads(
        db, auth.tenant_id, page=page, page_size=page_size, channel=channel,
    )
    return ThreadListResponse(
        items=[ThreadSummary(**i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/threads/{patient_id}", response_model=ThreadDetail)
async def thread_detail(
    patient_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await thread_service.get_thread_detail(db, auth.tenant_id, patient_id)
    return ThreadDetail(**result)


# ---------------------------------------------------------------------------
# Manual send
# ---------------------------------------------------------------------------


@router.post("/send", status_code=status.HTTP_201_CREATED)
async def send_action(
    body: SendActionRequest,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    action = ConciergeAction(
        tenant_id=auth.tenant_id,
        patient_id=uuid.UUID(body.patient_id),
        triggered_by="manual",
        channel=body.channel,
        action_type=body.action_type,
        status="pending",
        template_id=uuid.UUID(body.template_id) if body.template_id else None,
        payload=body.payload,
    )
    db.add(action)
    await db.commit()
    await db.refresh(action)
    return {"id": str(action.id), "status": action.status}


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


@router.get("/orchestration", response_model=OrchestrationResponse)
async def orchestration_table(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    program_id: uuid.UUID | None = None,
    cohort_id: uuid.UUID | None = None,
    channel: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
):
    items, total, stats = await orchestration_service.get_orchestration_rows(
        db, auth.tenant_id,
        page=page, page_size=page_size,
        program_id=program_id, cohort_id=cohort_id,
        channel=channel, status=status_filter,
    )
    return OrchestrationResponse(
        items=items,
        stats=OrchestrationStats(**stats),
        total=total,
        page=page,
        page_size=page_size,
        pages=math.ceil(total / page_size) if total > 0 else 0,
    )


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------


@router.get("/templates", response_model=MessageTemplateListResponse)
async def templates_list(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    category: str | None = None,
    channel: str | None = None,
    language: str | None = None,
):
    templates = await template_service.list_templates(
        db, auth.tenant_id, category=category, channel=channel, language=language,
    )
    items = [
        MessageTemplateRead(
            id=str(t.id),
            name=t.name,
            slug=t.slug,
            category=t.category,
            channel=t.channel,
            language=t.language,
            content=t.content,
            variable_map=t.variable_map,
            cohort_applicability=[str(c) for c in t.cohort_applicability] if t.cohort_applicability else None,
            is_active=t.is_active,
            created_at=t.created_at.isoformat(),
            updated_at=t.updated_at.isoformat(),
        )
        for t in templates
    ]
    return MessageTemplateListResponse(items=items, total=len(items))


@router.post("/templates", status_code=status.HTTP_201_CREATED, response_model=MessageTemplateRead)
async def create_template(
    body: MessageTemplateCreate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    t = await template_service.create_template(db, auth.tenant_id, body.model_dump())
    return MessageTemplateRead(
        id=str(t.id),
        name=t.name,
        slug=t.slug,
        category=t.category,
        channel=t.channel,
        language=t.language,
        content=t.content,
        variable_map=t.variable_map,
        cohort_applicability=[str(c) for c in t.cohort_applicability] if t.cohort_applicability else None,
        is_active=t.is_active,
        created_at=t.created_at.isoformat(),
        updated_at=t.updated_at.isoformat(),
    )


@router.patch("/templates/{template_id}", response_model=MessageTemplateRead)
async def update_template(
    template_id: uuid.UUID,
    body: MessageTemplateUpdate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    t = await template_service.update_template(
        db, auth.tenant_id, template_id, body.model_dump(exclude_unset=True),
    )
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return MessageTemplateRead(
        id=str(t.id),
        name=t.name,
        slug=t.slug,
        category=t.category,
        channel=t.channel,
        language=t.language,
        content=t.content,
        variable_map=t.variable_map,
        cohort_applicability=[str(c) for c in t.cohort_applicability] if t.cohort_applicability else None,
        is_active=t.is_active,
        created_at=t.created_at.isoformat(),
        updated_at=t.updated_at.isoformat(),
    )
