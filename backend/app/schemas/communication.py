"""Pydantic schemas for the communications feature."""

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Concierge actions
# ---------------------------------------------------------------------------

class ConciergeActionRead(BaseModel):
    id: str
    patient_id: str
    pathway_block_id: str | None = None
    triggered_by: str
    channel: str
    action_type: str
    status: str
    template_id: str | None = None
    payload: dict | None = None
    response: dict | None = None
    error: str | None = None
    created_at: str
    completed_at: str | None = None


# ---------------------------------------------------------------------------
# Threads (derived from concierge_actions)
# ---------------------------------------------------------------------------

class ThreadSummary(BaseModel):
    patient_id: str
    patient_name: str
    channel: str
    last_action_type: str
    last_action_status: str
    last_action_at: str
    unread_count: int
    total_actions: int


class ThreadListResponse(BaseModel):
    items: list[ThreadSummary]
    total: int
    page: int
    page_size: int
    pages: int


class ThreadDetail(BaseModel):
    patient_id: str
    patient_name: str
    actions: list[ConciergeActionRead]


# ---------------------------------------------------------------------------
# Message templates
# ---------------------------------------------------------------------------

class MessageTemplateRead(BaseModel):
    id: str
    name: str
    slug: str
    category: str
    channel: str
    language: str
    content: str
    variable_map: dict | None = None
    cohort_applicability: list[str] | None = None
    is_active: bool
    created_at: str
    updated_at: str


class MessageTemplateCreate(BaseModel):
    name: str
    slug: str
    category: str
    channel: str = "whatsapp"
    language: str = "pt"
    content: str
    variable_map: dict | None = None
    cohort_applicability: list[str] | None = None


class MessageTemplateUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    channel: str | None = None
    language: str | None = None
    content: str | None = None
    variable_map: dict | None = None
    cohort_applicability: list[str] | None = None
    is_active: bool | None = None


class MessageTemplateListResponse(BaseModel):
    items: list[MessageTemplateRead]
    total: int


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

class OrchestrationRow(BaseModel):
    action_id: str
    patient_id: str
    patient_name: str
    cohort_name: str | None = None
    program_name: str | None = None
    pathway_block_label: str | None = None
    channel: str
    action_type: str
    status: str
    triggered_by: str
    template_name: str | None = None
    created_at: str
    completed_at: str | None = None


class OrchestrationStats(BaseModel):
    total_sequences: int
    active: int
    completed: int
    failed: int


class OrchestrationResponse(BaseModel):
    items: list[OrchestrationRow]
    stats: OrchestrationStats
    total: int
    page: int
    page_size: int
    pages: int


# ---------------------------------------------------------------------------
# AI comms
# ---------------------------------------------------------------------------

class CommsDraftRequest(BaseModel):
    patient_id: str
    template_id: str | None = None
    context: str | None = None


class CommsDraftResponse(BaseModel):
    draft: str
    variables_used: list[str]
    suggested_channel: str


class CommsRewriteRequest(BaseModel):
    text: str
    instruction: str  # simplify | formal | empathetic | translate_pt | translate_en | translate_es


class CommsRewriteResponse(BaseModel):
    rewritten: str


# ---------------------------------------------------------------------------
# Manual send
# ---------------------------------------------------------------------------

class SendActionRequest(BaseModel):
    patient_id: str
    channel: str
    action_type: str
    template_id: str | None = None
    payload: dict | None = None
