"""Command Center API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.schemas.command_center import (
    ActionQueueResponse,
    AIInsightsResponse,
    CommandCenterKPIs,
    UpcomingReviewsResponse,
)
from app.services.command_center_service import (
    get_action_queue,
    get_kpis,
    get_population_insights,
    get_upcoming_reviews,
)

router = APIRouter()


@router.get("/kpis", response_model=CommandCenterKPIs)
async def kpis(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    data = await get_kpis(db, auth.tenant_id)
    return CommandCenterKPIs(**data)


@router.get("/action-queue", response_model=ActionQueueResponse)
async def action_queue(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    data = await get_action_queue(db, auth.tenant_id, limit=limit)
    return ActionQueueResponse(**data)


@router.post("/insights", response_model=AIInsightsResponse)
async def population_insights(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    data = await get_population_insights(db, auth.tenant_id)
    return AIInsightsResponse(**data)


@router.get("/upcoming-reviews", response_model=UpcomingReviewsResponse)
async def upcoming_reviews(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    data = await get_upcoming_reviews(db, auth.tenant_id, limit=limit)
    return UpcomingReviewsResponse(**data)
