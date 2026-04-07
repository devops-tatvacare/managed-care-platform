import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.context import AuthContext
from app.auth.dependencies import get_auth
from app.database import get_db
from app.schemas.communication import (
    CommsDraftRequest,
    CommsDraftResponse,
    CommsRewriteRequest,
    CommsRewriteResponse,
)
from app.schemas.pathway import PathwayGenerateRequest
from app.services import ai_comms_service

router = APIRouter()


@router.post("/pathway-generate")
async def generate_pathway(
    request: PathwayGenerateRequest,
    auth: AuthContext = Depends(get_auth),
):
    """Stubbed AI pathway generation. Returns mock response."""
    return {
        "message": (
            "Based on your description, I've designed a comprehensive care pathway "
            "with eligibility criteria, clinical actions, and escalation triggers. "
            "Review the blocks below and click 'Accept & Edit' to refine on the canvas."
        ),
        "is_complete": True,
        "pathway": {
            "name": "AI-Generated Diabetes Pathway",
            "description": f"Generated from: {request.prompt}",
            "condition": "diabetes",
            "target_tiers": [2, 3, 4],
            "blocks": [
                {
                    "block_type": "eligibility_diagnosis",
                    "category": "eligibility",
                    "label": "Diabetes Diagnosis",
                    "config": {"icd10_codes": ["E11"], "match_type": "prefix", "include": True},
                    "order_index": 0,
                },
                {
                    "block_type": "eligibility_lab",
                    "category": "eligibility",
                    "label": "HbA1c Threshold",
                    "config": {"test_type": "hba1c", "operator": "gte", "value": 7.0, "unit": "%"},
                    "order_index": 1,
                },
                {
                    "block_type": "action_outreach",
                    "category": "action",
                    "label": "Initial Patient Contact",
                    "config": {"channel": "whatsapp", "template_slug": "enrollment_intro", "ai_personalisation": True},
                    "order_index": 2,
                },
                {
                    "block_type": "action_lab_order",
                    "category": "action",
                    "label": "Quarterly HbA1c",
                    "config": {"test_type": "hba1c", "frequency": "quarterly", "notification_target": "care_manager"},
                    "order_index": 3,
                },
                {
                    "block_type": "logic_conditional",
                    "category": "logic",
                    "label": "Severe Hyperglycemia Check",
                    "config": {"field": "hba1c", "operator": "gt", "value": "10", "true_branch_label": "Escalate", "false_branch_label": "Continue"},
                    "order_index": 4,
                },
                {
                    "block_type": "escalation_uptier",
                    "category": "escalation",
                    "label": "Escalate to Tier 4",
                    "config": {"target_tier": 4, "timing": "within_48h", "notification_targets": ["care_manager", "physician"]},
                    "order_index": 5,
                },
            ],
            "edges": [
                {"source_index": 0, "target_index": 1, "edge_type": "default"},
                {"source_index": 1, "target_index": 2, "edge_type": "default"},
                {"source_index": 2, "target_index": 3, "edge_type": "default"},
                {"source_index": 3, "target_index": 4, "edge_type": "default"},
                {"source_index": 4, "target_index": 5, "edge_type": "true_branch", "label": "HbA1c > 10"},
            ],
        },
    }


@router.post("/comms-draft", response_model=CommsDraftResponse)
async def comms_draft(
    body: CommsDraftRequest,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    """Draft an AI-personalised outreach message for a patient."""
    result = await ai_comms_service.draft_message(
        db,
        auth.tenant_id,
        uuid.UUID(body.patient_id),
        template_id=uuid.UUID(body.template_id) if body.template_id else None,
        context=body.context,
    )
    return CommsDraftResponse(**result)


@router.post("/comms-rewrite", response_model=CommsRewriteResponse)
async def comms_rewrite(
    body: CommsRewriteRequest,
    auth: AuthContext = Depends(get_auth),
):
    """Rewrite a message with a given instruction (simplify, formal, empathetic, translate)."""
    result = await ai_comms_service.rewrite_message(body.text, body.instruction)
    return CommsRewriteResponse(**result)
