"""Persist and retrieve metric snapshots for trend analysis."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.outcome_metric import OutcomeMetric
from app.services.outcome_metrics_service import METRIC_REGISTRY


async def take_snapshot(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    program_id: uuid.UUID,
    period_start: date | None = None,
    period_end: date | None = None,
) -> int:
    """Compute all metrics and save to outcome_metrics table. Returns count of metrics saved."""
    if period_start is None:
        period_start = date.today().replace(day=1)
    if period_end is None:
        period_end = date.today()

    count = 0
    for key, meta in METRIC_REGISTRY.items():
        computed = await meta["fn"](db, tenant_id, program_id, None, period_start, period_end)
        if computed["value"] is None:
            continue

        metric = OutcomeMetric(
            tenant_id=tenant_id,
            program_id=program_id,
            cohort_id=None,
            metric_key=key,
            category=meta["category"],
            label=meta["label"],
            value=computed["value"],
            unit=meta["unit"],
            period_start=period_start,
            period_end=period_end,
            baseline_value=None,
            target_value=meta.get("target"),
        )
        db.add(metric)
        count += 1

    await db.commit()
    return count


async def get_metric_history(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    metric_key: str,
    program_id: uuid.UUID,
    cohort_id: uuid.UUID | None = None,
) -> dict:
    """Return historical snapshots for a single metric."""
    conditions = [
        OutcomeMetric.tenant_id == tenant_id,
        OutcomeMetric.metric_key == metric_key,
        OutcomeMetric.program_id == program_id,
    ]
    if cohort_id is not None:
        conditions.append(OutcomeMetric.cohort_id == cohort_id)
    else:
        conditions.append(OutcomeMetric.cohort_id.is_(None))

    result = await db.execute(
        select(OutcomeMetric)
        .where(*conditions)
        .order_by(OutcomeMetric.period_start.asc())
    )
    snapshots = result.scalars().all()

    points = [
        {
            "value": s.value,
            "period_start": s.period_start.isoformat(),
            "period_end": s.period_end.isoformat(),
            "baseline_value": s.baseline_value,
            "target_value": s.target_value,
        }
        for s in snapshots
    ]

    return {"metric_key": metric_key, "points": points}
