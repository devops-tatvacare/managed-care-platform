"""Command Center API endpoints."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
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

logger = logging.getLogger(__name__)

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


@router.post("/insights/stream")
async def population_insights_stream(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    """Stream population insights as SSE events."""
    from app.llm import get_provider
    from app.llm.prompts import PROMPT_REGISTRY
    from app.services.command_center_service import _build_static_insights

    kpis_data = await get_kpis(db, auth.tenant_id)

    async def event_stream():
        try:
            provider = get_provider()
            template = PROMPT_REGISTRY["population_insights"]
            system_prompt, user_prompt = template.render(
                total_members=kpis_data["total_members"],
                avg_risk_score=kpis_data["avg_risk_score"],
                hba1c_control_rate=kpis_data["hba1c_control_rate"],
                open_care_gaps=kpis_data["open_care_gaps"],
                pdc_above_80_rate=kpis_data["pdc_above_80_rate"],
            )

            async for chunk in provider.generate_stream(
                user_prompt, system=system_prompt, max_tokens=4096,
            ):
                yield f"data: {json.dumps({'text': chunk})}\n\n"

            yield f"data: {json.dumps({'done': True, 'generated_at': datetime.now(timezone.utc).isoformat()})}\n\n"
        except Exception as exc:
            logger.warning("Insights stream failed, falling back to static: %s", exc)
            fallback = _build_static_insights(kpis_data)
            yield f"data: {json.dumps({'text': fallback})}\n\n"
            yield f"data: {json.dumps({'done': True, 'generated_at': datetime.now(timezone.utc).isoformat()})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/upcoming-reviews", response_model=UpcomingReviewsResponse)
async def upcoming_reviews(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    data = await get_upcoming_reviews(db, auth.tenant_id, limit=limit)
    return UpcomingReviewsResponse(**data)
