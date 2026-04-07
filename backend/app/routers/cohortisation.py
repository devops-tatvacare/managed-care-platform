import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.schemas.cohort import (
    AssignmentListResponse,
    AssignmentRecord,
    CRSBreakdownComponent,
    CRSConfigResponse,
    CRSConfigUpdate,
    RecalculateRequest,
    RecalculateResponse,
    TierDistribution,
    TierDistributionResponse,
)
from app.services.cohort_service import (
    bulk_recalculate,
    get_assignments,
    get_crs_config,
    get_tier_distribution,
    update_crs_config,
)

router = APIRouter()


@router.get("/crs-config", response_model=CRSConfigResponse)
async def crs_config_get(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    config = await get_crs_config(db, auth.tenant_id)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="CRS config not found"
        )
    return CRSConfigResponse(
        id=str(config.id),
        components=config.components,
        tier_thresholds=config.tier_thresholds,
        tiebreaker_rules=config.tiebreaker_rules,
    )


@router.put("/crs-config", response_model=CRSConfigResponse)
async def crs_config_update(
    data: CRSConfigUpdate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    config = await update_crs_config(
        db, auth.tenant_id, data.model_dump(exclude_none=True)
    )
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="CRS config not found"
        )
    return CRSConfigResponse(
        id=str(config.id),
        components=config.components,
        tier_thresholds=config.tier_thresholds,
        tiebreaker_rules=config.tiebreaker_rules,
    )


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
    items = []
    for a in result["items"]:
        breakdown = {}
        if a.crs_breakdown:
            for key, val in a.crs_breakdown.items():
                breakdown[key] = CRSBreakdownComponent(
                    raw=val.get("raw", 0),
                    weighted=val.get("weighted", 0.0),
                )
        patient_name = ""
        if a.patient:
            patient_name = f"{a.patient.first_name} {a.patient.last_name}"
        items.append(
            AssignmentRecord(
                id=str(a.id),
                patient_id=str(a.patient_id),
                patient_name=patient_name,
                tier_number=a.tier_number,
                previous_tier=a.previous_tier,
                crs_score=a.crs_score,
                crs_breakdown=breakdown,
                assignment_type=a.assignment_type,
                reason=a.reason,
                assigned_at=a.assigned_at.isoformat() if a.assigned_at else "",
                review_due_at=a.review_due_at.isoformat() if a.review_due_at else None,
            )
        )
    return AssignmentListResponse(
        items=items,
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
    dist = [TierDistribution(tier=r["tier"], count=r["count"]) for r in rows]
    total = sum(r["count"] for r in rows)
    return TierDistributionResponse(distribution=dist, total=total)
