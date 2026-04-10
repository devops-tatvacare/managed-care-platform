"""Pydantic schemas for the action system."""

from pydantic import BaseModel


class ActionTemplateCreate(BaseModel):
    name: str
    trigger_type: str = "care_gap"
    trigger_config: dict = {}
    cohort_ids: list[str] | None = None
    priority_base: int = 50
    score_weight: float = 0.3
    title_template: str
    description_template: str | None = None
    resolution_options: list[dict] = []


class ActionTemplateRead(ActionTemplateCreate):
    id: str
    program_id: str
    is_active: bool = True


class PatientActionRead(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    template_id: str
    program_id: str
    cohort_id: str | None = None
    cohort_name: str | None = None
    priority: int
    title: str
    description: str | None = None
    status: str
    assigned_to: str | None = None
    resolution_options: list[dict]
    trigger_data: dict | None = None
    created_at: str


class PatientActionUpdate(BaseModel):
    status: str | None = None
    resolution_type: str | None = None
    resolution_note: str | None = None


class ActionQueueResponse(BaseModel):
    items: list[PatientActionRead]
    total: int
