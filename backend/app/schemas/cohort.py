from __future__ import annotations

from pydantic import BaseModel
from typing import Any


class CRSConfigResponse(BaseModel):
    id: str
    components: list[dict[str, Any]]
    tier_thresholds: list[dict[str, Any]]
    tiebreaker_rules: list[dict[str, Any]]


class CRSConfigUpdate(BaseModel):
    components: list[dict[str, Any]] | None = None
    tier_thresholds: list[dict[str, Any]] | None = None
    tiebreaker_rules: list[dict[str, Any]] | None = None


class RecalculateRequest(BaseModel):
    patient_ids: list[str] | None = None


class RecalculateResponse(BaseModel):
    processed: int
    tier_changes: int


class CRSBreakdownComponent(BaseModel):
    raw: int | float
    weighted: float


class AssignmentRecord(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    tier_number: int
    previous_tier: int | None
    crs_score: int
    crs_breakdown: dict[str, CRSBreakdownComponent]
    assignment_type: str
    reason: str | None
    assigned_at: str
    review_due_at: str | None


class AssignmentListResponse(BaseModel):
    items: list[AssignmentRecord]
    total: int
    page: int
    page_size: int
    pages: int


class TierDistribution(BaseModel):
    tier: int
    count: int


class TierDistributionResponse(BaseModel):
    distribution: list[TierDistribution]
    total: int
