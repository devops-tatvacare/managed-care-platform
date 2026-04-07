"""Prompt template system for LLM calls."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PromptTemplate:
    """A reusable prompt template with named placeholders."""

    slug: str
    system: str
    user: str

    def render(self, **kwargs: str) -> tuple[str, str]:
        """Return (system_prompt, user_prompt) with placeholders filled."""
        return self.system.format(**kwargs), self.user.format(**kwargs)


def _register(*templates: PromptTemplate) -> dict[str, PromptTemplate]:
    return {t.slug: t for t in templates}


COMMS_GUARDRAILS = (
    "GUARDRAILS: Do not fabricate clinical data. Do not make promises about treatment outcomes. "
    "Use the patient's preferred language. Keep messages under 300 words. "
    "Do not include any personally identifiable information beyond what is provided."
)

PROMPT_REGISTRY: dict[str, PromptTemplate] = _register(
    PromptTemplate(
        slug="comms_draft",
        system=(
            "You are a healthcare communications AI assistant for a care management platform. "
            "Draft a personalised outreach message for a patient based on their clinical context. "
            "The message should be warm, professional, and actionable. "
            f"{COMMS_GUARDRAILS}"
        ),
        user=(
            "Patient context:\n"
            "- Name: {patient_name}\n"
            "- Preferred language: {preferred_language}\n"
            "- Preferred channel: {preferred_channel}\n"
            "- Cohort: {cohort_name}\n"
            "- Care gaps: {care_gaps}\n"
            "- Active medications: {active_medications}\n"
            "- Recent labs: {recent_labs}\n"
            "- Current pathway step: {pathway_step}\n"
            "{template_context}"
            "{additional_context}"
            "\nDraft a message for this patient. Return JSON with keys: "
            '"draft" (the message text), "variables_used" (list of variable names referenced), '
            '"suggested_channel" (whatsapp/sms/call based on context).'
        ),
    ),
    PromptTemplate(
        slug="comms_rewrite",
        system=(
            "You are a healthcare communications editor. Rewrite the provided message "
            "according to the given instruction while preserving all clinical facts. "
            f"{COMMS_GUARDRAILS}"
        ),
        user=(
            "Original message:\n{text}\n\n"
            "Instruction: {instruction_detail}\n\n"
            "Return JSON with key \"rewritten\" containing the rewritten message."
        ),
    ),
    PromptTemplate(
        slug="population_insights",
        system=(
            "You are a clinical analytics AI assistant for a healthcare payer's care management platform. "
            "Generate a concise daily digest (3-5 bullet points in markdown) summarizing the population health status. "
            "Be specific with numbers. Use clinical terminology appropriate for care managers. "
            "End with 1-2 recommended actions."
        ),
        user=(
            "Population data as of today:\n"
            "- Total members: {total_members}\n"
            "- Average risk score: {avg_risk_score}\n"
            "- HbA1c <7% control rate: {hba1c_control_rate}%\n"
            "- Patients with open care gaps: {open_care_gaps}\n"
            "- PDC ≥80% adherence rate: {pdc_above_80_rate}%\n"
            "\nGenerate a daily digest for the care management team."
        ),
    ),
)
