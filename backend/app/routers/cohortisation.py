import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.models.cohort import Cohort
from app.models.patient import Patient
from app.schemas.cohort import (
    AssignmentListResponse, AssignmentRecord, DashboardStats,
    RecalculateRequest, RecalculateResponse, CohortDistribution,
)
from app.services.cohort_service import (
    get_assignments, get_dashboard_stats, get_cohort_distribution,
)
from app.services.program_service import list_programs
from app.workers.event_emitter import emit_bulk_events
from app.events import event_bus
from app.events.sse import sse_response

router = APIRouter()


@router.get("/stream")
async def stream(
    auth: AuthContext = Depends(get_auth),
):
    events = event_bus.subscribe(auth.tenant_id, "cohortisation")
    return sse_response(events)


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    stats = await get_dashboard_stats(db, auth.tenant_id)
    programs = await list_programs(db, auth.tenant_id)
    stats["active_programs"] = sum(1 for p in programs if p.status == "active")
    return DashboardStats(**stats)


@router.post("/recalculate", response_model=RecalculateResponse)
async def recalculate(
    data: RecalculateRequest | None = None,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    scope = data.scope if data else "unassigned"

    if data and data.patient_ids:
        patient_ids = [uuid.UUID(pid) for pid in data.patient_ids]
    elif scope == "unassigned":
        from app.models.cohort import CohortAssignment
        assigned_sub = (
            select(CohortAssignment.patient_id)
            .where(CohortAssignment.is_current == True)
            .scalar_subquery()
        )
        result = await db.execute(
            select(Patient.id).where(
                Patient.tenant_id == auth.tenant_id,
                Patient.is_active == True,
                Patient.id.notin_(assigned_sub),
            )
        )
        patient_ids = [row[0] for row in result.all()]
    else:
        result = await db.execute(
            select(Patient.id).where(
                Patient.tenant_id == auth.tenant_id,
                Patient.is_active == True,
            )
        )
        patient_ids = [row[0] for row in result.all()]

    count = await emit_bulk_events(db, auth.tenant_id, patient_ids)
    await db.commit()

    await event_bus.publish(auth.tenant_id, "cohortisation", {
        "type": "batch_started",
        "data": {"total": count, "scope": scope},
    })

    return RecalculateResponse(events_created=count, scope=scope)


@router.get("/assignments", response_model=AssignmentListResponse)
async def assignments_list(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    program_id: uuid.UUID | None = None,
    cohort_id: uuid.UUID | None = None,
    min_score: int | None = None,
):
    result = await get_assignments(
        db, auth.tenant_id, page, page_size, program_id, cohort_id, min_score,
    )

    # Build a map of previous cohort names
    prev_ids = {
        a.previous_cohort_id
        for a in result["items"]
        if a.previous_cohort_id is not None
    }
    prev_cohort_map: dict[uuid.UUID, str] = {}
    if prev_ids:
        rows = await db.execute(
            select(Cohort.id, Cohort.name).where(Cohort.id.in_(prev_ids))
        )
        prev_cohort_map = {row.id: row.name for row in rows.all()}

    items = []
    for a in result["items"]:
        patient_name = ""
        pdc_worst: float | None = None
        if a.patient:
            patient_name = f"{a.patient.first_name} {a.patient.last_name}"
            meds = a.patient.active_medications or []
            pdc_values = [
                m["pdc_90day"] for m in meds
                if isinstance(m, dict) and m.get("pdc_90day") is not None
            ]
            if pdc_values:
                pdc_worst = min(pdc_values)
        cohort_name = a.cohort.name if a.cohort else ""
        cohort_color = a.cohort.color if a.cohort else "#e2e8f0"
        prev_cohort_name = (
            prev_cohort_map.get(a.previous_cohort_id)
            if a.previous_cohort_id else None
        )
        items.append(AssignmentRecord(
            id=str(a.id),
            patient_id=str(a.patient_id),
            patient_name=patient_name,
            program_id=str(a.program_id),
            cohort_id=str(a.cohort_id),
            cohort_name=cohort_name,
            cohort_color=cohort_color,
            score=a.score,
            score_breakdown=a.score_breakdown,
            assignment_type=a.assignment_type,
            reason=a.reason,
            previous_cohort_id=str(a.previous_cohort_id) if a.previous_cohort_id else None,
            previous_cohort_name=prev_cohort_name,
            pdc_worst=pdc_worst,
            assigned_at=a.assigned_at.isoformat() if a.assigned_at else "",
            review_due_at=a.review_due_at.isoformat() if a.review_due_at else None,
        ))
    return AssignmentListResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        pages=result["pages"],
    )


@router.get("/distribution/{program_id}", response_model=list[CohortDistribution])
async def distribution(
    program_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    from app.services.cohort_service import list_cohorts
    cohorts = await list_cohorts(db, auth.tenant_id, program_id)
    cohort_map = {str(c.id): c for c in cohorts}

    dist = await get_cohort_distribution(db, auth.tenant_id, program_id)
    result = []
    for d in dist:
        cohort = cohort_map.get(d["cohort_id"])
        result.append(CohortDistribution(
            cohort_id=d["cohort_id"],
            cohort_name=cohort.name if cohort else "Unknown",
            cohort_color=cohort.color if cohort else "#e2e8f0",
            count=d["count"],
        ))
    return result
