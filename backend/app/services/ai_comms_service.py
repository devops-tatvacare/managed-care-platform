"""AI communications service — LLM-powered message drafting and rewriting."""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cohort import CohortAssignment
from app.models.communication import MessageTemplate
from app.models.patient import Patient

logger = logging.getLogger(__name__)

REWRITE_INSTRUCTIONS = {
    "simplify": "Rewrite at an 8th-grade reading level. Use short sentences and simple words.",
    "formal": "Rewrite in a formal clinical tone appropriate for a medical professional.",
    "empathetic": "Rewrite with a warm, supportive, and empathetic tone.",
    "translate_pt": "Translate the message into Brazilian Portuguese, preserving meaning and tone.",
    "translate_en": "Translate the message into English, preserving meaning and tone.",
    "translate_es": "Translate the message into Spanish, preserving meaning and tone.",
}


async def _build_patient_context(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient_id: uuid.UUID,
) -> dict:
    """Build a rich context object for prompt rendering."""

    patient = (
        await db.execute(
            select(Patient)
            .where(Patient.id == patient_id, Patient.tenant_id == tenant_id)
            .options(selectinload(Patient.labs), selectinload(Patient.diagnoses))
        )
    ).scalar_one_or_none()

    if not patient:
        return {
            "patient_name": "Unknown",
            "preferred_language": "pt",
            "preferred_channel": "whatsapp",
            "cohort_name": "N/A",
            "care_gaps": "None",
            "active_medications": "None",
            "recent_labs": "None",
            "pathway_step": "N/A",
        }

    # Current cohort
    assignment = (
        await db.execute(
            select(CohortAssignment)
            .where(
                CohortAssignment.patient_id == patient_id,
                CohortAssignment.tenant_id == tenant_id,
                CohortAssignment.is_current == True,  # noqa: E712
            )
            .options(selectinload(CohortAssignment.cohort))
        )
    ).scalar_one_or_none()

    cohort_name = assignment.cohort.name if assignment and assignment.cohort else "Unassigned"

    # Recent labs (last 5)
    sorted_labs = sorted(patient.labs, key=lambda l: l.recorded_at, reverse=True)[:5]
    labs_str = ", ".join(
        f"{l.test_type}: {l.value} {l.unit}" for l in sorted_labs
    ) if sorted_labs else "No recent labs"

    # Active medications
    meds = patient.active_medications or []
    meds_str = ", ".join(
        m.get("name", "Unknown") if isinstance(m, dict) else str(m) for m in meds
    ) if meds else "None listed"

    # Care gaps
    gaps = patient.care_gaps or []
    gaps_str = ", ".join(gaps) if gaps else "No open care gaps"

    return {
        "patient_name": f"{patient.first_name} {patient.last_name}",
        "preferred_language": patient.preferred_language,
        "preferred_channel": patient.preferred_channel,
        "cohort_name": cohort_name,
        "care_gaps": gaps_str,
        "active_medications": meds_str,
        "recent_labs": labs_str,
        "pathway_step": patient.pathway_status or "N/A",
    }


async def draft_message(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient_id: uuid.UUID,
    template_id: uuid.UUID | None = None,
    context: str | None = None,
) -> dict:
    """Draft an outreach message for a patient using the LLM.

    Returns dict with keys: draft, variables_used, suggested_channel.
    """
    patient_ctx = await _build_patient_context(db, tenant_id, uuid.UUID(str(patient_id)))

    # Template context
    template_context = ""
    if template_id:
        tpl = (
            await db.execute(
                select(MessageTemplate).where(
                    MessageTemplate.id == template_id,
                    MessageTemplate.tenant_id == tenant_id,
                )
            )
        ).scalar_one_or_none()
        if tpl:
            template_context = f"\nStarting template to personalise:\n{tpl.content}\n"

    additional_context = ""
    if context:
        additional_context = f"\nAdditional context from care manager:\n{context}\n"

    try:
        from app.llm import get_provider
        from app.llm.prompts import PROMPT_REGISTRY

        provider = get_provider()
        template = PROMPT_REGISTRY["comms_draft"]
        system_prompt, user_prompt = template.render(
            **patient_ctx,
            template_context=template_context,
            additional_context=additional_context,
        )

        result = await provider.generate(
            user_prompt,
            system=system_prompt,
            max_tokens=1024,
            parse_json=True,
        )

        if isinstance(result, dict):
            return {
                "draft": result.get("draft", ""),
                "variables_used": result.get("variables_used", []),
                "suggested_channel": result.get("suggested_channel", patient_ctx["preferred_channel"]),
            }
    except Exception:
        logger.exception("LLM draft_message failed, returning fallback")

    # Fallback: use template content or generic message
    fallback_draft = (
        f"Olá {patient_ctx['patient_name']}, "
        "este é um lembrete do seu programa de acompanhamento de saúde. "
        "Por favor, entre em contato conosco para agendar sua próxima consulta."
    )
    return {
        "draft": fallback_draft,
        "variables_used": ["patient_name"],
        "suggested_channel": patient_ctx["preferred_channel"],
    }


async def rewrite_message(
    text: str,
    instruction: str,
) -> dict:
    """Rewrite a message according to the given instruction.

    Returns dict with key: rewritten.
    """
    instruction_detail = REWRITE_INSTRUCTIONS.get(instruction, instruction)

    try:
        from app.llm import get_provider
        from app.llm.prompts import PROMPT_REGISTRY

        provider = get_provider()
        template = PROMPT_REGISTRY["comms_rewrite"]
        system_prompt, user_prompt = template.render(
            text=text,
            instruction_detail=instruction_detail,
        )

        result = await provider.generate(
            user_prompt,
            system=system_prompt,
            max_tokens=1024,
            parse_json=True,
        )

        if isinstance(result, dict) and "rewritten" in result:
            return {"rewritten": result["rewritten"]}
    except Exception:
        logger.exception("LLM rewrite_message failed, returning original")

    # Fallback: return original text
    return {"rewritten": text}
