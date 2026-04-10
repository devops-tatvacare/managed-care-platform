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
    PromptTemplate(
        slug="cohort_generate",
        system=(
            "You are a clinical program design AI for a healthcare care-management platform. "
            "Given a natural language description, generate a complete cohortisation program configuration. "
            "The configuration must include: cohort tier definitions, a composite risk scoring engine with weighted components, "
            "and tiebreaker/override rules. "
            "Each cohort needs: name, color (hex), sort_order, review_cadence_days, score_range_min, score_range_max. "
            "Each scoring component needs: name, label, data_source (one of: lab_range, diagnosis_match, pharmacy_adherence, utilisation, sdoh), "
            "weight (integer 0-100, all weights must sum to 100), cap (integer, usually 100), "
            "scoring_table (array of {{criterion, points}}), and optional bonus_table. "
            "Each override rule needs: priority (integer), rule (descriptive name), action (one of: override_cohort, boost_score, cap_score, flag_review). "
            "Use clinically appropriate thresholds based on published guidelines (ADA, KDIGO, AHA). "
            "Return ONLY valid JSON matching the schema. Do not fabricate patient data."
        ),
        user=(
            "Program description:\n{user_prompt}\n\n"
            "Generate the complete program configuration as JSON with these exact keys:\n"
            '- "program_name": string\n'
            '- "condition": string\n'
            '- "description": string (1-2 sentences)\n'
            '- "cohorts": array of objects with {{name, color, sort_order, review_cadence_days, score_range_min, score_range_max}}\n'
            '- "scoring_engine": object with {{aggregation_method: "weighted_sum", components: array of {{name, label, data_source, weight, cap, scoring_table: [{{criterion, points}}]}}}}\n'
            '- "override_rules": array of {{priority, rule, action}}\n'
        ),
    ),
    PromptTemplate(
        slug="batch_risk_narrative",
        system=(
            "You are a clinical risk analyst AI for a healthcare care-management platform. "
            "Given a batch of patients with their risk scores and clinical data, generate a concise "
            "1-2 sentence risk narrative for each patient. "
            "Each narrative should explain WHY the patient scored the way they did, referencing specific "
            "lab values, diagnoses, and adherence data. Use clinical language appropriate for care managers. "
            "Do not fabricate data — only reference values provided in the input. "
            "Return a JSON array of objects with keys: patient_id (string), narrative (string)."
        ),
        user=(
            "Generate risk narratives for these {count} patients:\n\n"
            "{patients_json}\n\n"
            "Return a JSON array: [{{\"patient_id\": \"...\", \"narrative\": \"...\"}}]"
        ),
    ),
    PromptTemplate(
        slug="patient_ai_summary",
        system=(
            "You are a clinical AI assistant for a healthcare care-management platform. "
            "Given a patient's complete clinical profile, generate: "
            "1) A comprehensive clinical summary paragraph (3-4 sentences) covering their condition, risk factors, and trajectory. "
            "2) A list of 2-4 recommended clinical actions with urgency levels. "
            "Use clinical language appropriate for care managers. Do not fabricate data. "
            "Return JSON with keys: \"summary\" (string), \"actions\" (array of {{\"text\": string, \"urgency\": \"urgent\"|\"this_week\"|\"next_visit\"}})."
        ),
        user=(
            "Patient: {patient_name}, {age}y {gender}\n"
            "Risk Score: {score} ({cohort_name})\n"
            "Risk Narrative: {narrative}\n\n"
            "Active Diagnoses: {diagnoses}\n"
            "Latest Labs: {labs}\n"
            "Active Medications: {medications}\n"
            "Worst PDC: {worst_pdc}\n"
            "SDOH Flags: {sdoh_flags}\n"
            "Care Gaps: {care_gaps}\n\n"
            "Generate the clinical summary and recommended actions."
        ),
    ),
    PromptTemplate(
        slug="quarterly_insight",
        system=(
            "You are a clinical outcomes analyst for a healthcare payer's care management platform. "
            "Generate a 4-6 bullet narrative analyzing population health trends. "
            "Be specific with numbers. Compare current vs baseline where available. "
            "Highlight improvements and areas of concern. "
            "End with 2-3 strategic recommendations. "
            "Return a JSON object with exactly these keys: "
            '"narrative_markdown" (string, the full narrative in markdown), '
            '"key_improvements" (array of {metric, change, interpretation}), '
            '"concerns" (array of {metric, issue, recommendation}), '
            '"strategic_recommendations" (array of strings). '
            "Do not fabricate data. Only reference numbers provided in the input."
        ),
        user=(
            "Program: {program_name}\n"
            "Period: {period_start} to {period_end}\n\n"
            "== Clinical Metrics ==\n{clinical_metrics}\n\n"
            "== HEDIS Metrics ==\n{hedis_metrics}\n\n"
            "== Engagement Metrics ==\n{engagement_metrics}\n\n"
            "== Financial Metrics ==\n{financial_metrics}\n\n"
            "== Cohort Migration Summary ==\n{migration_summary}\n\n"
            "Analyze these metrics and generate the quarterly insight JSON."
        ),
    ),
)
