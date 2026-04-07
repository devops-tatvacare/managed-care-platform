"""Cohort Assignment Service.

Orchestrates CRS calculation, tier assignment, and audit logging.
Handles single-patient and bulk recalculation using async SQLAlchemy.
"""

import math
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cohort import CohortAssignment, CRSConfig
from app.models.patient import Patient, PatientDiagnosis, PatientLab
from app.services.crs_engine import (
    apply_tiebreakers,
    calculate_crs,
    get_review_cadence_days,
    map_score_to_tier,
)


# ── CRS Config ──────────────────────────────────────────────────────────


async def get_crs_config(db: AsyncSession, tenant_id: uuid.UUID) -> CRSConfig | None:
    """Get the active CRS config for a tenant."""
    stmt = select(CRSConfig).where(
        CRSConfig.tenant_id == tenant_id,
        CRSConfig.is_active == True,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def update_crs_config(
    db: AsyncSession, tenant_id: uuid.UUID, data: dict
) -> CRSConfig | None:
    """Update the CRS config. Only update fields present in data."""
    config = await get_crs_config(db, tenant_id)
    if not config:
        return None

    for key in ("components", "tier_thresholds", "tiebreaker_rules"):
        if key in data:
            setattr(config, key, data[key])

    await db.commit()
    await db.refresh(config)
    return config


# ── Single Patient Calculation ──────────────────────────────────────────


async def calculate_patient_crs(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient_id: uuid.UUID,
    assigned_by: uuid.UUID | None = None,
    assignment_type: str = "auto",
) -> CohortAssignment | None:
    """Calculate CRS for a single patient and create an assignment record."""
    # 1. Load CRS config
    config = await get_crs_config(db, tenant_id)
    if not config:
        return None

    # 2. Load patient with labs and diagnoses
    stmt = (
        select(Patient)
        .where(Patient.id == patient_id, Patient.tenant_id == tenant_id)
        .options(selectinload(Patient.labs), selectinload(Patient.diagnoses))
    )
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()
    if not patient:
        return None

    return await _score_and_assign(
        db, config, patient, assigned_by, assignment_type
    )


# ── Bulk Recalculation ──────────────────────────────────────────────────


async def bulk_recalculate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    assigned_by: uuid.UUID | None = None,
    patient_ids: list[uuid.UUID] | None = None,
) -> dict:
    """Recalculate CRS for all (or filtered) active patients."""
    config = await get_crs_config(db, tenant_id)
    if not config:
        return {"processed": 0, "tier_changes": 0}

    stmt = (
        select(Patient)
        .where(Patient.tenant_id == tenant_id, Patient.is_active == True)
        .options(selectinload(Patient.labs), selectinload(Patient.diagnoses))
    )
    if patient_ids:
        stmt = stmt.where(Patient.id.in_(patient_ids))

    result = await db.execute(stmt)
    patients = list(result.scalars().all())

    processed = 0
    tier_changes = 0

    for patient in patients:
        previous_tier = patient.tier
        assignment = await _score_and_assign(
            db, config, patient, assigned_by, "auto"
        )
        if assignment and assignment.tier_number != previous_tier:
            tier_changes += 1
        processed += 1

    return {"processed": processed, "tier_changes": tier_changes}


# ── Queries ─────────────────────────────────────────────────────────────


async def get_assignments(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
    current_only: bool = True,
) -> dict:
    """Paginated query of CohortAssignment records."""
    base = select(CohortAssignment).where(CohortAssignment.tenant_id == tenant_id)
    if current_only:
        base = base.where(CohortAssignment.is_current == True)

    # Total count
    count_stmt = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Paginated items
    stmt = (
        base.options(selectinload(CohortAssignment.patient))
        .order_by(CohortAssignment.assigned_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    items = list(result.scalars().all())

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if page_size else 0,
    }


async def get_tier_distribution(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[dict]:
    """GROUP BY Patient.tier, COUNT patients, ordered by tier."""
    stmt = (
        select(Patient.tier, func.count().label("count"))
        .where(Patient.tenant_id == tenant_id, Patient.is_active == True)
        .group_by(Patient.tier)
        .order_by(Patient.tier)
    )
    result = await db.execute(stmt)
    return [{"tier": row.tier, "count": row.count} for row in result.all()]


# ── Internal ────────────────────────────────────────────────────────────


async def _score_and_assign(
    db: AsyncSession,
    config: CRSConfig,
    patient: Patient,
    assigned_by: uuid.UUID | None,
    assignment_type: str,
) -> CohortAssignment:
    """Run CRS scoring pipeline and persist the assignment."""
    labs: list[PatientLab] = list(patient.labs)
    diagnoses: list[PatientDiagnosis] = list(patient.diagnoses)

    # 3. Calculate CRS
    crs_result = calculate_crs(patient, labs, diagnoses, config.components)
    crs_score = crs_result["total"]

    # 4. Map score to tier
    tier_number = map_score_to_tier(crs_score, config.tier_thresholds)

    # 5. Apply tiebreakers
    final_tier, reason = apply_tiebreakers(
        crs_score, tier_number, patient, labs, diagnoses, config.tiebreaker_rules
    )

    previous_tier = patient.tier

    # 6. Mark old assignments as not current
    await db.execute(
        update(CohortAssignment)
        .where(
            CohortAssignment.patient_id == patient.id,
            CohortAssignment.is_current == True,
        )
        .values(is_current=False)
    )

    # 7. Create new assignment
    now = datetime.now(timezone.utc)
    cadence_days = get_review_cadence_days(final_tier)
    assignment = CohortAssignment(
        tenant_id=patient.tenant_id,
        patient_id=patient.id,
        tier_number=final_tier,
        crs_score=crs_score,
        crs_breakdown=crs_result["components"],
        assignment_type=assignment_type,
        assigned_by=assigned_by,
        reason=reason,
        previous_tier=previous_tier,
        is_current=True,
        assigned_at=now,
        review_due_at=now + timedelta(days=cadence_days),
    )
    db.add(assignment)

    # 8. Update patient denormalised fields
    patient.tier = final_tier
    patient.crs_score = crs_score
    patient.crs_breakdown = crs_result["components"]

    await db.commit()
    await db.refresh(assignment)
    return assignment
