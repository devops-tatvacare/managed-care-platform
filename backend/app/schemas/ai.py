"""Pydantic schemas for AI generation endpoints."""

from pydantic import BaseModel


class CohortGenerateRequest(BaseModel):
    prompt: str


class GeneratedCohort(BaseModel):
    name: str
    color: str = "#6b7280"
    sort_order: int = 0
    review_cadence_days: int = 30
    score_range_min: int = 0
    score_range_max: int = 100


class GeneratedScoringRule(BaseModel):
    criterion: str
    points: int


class GeneratedScoringComponent(BaseModel):
    name: str
    label: str = ""
    data_source: str = "lab_range"
    weight: int = 0
    cap: int = 100
    scoring_table: list[GeneratedScoringRule] = []


class GeneratedOverrideRule(BaseModel):
    priority: int
    rule: str
    action: str = "override_cohort"


class GeneratedScoringEngine(BaseModel):
    aggregation_method: str = "weighted_sum"
    components: list[GeneratedScoringComponent] = []


class CohortGenerateResponse(BaseModel):
    program_name: str
    condition: str
    description: str
    cohorts: list[GeneratedCohort]
    scoring_engine: GeneratedScoringEngine
    override_rules: list[GeneratedOverrideRule]
    ai_narrative: str = ""
