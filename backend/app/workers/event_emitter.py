"""Helper to emit cohortisation events from other services."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cohort import CohortisationEvent


async def emit_event(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient_id: uuid.UUID,
    event_type: str,
    event_data: dict | None = None,
) -> CohortisationEvent:
    """Insert a pending cohortisation event."""
    event = CohortisationEvent(
        tenant_id=tenant_id,
        patient_id=patient_id,
        event_type=event_type,
        event_data=event_data,
        status="pending",
    )
    db.add(event)
    await db.flush()
    return event


async def emit_bulk_events(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient_ids: list[uuid.UUID],
    event_type: str = "bulk_recalculate",
) -> int:
    """Emit one event per patient for bulk recalculation."""
    events = [
        CohortisationEvent(
            tenant_id=tenant_id,
            patient_id=pid,
            event_type=event_type,
            status="pending",
        )
        for pid in patient_ids
    ]
    db.add_all(events)
    await db.flush()
    return len(events)
