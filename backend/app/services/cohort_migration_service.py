"""Cohort migration tracking — built entirely on cohort_assignments table."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cohort import Cohort, CohortAssignment


async def get_migration_summary(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
) -> dict:
    """Matrix of (from_cohort -> to_cohort -> count) using previous_cohort_id."""
    cohorts_result = await db.execute(
        select(Cohort).where(Cohort.program_id == program_id).order_by(Cohort.sort_order)
    )
    cohorts = {c.id: c for c in cohorts_result.scalars().all()}

    q = (
        select(
            CohortAssignment.previous_cohort_id,
            CohortAssignment.cohort_id,
            func.count().label("cnt"),
        )
        .where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.program_id == program_id,
            CohortAssignment.previous_cohort_id.isnot(None),
        )
        .group_by(CohortAssignment.previous_cohort_id, CohortAssignment.cohort_id)
    )
    result = await db.execute(q)

    flows = []
    total = 0
    for from_id, to_id, count in result.all():
        from_c = cohorts.get(from_id)
        to_c = cohorts.get(to_id)
        if from_c and to_c:
            flows.append({
                "from_cohort_id": str(from_id),
                "from_cohort_name": from_c.name,
                "to_cohort_id": str(to_id),
                "to_cohort_name": to_c.name,
                "count": count,
            })
            total += count

    return {"flows": flows, "total_migrations": total}


async def get_migration_history(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """Paginated list of cohort migrations with patient details."""
    cohorts_result = await db.execute(
        select(Cohort).where(Cohort.program_id == program_id)
    )
    cohorts = {c.id: c for c in cohorts_result.scalars().all()}

    count_q = select(func.count()).where(
        CohortAssignment.tenant_id == tenant_id,
        CohortAssignment.program_id == program_id,
        CohortAssignment.previous_cohort_id.isnot(None),
    )
    total = (await db.execute(count_q)).scalar_one()

    q = (
        select(CohortAssignment)
        .where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.program_id == program_id,
            CohortAssignment.previous_cohort_id.isnot(None),
        )
        .options(selectinload(CohortAssignment.patient))
        .order_by(CohortAssignment.assigned_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(q)
    assignments = result.scalars().all()

    items = []
    for a in assignments:
        from_c = cohorts.get(a.previous_cohort_id)
        to_c = cohorts.get(a.cohort_id)
        patient_name = f"{a.patient.first_name} {a.patient.last_name}" if a.patient else "Unknown"

        prev_q = select(CohortAssignment.score).where(
            CohortAssignment.patient_id == a.patient_id,
            CohortAssignment.program_id == program_id,
            CohortAssignment.cohort_id == a.previous_cohort_id,
        ).order_by(CohortAssignment.assigned_at.desc()).limit(1)
        prev_result = await db.execute(prev_q)
        score_before = prev_result.scalar_one_or_none()

        items.append({
            "assignment_id": str(a.id),
            "patient_id": str(a.patient_id),
            "patient_name": patient_name,
            "from_cohort_name": from_c.name if from_c else "Unknown",
            "from_cohort_color": from_c.color if from_c else "#e2e8f0",
            "to_cohort_name": to_c.name if to_c else "Unknown",
            "to_cohort_color": to_c.color if to_c else "#e2e8f0",
            "score_before": score_before,
            "score_after": a.score,
            "assignment_type": a.assignment_type,
            "reason": a.reason,
            "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
        })

    return {"items": items, "total": total, "page": page, "page_size": page_size}


async def get_pending_overrides(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
) -> dict:
    """Manual overrides that haven't been approved yet."""
    cohorts_result = await db.execute(
        select(Cohort).where(Cohort.program_id == program_id)
    )
    cohorts = {c.id: c for c in cohorts_result.scalars().all()}

    q = (
        select(CohortAssignment)
        .where(
            CohortAssignment.tenant_id == tenant_id,
            CohortAssignment.program_id == program_id,
            CohortAssignment.assignment_type == "manual",
            CohortAssignment.approved_at.is_(None),
            CohortAssignment.is_current == True,
        )
        .options(selectinload(CohortAssignment.patient))
        .order_by(CohortAssignment.assigned_at.desc())
    )
    result = await db.execute(q)
    assignments = result.scalars().all()

    items = []
    for a in assignments:
        from_c = cohorts.get(a.previous_cohort_id) if a.previous_cohort_id else None
        to_c = cohorts.get(a.cohort_id)
        patient_name = f"{a.patient.first_name} {a.patient.last_name}" if a.patient else "Unknown"

        items.append({
            "assignment_id": str(a.id),
            "patient_id": str(a.patient_id),
            "patient_name": patient_name,
            "from_cohort_name": from_c.name if from_c else "N/A",
            "from_cohort_color": from_c.color if from_c else "#e2e8f0",
            "to_cohort_name": to_c.name if to_c else "Unknown",
            "to_cohort_color": to_c.color if to_c else "#e2e8f0",
            "score": a.score,
            "reason": a.reason,
            "assigned_by_name": None,
            "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None,
        })

    return {"items": items, "total": len(items)}


async def approve_override(
    db: AsyncSession,
    assignment_id: uuid.UUID,
    reviewer_id: uuid.UUID,
) -> dict:
    """Approve a manual override by setting approved_at."""
    result = await db.execute(
        select(CohortAssignment).where(CohortAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        return {"status": "not_found", "assignment_id": str(assignment_id)}

    assignment.approved_at = datetime.now(timezone.utc)
    assignment.approved_by = reviewer_id
    await db.commit()

    return {"status": "approved", "assignment_id": str(assignment_id)}


async def reject_override(
    db: AsyncSession,
    assignment_id: uuid.UUID,
    reviewer_id: uuid.UUID,
) -> dict:
    """Reject a manual override — mark as not current and restore previous assignment."""
    result = await db.execute(
        select(CohortAssignment).where(CohortAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        return {"status": "not_found", "assignment_id": str(assignment_id)}

    assignment.is_current = False
    assignment.approved_at = datetime.now(timezone.utc)
    assignment.approved_by = reviewer_id
    assignment.reason = (assignment.reason or "") + " [REJECTED]"

    if assignment.previous_cohort_id:
        prev_q = (
            select(CohortAssignment)
            .where(
                CohortAssignment.patient_id == assignment.patient_id,
                CohortAssignment.program_id == assignment.program_id,
                CohortAssignment.cohort_id == assignment.previous_cohort_id,
                CohortAssignment.id != assignment_id,
            )
            .order_by(CohortAssignment.assigned_at.desc())
            .limit(1)
        )
        prev_result = await db.execute(prev_q)
        prev_assignment = prev_result.scalar_one_or_none()
        if prev_assignment:
            prev_assignment.is_current = True

    await db.commit()
    return {"status": "rejected", "assignment_id": str(assignment_id)}
