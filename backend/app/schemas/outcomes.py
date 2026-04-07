# backend/app/schemas/outcomes.py
"""Pydantic schemas for outcomes endpoints."""

from __future__ import annotations

from pydantic import BaseModel


# ── Individual Metric ────────────────────────────────────────────────────

class MetricValue(BaseModel):
    metric_key: str
    category: str
    label: str
    value: float | None
    unit: str
    data_available: bool
    baseline_value: float | None = None
    target_value: float | None = None


class MetricCategoryResponse(BaseModel):
    """Response for a single metric category (clinical, hedis, engagement, financial)."""
    metrics: list[MetricValue]
    program_id: str
    cohort_id: str | None = None
    period_start: str | None = None
    period_end: str | None = None


# ── Migration ────────────────────────────────────────────────────────────

class MigrationFlow(BaseModel):
    from_cohort_id: str
    from_cohort_name: str
    to_cohort_id: str
    to_cohort_name: str
    count: int


class MigrationSummaryResponse(BaseModel):
    flows: list[MigrationFlow]
    total_migrations: int


class MigrationHistoryItem(BaseModel):
    assignment_id: str
    patient_id: str
    patient_name: str
    from_cohort_name: str
    from_cohort_color: str
    to_cohort_name: str
    to_cohort_color: str
    score_before: int | None
    score_after: int | None
    assignment_type: str
    reason: str | None
    assigned_at: str


class MigrationHistoryResponse(BaseModel):
    items: list[MigrationHistoryItem]
    total: int
    page: int
    page_size: int


# ── Overrides ────────────────────────────────────────────────────────────

class PendingOverrideItem(BaseModel):
    assignment_id: str
    patient_id: str
    patient_name: str
    from_cohort_name: str
    from_cohort_color: str
    to_cohort_name: str
    to_cohort_color: str
    score: int | None
    reason: str | None
    assigned_by_name: str | None
    assigned_at: str


class PendingOverridesResponse(BaseModel):
    items: list[PendingOverrideItem]
    total: int


class OverrideActionResponse(BaseModel):
    status: str
    assignment_id: str


# ── Snapshot ─────────────────────────────────────────────────────────────

class SnapshotResponse(BaseModel):
    snapshot_count: int
    program_id: str


class MetricHistoryPoint(BaseModel):
    value: float
    period_start: str
    period_end: str
    baseline_value: float | None = None
    target_value: float | None = None


class MetricHistoryResponse(BaseModel):
    metric_key: str
    points: list[MetricHistoryPoint]


# ── AI Quarterly Insight ─────────────────────────────────────────────────

class KeyImprovement(BaseModel):
    metric: str
    change: str
    interpretation: str


class Concern(BaseModel):
    metric: str
    issue: str
    recommendation: str


class QuarterlyInsightResponse(BaseModel):
    narrative_markdown: str
    key_improvements: list[KeyImprovement]
    concerns: list[Concern]
    strategic_recommendations: list[str]
    generated_at: str
    is_fallback: bool = False
