"""Cohort CRUD, assignment queries, and distribution stats."""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cohort import (
    Cohort, CohortAssignment, CohortCriteria, CohortisationEvent, ScoringEngine,
)
from app.models.patient import Patient


# ── Cohort CRUD ────────────────────────────────────────────────────────────

async def list_cohorts(
    db: AsyncSession, tenant_id: uuid.UUID, program_id: uuid.UUID,
) -> list[Cohort]:
    result = await db.execute(
        select(Cohort)
        .where(Cohort.tenant_id == tenant_id, Cohort.program_id == program_id)
        .options(selectinload(Cohort.criteria))
        .order_by(Cohort.sort_order)
    )
    return list(result.scalars().all())


async def get_cohort(
    db: AsyncSession, tenant_id: uuid.UUID, cohort_id: uuid.UUID,
) -> Cohort | None:
    result = await db.execute(
        select(Cohort)
        .where(Cohort.id == cohort_id, Cohort.tenant_id == tenant_id)
        .options(selectinload(Cohort.criteria))
    )
    return result.scalar_one_or_none()


async def create_cohort(
    db: AsyncSession, tenant_id: uuid.UUID, program_id: uuid.UUID, data: dict,
) -> Cohort:
    cohort = Cohort(
        tenant_id=tenant_id,
        program_id=program_id,
        name=data["name"],
        slug=data.get("slug") or data["name"].lower().replace(" ", "-"),
        description=data.get("description"),
        color=data.get("color", "#e2e8f0"),
        sort_order=data.get("sort_order", 0),
        review_cadence_days=data.get("review_cadence_days", 90),
        score_range_min=data.get("score_range_min"),
        score_range_max=data.get("score_range_max"),
        pathway_id=uuid.UUID(data["pathway_id"]) if data.get("pathway_id") else None,
    )
    db.add(cohort)
    await db.commit()
    await db.refresh(cohort)
    return cohort


async def update_cohort(
    db: AsyncSession, tenant_id: uuid.UUID, cohort_id: uuid.UUID, data: dict,
) -> Cohort | None:
    cohort = await get_cohort(db, tenant_id, cohort_id)
    if not cohort:
        return None
    for key in ("name", "slug", "description", "color", "sort_order",
                "review_cadence_days", "score_range_min", "score_range_max"):
        if key in data:
            setattr(cohort, key, data[key])
    if "pathway_id" in data:
        cohort.pathway_id = uuid.UUID(data["pathway_id"]) if data["pathway_id"] else None
    await db.commit()
    await db.refresh(cohort)
    return cohort


async def delete_cohort(
    db: AsyncSession, tenant_id: uuid.UUID, cohort_id: uuid.UUID,
) -> bool:
    cohort = await get_cohort(db, tenant_id, cohort_id)
    if not cohort:
        return False
    await db.delete(cohort)
    await db.commit()
    return True


# ── Criteria ───────────────────────────────────────────────────────────────

async def replace_criteria(
    db: AsyncSession, tenant_id: uuid.UUID, cohort_id: uuid.UUID, criteria_tree: list[dict],
) -> list[CohortCriteria]:
    """Atomically replace a cohort's criteria tree."""
    cohort = await get_cohort(db, tenant_id, cohort_id)
    if not cohort:
        return []

    # Delete existing
    for c in list(cohort.criteria):
        await db.delete(c)
    await db.flush()

    # Insert new tree
    created = _build_criteria_tree(cohort_id, criteria_tree, parent_id=None)
    for c in created:
        db.add(c)

    await db.commit()
    return created


