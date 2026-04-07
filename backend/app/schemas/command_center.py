"""Pydantic schemas for command center endpoints."""

from __future__ import annotations

from pydantic import BaseModel


# ── KPIs ──────────────────────────────────────────────────────────────────

class CommandCenterKPIs(BaseModel):
    total_members: int
    avg_risk_score: float | None
    hba1c_control_rate: float | None
    open_care_gaps: int
    pdc_above_80_rate: float | None


# ── Action Queue ──────────────────────────────────────────────────────────

class ActionChip(BaseModel):
    label: str
    action_type: str
    target: str


class ActionQueueItem(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    alert_type: str
    title: str
    description: str
    priority: str
    cohort_name: str
    cohort_color: str
    actions: list[ActionChip]


class ActionQueueResponse(BaseModel):
    items: list[ActionQueueItem]
    total: int


# ── AI Insights ───────────────────────────────────────────────────────────

class AIInsightsResponse(BaseModel):
    markdown: str
    generated_at: str
    is_cached: bool


# ── Upcoming Reviews ──────────────────────────────────────────────────────

class UpcomingReviewItem(BaseModel):
    patient_id: str
    patient_name: str
    program_id: str
    program_name: str
    cohort_name: str
    cohort_color: str
    review_due_at: str
    days_until_due: int


class UpcomingReviewsResponse(BaseModel):
    items: list[UpcomingReviewItem]
    total: int
