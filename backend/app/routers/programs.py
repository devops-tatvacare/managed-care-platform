import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.schemas.program import (
    ProgramCreate, ProgramDetail, ProgramListItem, ProgramUpdate,
    ProgramVersionSchema, CohortSummary, ScoringEngineSummary,
)
from app.schemas.cohort import (
    CohortCreate, CohortUpdate, CriteriaNode, ScoringEngineUpsert,
)
from app.services.program_service import (
    create_program, get_program, list_programs, publish_program, update_program,
)
from app.services.cohort_service import (
    create_cohort, delete_cohort, get_cohort, get_scoring_engine,
    list_cohorts, replace_criteria, update_cohort, upsert_scoring_engine,
)

router = APIRouter()


@router.get("", response_model=list[ProgramListItem])
async def programs_list(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    programs = await list_programs(db, auth.tenant_id)
    return [
        ProgramListItem(
            id=str(p.id),
            name=p.name,
            slug=p.slug,
            condition=p.condition,
            status=p.status,
            version=p.version,
            cohort_count=len(p.cohorts) if p.cohorts else 0,
            has_scoring_engine=p.scoring_engine is not None,
        )
        for p in programs
    ]


@router.post("", response_model=ProgramDetail, status_code=status.HTTP_201_CREATED)
async def programs_create(
    data: ProgramCreate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    program = await create_program(db, auth.tenant_id, auth.user_id, data.model_dump())
    return _serialize_program(program)


@router.get("/{program_id}", response_model=ProgramDetail)
async def programs_get(
    program_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    program = await get_program(db, auth.tenant_id, program_id)
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    return _serialize_program(program)


@router.patch("/{program_id}", response_model=ProgramDetail)
async def programs_update(
    program_id: uuid.UUID,
    data: ProgramUpdate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    program = await update_program(db, auth.tenant_id, program_id, data.model_dump(exclude_none=True))
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    return _serialize_program(program)


@router.post("/{program_id}/publish", response_model=ProgramVersionSchema)
async def programs_publish(
    program_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    version = await publish_program(db, auth.tenant_id, program_id, auth.user_id)
    if not version:
        raise HTTPException(status_code=404, detail="Program not found")
    return ProgramVersionSchema(
        id=str(version.id),
        version=version.version,
        published_at=version.published_at.isoformat(),
        snapshot=version.snapshot,
    )


# ── Cohorts (nested under program) ────────────────────────────────────────

@router.get("/{program_id}/cohorts")
async def cohorts_list(
    program_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    cohorts = await list_cohorts(db, auth.tenant_id, program_id)
    return [_serialize_cohort(c) for c in cohorts]


@router.post("/{program_id}/cohorts", status_code=status.HTTP_201_CREATED)
async def cohorts_create(
    program_id: uuid.UUID,
    data: CohortCreate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    cohort = await create_cohort(db, auth.tenant_id, program_id, data.model_dump())
    return _serialize_cohort(cohort)


@router.patch("/{program_id}/cohorts/{cohort_id}")
async def cohorts_update(
    program_id: uuid.UUID,
    cohort_id: uuid.UUID,
    data: CohortUpdate,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    cohort = await update_cohort(db, auth.tenant_id, cohort_id, data.model_dump(exclude_none=True))
    if not cohort:
        raise HTTPException(status_code=404, detail="Cohort not found")
    return _serialize_cohort(cohort)


@router.delete("/{program_id}/cohorts/{cohort_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cohorts_delete(
    program_id: uuid.UUID,
    cohort_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    if not await delete_cohort(db, auth.tenant_id, cohort_id):
        raise HTTPException(status_code=404, detail="Cohort not found")


@router.put("/{program_id}/cohorts/{cohort_id}/criteria")
async def cohorts_criteria_replace(
    program_id: uuid.UUID,
    cohort_id: uuid.UUID,
    data: list[CriteriaNode],
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    criteria = await replace_criteria(
        db, auth.tenant_id, cohort_id,
        [n.model_dump() for n in data],
    )
    return {"count": len(criteria)}


# ── Scoring Engine ─────────────────────────────────────────────────────────

@router.get("/{program_id}/engine")
async def engine_get(
    program_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    engine = await get_scoring_engine(db, auth.tenant_id, program_id)
    if not engine:
        raise HTTPException(status_code=404, detail="No scoring engine for this program")
    return ScoringEngineSummary(
        id=str(engine.id),
        components=engine.components,
        tiebreaker_rules=engine.tiebreaker_rules,
        aggregation_method=engine.aggregation_method,
    )


@router.put("/{program_id}/engine")
async def engine_upsert(
    program_id: uuid.UUID,
    data: ScoringEngineUpsert,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    engine = await upsert_scoring_engine(
        db, auth.tenant_id, program_id, data.model_dump(exclude_none=True),
    )
    return ScoringEngineSummary(
        id=str(engine.id),
        components=engine.components,
        tiebreaker_rules=engine.tiebreaker_rules,
        aggregation_method=engine.aggregation_method,
    )


# ── Helpers ────────────────────────────────────────────────────────────────

def _serialize_program(p) -> ProgramDetail:
    cohorts = [_serialize_cohort(c) for c in (p.cohorts or [])]
    engine = None
    if p.scoring_engine:
        engine = ScoringEngineSummary(
            id=str(p.scoring_engine.id),
            components=p.scoring_engine.components,
            tiebreaker_rules=p.scoring_engine.tiebreaker_rules,
            aggregation_method=p.scoring_engine.aggregation_method,
        )
    return ProgramDetail(
        id=str(p.id),
        name=p.name,
        slug=p.slug,
        condition=p.condition,
        description=p.description,
        status=p.status,
        version=p.version,
        published_at=p.published_at.isoformat() if p.published_at else None,
        cohorts=cohorts,
        scoring_engine=engine,
    )


def _serialize_cohort(c) -> CohortSummary:
    return CohortSummary(
        id=str(c.id),
        name=c.name,
        slug=c.slug,
        color=c.color,
        sort_order=c.sort_order,
        review_cadence_days=c.review_cadence_days,
        score_range_min=c.score_range_min,
        score_range_max=c.score_range_max,
        member_count=c.member_count,
        pathway_id=str(c.pathway_id) if c.pathway_id else None,
        pathway_name=c.pathway.name if c.pathway else None,
    )