def _build_criteria_tree(
    cohort_id: uuid.UUID, nodes: list[dict], parent_id: uuid.UUID | None,
) -> list[CohortCriteria]:
    """Recursively build CohortCriteria objects from a nested dict structure."""
    result = []
    for i, node in enumerate(nodes):
        criteria = CohortCriteria(
            cohort_id=cohort_id,
            parent_group_id=parent_id,
            group_operator=node.get("group_operator"),
            rule_type=node.get("rule_type"),
            config=node.get("config"),
            sort_order=i,
        )
        result.append(criteria)
        # Recurse into children
        children_data = node.get("children", [])
        if children_data:
            children = _build_criteria_tree(cohort_id, children_data, criteria.id)
            result.extend(children)
    return result


# ── Scoring Engine CRUD ────────────────────────────────────────────────────

async def get_scoring_engine(
    db: AsyncSession, tenant_id: uuid.UUID, program_id: uuid.UUID,
) -> ScoringEngine | None:
    result = await db.execute(
        select(ScoringEngine).where(
            ScoringEngine.tenant_id == tenant_id,
            ScoringEngine.program_id == program_id,
        )
    )
    return result.scalar_one_or_none()


async def upsert_scoring_engine(
    db: AsyncSession, tenant_id: uuid.UUID, program_id: uuid.UUID, data: dict,
) -> ScoringEngine:
    engine = await get_scoring_engine(db, tenant_id, program_id)
    if engine:
        for key in ("components", "tiebreaker_rules", "aggregation_method"):
            if key in data:
                setattr(engine, key, data[key])
    else:
        engine = ScoringEngine(
            tenant_id=tenant_id,
            program_id=program_id,
            components=data.get("components", []),
            tiebreaker_rules=data.get("tiebreaker_rules", []),
            aggregation_method=data.get("aggregation_method", "weighted_sum"),
        )
        db.add(engine)
    await db.commit()
    await db.refresh(engine)
    return engine


# ── Assignments ────────────────────────────────────────────────────────────

async def get_assignments(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
    program_id: uuid.UUID | None = None,
    cohort_id: uuid.UUID | None = None,
    min_score: int | None = None,
) -> dict:
    base = select(CohortAssignment).where(
        CohortAssignment.tenant_id == tenant_id,
        CohortAssignment.is_current == True,
    )
    if program_id:
        base = base.where(CohortAssignment.program_id == program_id)
    if cohort_id:
        base = base.where(CohortAssignment.cohort_id == cohort_id)
    if min_score is not None:
        base = base.where(CohortAssignment.score >= min_score)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()

    result = await db.execute(
        base.options(
            selectinload(CohortAssignment.patient),
            selectinload(CohortAssignment.cohort),
        )
        .order_by(CohortAssignment.score.desc().nullslast())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(result.scalars().all())

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if page_size else 0,
    }


async def get_dashboard_stats(db: AsyncSession, tenant_id: uuid.UUID) -> dict:
    """Cross-program population dashboard stats."""
    # Total active patients
    total_patients = (await db.execute(
        select(func.count()).where(Patient.tenant_id == tenant_id, Patient.is_active == True)
    )).scalar_one()

    # Assigned (have current assignment)
    assigned = (await db.execute(
        select(func.count(func.distinct(CohortAssignment.patient_id))).where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.is_current == True,
        )
    )).scalar_one()

    # Pending events
    pending_events = (await db.execute(
        select(func.count()).where(
            CohortisationEvent.tenant_id == tenant_id,
            CohortisationEvent.status == "pending",
        )
    )).scalar_one()

    return {
        "total_patients": total_patients,
        "assigned": assigned,
        "unassigned": total_patients - assigned,
        "pending_rescore": pending_events,
    }


async def get_cohort_distribution(
    db: AsyncSession, tenant_id: uuid.UUID, program_id: uuid.UUID,
) -> list[dict]:
    """Member count per cohort within a program."""
    result = await db.execute(
        select(CohortAssignment.cohort_id, func.count().label("count"))
        .where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.program_id == program_id,
            CohortAssignment.is_current == True,
        )
        .group_by(CohortAssignment.cohort_id)
    )
    return [{"cohort_id": str(row.cohort_id), "count": row.count} for row in result.all()]
