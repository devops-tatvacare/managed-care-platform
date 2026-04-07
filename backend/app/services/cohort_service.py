"""Cohort Service — stub awaiting new generic cohort implementation.

The old CRS-based service has been removed. New Program/Cohort CRUD
and cohortisation worker will be implemented in subsequent tasks.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cohort import CohortAssignment


async def get_assignments(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
    current_only: bool = True,
) -> dict:
    return {"items": [], "total": 0, "page": page, "page_size": page_size, "pages": 0}


async def bulk_recalculate(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    assigned_by: uuid.UUID | None = None,
    patient_ids: list[uuid.UUID] | None = None,
) -> dict:
    return {"processed": 0, "tier_changes": 0}


async def get_tier_distribution(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[dict]:
    return []
