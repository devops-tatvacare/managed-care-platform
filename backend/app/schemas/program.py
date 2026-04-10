from __future__ import annotations
from typing import Any
from pydantic import BaseModel


class ProgramCreate(BaseModel):
    name: str
    slug: str | None = None
    condition: str | None = None
    description: str | None = None


class ProgramUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    condition: str | None = None
    description: str | None = None
    status: str | None = None


class CohortSummary(BaseModel):
    id: str
    name: str
    slug: str
    color: str
    sort_order: int
    review_cadence_days: int
    score_range_min: int | None
    score_range_max: int | None
    member_count: int
    pathway_id: str | None = None
    pathway_name: str | None = None


class ScoringEngineSummary(BaseModel):
    id: str
    components: list[dict[str, Any]]
    tiebreaker_rules: list[dict[str, Any]]
    aggregation_method: str


class ProgramListItem(BaseModel):
    id: str
    name: str
    slug: str
    condition: str | None
    status: str
    version: int
    cohort_count: int
    has_scoring_engine: bool


class ProgramDetail(BaseModel):
    id: str
    name: str
    slug: str
    condition: str | None
    description: str | None
    status: str
    version: int
    published_at: str | None
    cohorts: list[CohortSummary]
    scoring_engine: ScoringEngineSummary | None


class ProgramVersionSchema(BaseModel):
    id: str
    version: int
    published_at: str
    snapshot: dict[str, Any]
