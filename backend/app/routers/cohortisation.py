"""Cohortisation router — stub awaiting new generic cohort implementation.

Old CRS endpoints removed. New Program/Cohort/Cohortisation endpoints
will be implemented in subsequent tasks.
"""

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.schemas.cohort import (
    AssignmentListResponse,
    RecalculateRequest,
    RecalculateResponse,
    TierDistributionResponse,
)
from app.services.cohort_service import (
    bulk_recalculate,
    get_assignments,
    get_tier_distribution,
)

router = APIRouter()


@router.post("/recalculate", response_model=RecalculateResponse)
async def recalculate(
    data: RecalculateRequest | None = None,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    patient_ids = None
    if data and data.patient_ids:
        patient_ids = [uuid.UUID(pid) for pid in data.patient_ids]

    result = await bulk_recalculate(
        db, auth.tenant_id, assigned_by=auth.user_id, patient_ids=patient_ids
    )
    return RecalculateResponse(
        processed=result["processed"], tier_changes=result["tier_changes"]
    )


@router.get("/assignments", response_model=AssignmentListResponse)
async def assignments_list(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    result = await get_assignments(db, auth.tenant_id, page, page_size)
    return AssignmentListResponse(
        items=[],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        pages=result["pages"],
    )


@router.get("/distribution", response_model=TierDistributionResponse)
async def distribution(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    rows = await get_tier_distribution(db, auth.tenant_id)
    return TierDistributionResponse(distribution=[], total=0)
