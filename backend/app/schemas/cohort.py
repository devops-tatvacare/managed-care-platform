from __future__ import annotations
from typing import Any
from pydantic import BaseModel


class CohortCreate(BaseModel):
    name: str
    slug: str | None = None
    description: str | None = None
    color: str | None = None
    sort_order: int | None = None
    review_cadence_days: int | None = None
    score_range_min: int | None = None
    score_range_max: int | None = None


class CohortUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    color: str | None = None
    sort_order: int | None = None
    review_cadence_days: int | None = None
    score_range_min: int | None = None
    score_range_max: int | None = None


class CriteriaNode(BaseModel):
    group_operator: str | None = None
    rule_type: str | None = None
    config: dict[str, Any] | None = None
    children: list[CriteriaNode] | None = None


class ScoringEngineUpsert(BaseModel):
    components: list[dict[str, Any]]
    tiebreaker_rules: list[dict[str, Any]] | None = None
    aggregation_method: str | None = None


class RecalculateRequest(BaseModel):
    patient_ids: list[str] | None = None


class RecalculateResponse(BaseModel):
    events_created: int


class AssignmentRecord(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    program_id: str
    cohort_id: str
    cohort_name: str
    cohort_color: str
    score: int | None
    score_breakdown: dict[str, Any] | None
    assignment_type: str
    reason: str | None
    previous_cohort_id: str | None
    assigned_at: str
    review_due_at: str | None


class AssignmentListResponse(BaseModel):
    items: list[AssignmentRecord]
    total: int
    page: int
    page_size: int
    pages: int


class DashboardStats(BaseModel):
    total_patients: int
    assigned: int
    unassigned: int
    pending_rescore: int
    active_programs: int


class CohortDistribution(BaseModel):
    cohort_id: str
    cohort_name: str
    cohort_color: str
    count: int
