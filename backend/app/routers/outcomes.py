"""Outcomes API endpoints."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.models.program import Program
from app.schemas.outcomes import (
    MetricCategoryResponse,
    MetricHistoryResponse,
    MigrationHistoryResponse,
    MigrationSummaryResponse,
    OverrideActionResponse,
    PendingOverridesResponse,
    QuarterlyInsightResponse,
    SnapshotResponse,
)
from app.services import cohort_migration_service, metric_snapshot_service
from app.services.outcome_metrics_service import compute_category

router = APIRouter()


def _parse_uuid(val: str | None) -> uuid.UUID | None:
    if val is None:
        return None
    return uuid.UUID(val)


def _parse_date(val: str | None) -> date | None:
    if val is None:
        return None
    return date.fromisoformat(val)


@router.get("/clinical", response_model=MetricCategoryResponse)
async def clinical_metrics(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
    cohort_id: str | None = Query(None),
    period_start: str | None = Query(None),
    period_end: str | None = Query(None),
):
    metrics = await compute_category(
        db, auth.tenant_id, uuid.UUID(program_id), "clinical",
        _parse_uuid(cohort_id), _parse_date(period_start), _parse_date(period_end),
    )
    return MetricCategoryResponse(
        metrics=metrics, program_id=program_id, cohort_id=cohort_id,
        period_start=period_start, period_end=period_end,
    )


@router.get("/hedis", response_model=MetricCategoryResponse)
async def hedis_metrics(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
    cohort_id: str | None = Query(None),
    period_start: str | None = Query(None),
    period_end: str | None = Query(None),
):
    metrics = await compute_category(
        db, auth.tenant_id, uuid.UUID(program_id), "hedis",
        _parse_uuid(cohort_id), _parse_date(period_start), _parse_date(period_end),
    )
    return MetricCategoryResponse(
        metrics=metrics, program_id=program_id, cohort_id=cohort_id,
        period_start=period_start, period_end=period_end,
    )


@router.get("/engagement", response_model=MetricCategoryResponse)
async def engagement_metrics(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
    cohort_id: str | None = Query(None),
    period_start: str | None = Query(None),
    period_end: str | None = Query(None),
):
    metrics = await compute_category(
        db, auth.tenant_id, uuid.UUID(program_id), "engagement",
        _parse_uuid(cohort_id), _parse_date(period_start), _parse_date(period_end),
    )
    return MetricCategoryResponse(
        metrics=metrics, program_id=program_id, cohort_id=cohort_id,
        period_start=period_start, period_end=period_end,
    )


@router.get("/financial", response_model=MetricCategoryResponse)
async def financial_metrics(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
    cohort_id: str | None = Query(None),
    period_start: str | None = Query(None),
    period_end: str | None = Query(None),
):
    metrics = await compute_category(
        db, auth.tenant_id, uuid.UUID(program_id), "financial",
        _parse_uuid(cohort_id), _parse_date(period_start), _parse_date(period_end),
    )
    return MetricCategoryResponse(
        metrics=metrics, program_id=program_id, cohort_id=cohort_id,
        period_start=period_start, period_end=period_end,
    )


@router.get("/recohortisation", response_model=PendingOverridesResponse)
async def pending_overrides(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
):
    data = await cohort_migration_service.get_pending_overrides(
        db, auth.tenant_id, uuid.UUID(program_id),
    )
    return PendingOverridesResponse(**data)


@router.post("/recohortisation/{assignment_id}/approve", response_model=OverrideActionResponse)
async def approve_override(
    assignment_id: str,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    data = await cohort_migration_service.approve_override(
        db, uuid.UUID(assignment_id), auth.user_id,
    )
    return OverrideActionResponse(**data)


@router.post("/recohortisation/{assignment_id}/reject", response_model=OverrideActionResponse)
async def reject_override(
    assignment_id: str,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    data = await cohort_migration_service.reject_override(
        db, uuid.UUID(assignment_id), auth.user_id,
    )
    return OverrideActionResponse(**data)


@router.get("/migrations/summary", response_model=MigrationSummaryResponse)
async def migration_summary(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
):
    data = await cohort_migration_service.get_migration_summary(
        db, auth.tenant_id, uuid.UUID(program_id),
    )
    return MigrationSummaryResponse(**data)


@router.get("/migrations/history", response_model=MigrationHistoryResponse)
async def migration_history(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    data = await cohort_migration_service.get_migration_history(
        db, auth.tenant_id, uuid.UUID(program_id), page, page_size,
    )
    return MigrationHistoryResponse(**data)


@router.post("/snapshots", response_model=SnapshotResponse)
async def take_snapshot(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
):
    count = await metric_snapshot_service.take_snapshot(
        db, auth.tenant_id, uuid.UUID(program_id),
    )
    return SnapshotResponse(snapshot_count=count, program_id=program_id)


@router.get("/snapshots/history", response_model=MetricHistoryResponse)
async def metric_history(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    metric_key: str = Query(...),
    program_id: str = Query(...),
    cohort_id: str | None = Query(None),
):
    data = await metric_snapshot_service.get_metric_history(
        db, auth.tenant_id, metric_key, uuid.UUID(program_id), _parse_uuid(cohort_id),
    )
    return MetricHistoryResponse(**data)


@router.post("/quarterly-insight", response_model=QuarterlyInsightResponse)
async def quarterly_insight(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    program_id: str = Query(...),
):
    """Generate AI quarterly insight from computed metrics."""
    pid = uuid.UUID(program_id)

    prog_result = await db.execute(select(Program.name).where(Program.id == pid))
    program_name = prog_result.scalar_one_or_none() or "Unknown Program"

    clinical = await compute_category(db, auth.tenant_id, pid, "clinical")
    hedis = await compute_category(db, auth.tenant_id, pid, "hedis")
    engagement = await compute_category(db, auth.tenant_id, pid, "engagement")
    financial = await compute_category(db, auth.tenant_id, pid, "financial")
    migration = await cohort_migration_service.get_migration_summary(db, auth.tenant_id, pid)

    def _fmt_metrics(metrics: list[dict]) -> str:
        lines = []
        for m in metrics:
            val = m["value"]
            if val is None:
                lines.append(f"- {m['label']}: N/A (data unavailable)")
            else:
                target = m.get("target_value")
                target_str = f" (target: {target}{m['unit']})" if target else ""
                lines.append(f"- {m['label']}: {val} {m['unit']}{target_str}")
        return "\n".join(lines) if lines else "No data available"

    def _fmt_migrations(data: dict) -> str:
        if data["total_migrations"] == 0:
            return "No cohort migrations recorded"
        lines = [f"Total migrations: {data['total_migrations']}"]
        for f in data["flows"]:
            lines.append(f"- {f['from_cohort_name']} -> {f['to_cohort_name']}: {f['count']} patients")
        return "\n".join(lines)

    now = datetime.now(timezone.utc)
    period_start_str = now.replace(month=max(1, now.month - 3)).strftime("%Y-%m-%d")
    period_end_str = now.strftime("%Y-%m-%d")

    try:
        from app.llm import get_provider
        from app.llm.prompts import PROMPT_REGISTRY

        provider = get_provider()
        template = PROMPT_REGISTRY["quarterly_insight"]
        system_prompt, user_prompt = template.render(
            program_name=program_name,
            period_start=period_start_str,
            period_end=period_end_str,
            clinical_metrics=_fmt_metrics(clinical),
            hedis_metrics=_fmt_metrics(hedis),
            engagement_metrics=_fmt_metrics(engagement),
            financial_metrics=_fmt_metrics(financial),
            migration_summary=_fmt_migrations(migration),
        )

        result = await provider.generate(
            user_prompt, system=system_prompt, max_tokens=1024, parse_json=True,
        )

        if isinstance(result, dict):
            return QuarterlyInsightResponse(
                narrative_markdown=result.get("narrative_markdown", ""),
                key_improvements=result.get("key_improvements", []),
                concerns=result.get("concerns", []),
                strategic_recommendations=result.get("strategic_recommendations", []),
                generated_at=now.isoformat(),
                is_fallback=False,
            )
    except Exception:
        pass

    # Fallback: template-based narrative
    fallback_lines = ["## Quarterly Outcomes Summary\n"]
    for m in clinical + hedis + engagement + financial:
        if m["value"] is not None:
            fallback_lines.append(f"- **{m['label']}**: {m['value']} {m['unit']}")

    return QuarterlyInsightResponse(
        narrative_markdown="\n".join(fallback_lines),
        key_improvements=[],
        concerns=[],
        strategic_recommendations=["Review clinical metrics with care team", "Schedule quarterly outcomes review meeting"],
        generated_at=now.isoformat(),
        is_fallback=True,
    )
