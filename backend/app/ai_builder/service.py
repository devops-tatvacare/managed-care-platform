"""Builder Service — generates configs via Gemini structured output.

Uses a single Gemini call with response_schema so the output is guaranteed to
match the exact shape the scoring engine expects. No tool-calling round-trips.

For cohort_program surface: generates the full program config (cohorts, scoring
engine with field/min/max/domain_count keys, tiebreaker rules).

For pathway surface: generates blocks and edges.

Falls back to conversational mode (no schema) when the user message is a
question or clarification rather than a generation request.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from google import genai
from google.genai import types

from app.config import settings
from app.ai_builder.session import BuilderSession

logger = logging.getLogger(__name__)

BUILDER_MODEL = "gemini-3.1-pro-preview"

# ---------------------------------------------------------------------------
# Structured output schemas — exact shapes the scoring engine expects
# ---------------------------------------------------------------------------

COHORT_PROGRAM_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "message": {
            "type": "STRING",
            "description": "Explanation of what was built and why. Markdown allowed.",
        },
        "config": {
            "type": "OBJECT",
            "description": "The complete program configuration",
            "properties": {
                "program_name": {"type": "STRING"},
                "condition": {"type": "STRING"},
                "description": {"type": "STRING"},
                "cohorts": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "name": {"type": "STRING", "description": "e.g. 'Tier 0 — Prevention'"},
                            "color": {"type": "STRING", "description": "Hex color e.g. '#86efac'"},
                            "sort_order": {"type": "INTEGER"},
                            "review_cadence_days": {"type": "INTEGER", "description": "7, 14, 30, 90, 180, or 365"},
                            "score_range_min": {"type": "INTEGER"},
                            "score_range_max": {"type": "INTEGER"},
                        },
                        "required": ["name", "color", "sort_order", "review_cadence_days", "score_range_min", "score_range_max"],
                    },
                },
                "scoring_engine": {
                    "type": "OBJECT",
                    "properties": {
                        "aggregation_method": {"type": "STRING", "description": "Always 'weighted_sum'"},
                        "components": {
                            "type": "ARRAY",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "name": {"type": "STRING", "description": "snake_case identifier e.g. 'glycaemic_control'"},
                                    "label": {"type": "STRING"},
                                    "data_source": {
                                        "type": "STRING",
                                        "description": "One of: lab_range, diagnosis_match, pharmacy_adherence, utilisation, sdoh",
                                    },
                                    "weight": {"type": "INTEGER", "description": "Percentage weight. All must sum to 100."},
                                    "cap": {"type": "INTEGER", "description": "Max raw score, usually 100"},
                                    "field": {
                                        "type": "STRING",
                                        "description": "For lab_range: the lab field e.g. 'hba1c', 'egfr'. Required for lab_range data_source.",
                                    },
                                    "scoring_table": {
                                        "type": "ARRAY",
                                        "items": {
                                            "type": "OBJECT",
                                            "properties": {
                                                "criterion": {"type": "STRING"},
                                                "points": {"type": "INTEGER"},
                                                "min": {"type": "NUMBER", "description": "Lower bound (inclusive). Omit or null for unbounded."},
                                                "max": {"type": "NUMBER", "description": "Upper bound (exclusive). Omit or null for unbounded."},
                                                "domain_count": {"type": "INTEGER", "description": "For sdoh: number of high-risk domains"},
                                                "er_visits": {"type": "INTEGER", "description": "For utilisation: ER visit count threshold"},
                                                "hospitalisations": {"type": "INTEGER", "description": "For utilisation: hospitalisation count threshold"},
                                                "dka": {"type": "BOOLEAN", "description": "For utilisation: DKA event flag"},
                                                "type": {"type": "STRING", "description": "For diagnosis_match: 'default', 'lab', 'diagnosis', 'pdc'"},
                                                "field": {"type": "STRING", "description": "For diagnosis_match lab rows: 'uacr', 'egfr'. For adherence bonus: 'dds', 'phq9'"},
                                                "icd10_prefix": {
                                                    "type": "ARRAY",
                                                    "items": {"type": "STRING"},
                                                    "description": "For diagnosis_match: ICD-10 code prefixes",
                                                },
                                            },
                                            "required": ["criterion", "points"],
                                        },
                                    },
                                    "bonus_table": {
                                        "type": "ARRAY",
                                        "description": "Optional additive bonus rules",
                                        "items": {
                                            "type": "OBJECT",
                                            "properties": {
                                                "criterion": {"type": "STRING"},
                                                "field": {"type": "STRING"},
                                                "min": {"type": "NUMBER"},
                                                "max": {"type": "NUMBER"},
                                                "points": {"type": "INTEGER"},
                                            },
                                            "required": ["criterion", "field", "points"],
                                        },
                                    },
                                },
                                "required": ["name", "label", "data_source", "weight", "cap", "scoring_table"],
                            },
                        },
                    },
                    "required": ["aggregation_method", "components"],
                },
                "override_rules": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "priority": {"type": "INTEGER"},
                            "rule": {"type": "STRING"},
                            "action": {"type": "STRING", "description": "min_cohort, assign_cohort, escalate_cohort, or min_cohort_or_escalate"},
                            "min_sort_order": {"type": "INTEGER"},
                            "target_sort_order": {"type": "INTEGER"},
                            "from_sort_order": {"type": "INTEGER"},
                            "to_sort_order": {"type": "INTEGER"},
                            "condition": {
                                "type": "OBJECT",
                                "properties": {
                                    "type": {"type": "STRING"},
                                    "prefixes": {"type": "ARRAY", "items": {"type": "STRING"}},
                                    "field": {"type": "STRING"},
                                    "value": {"type": "NUMBER"},
                                },
                                "required": ["type"],
                            },
                        },
                        "required": ["priority", "rule", "action"],
                    },
                },
            },
            "required": ["program_name", "condition", "cohorts", "scoring_engine", "override_rules"],
        },
    },
    "required": ["message", "config"],
}

COHORT_PROGRAM_PROMPT = """You are a clinical program design assistant. Generate a cohortisation program config.

CRITICAL RULES FOR SCORING COMPONENTS:
- For data_source "lab_range": you MUST include "field" (e.g. "hba1c"). Each scoring_table row MUST have "min" and "max" (use null for unbounded).
- For data_source "pharmacy_adherence": each scoring_table row MUST have "min" and "max" and "type": "pdc".
- For data_source "diagnosis_match": each row needs "type" ("default", "lab", or "diagnosis"), plus "icd10_prefix" for diagnosis type or "field"/"min"/"max" for lab type.
- For data_source "utilisation": each row MUST have "er_visits", "hospitalisations", and "dka" fields.
- For data_source "sdoh": each row MUST have "domain_count" field.
- Weights across all components MUST sum to exactly 100.
- Use clinically appropriate thresholds from published guidelines.
- Cohort score ranges must be non-overlapping and cover 0-100.

EXAMPLE component for lab_range:
{
  "name": "glycaemic_control", "label": "Glycaemic Control", "data_source": "lab_range",
  "weight": 30, "cap": 100, "field": "hba1c",
  "scoring_table": [
    {"criterion": "HbA1c < 5.7%", "min": null, "max": 5.7, "points": 0},
    {"criterion": "HbA1c 5.7-6.4%", "min": 5.7, "max": 6.5, "points": 20},
    {"criterion": "HbA1c >= 10.0%", "min": 10.0, "max": null, "points": 90}
  ]
}

EXAMPLE component for sdoh:
{
  "name": "sdoh_burden", "label": "SDOH Burden", "data_source": "sdoh",
  "weight": 10, "cap": 100,
  "scoring_table": [
    {"criterion": "0 domains", "domain_count": 0, "points": 0},
    {"criterion": "1 domain", "domain_count": 1, "points": 33},
    {"criterion": "3+ domains", "domain_count": 3, "points": 100}
  ]
}

EXAMPLE component for utilisation:
{
  "name": "utilisation", "label": "Utilisation", "data_source": "utilisation",
  "weight": 10, "cap": 100,
  "scoring_table": [
    {"criterion": "0 ER, 0 hosp", "er_visits": 0, "hospitalisations": 0, "dka": false, "points": 0},
    {"criterion": "DKA hospitalisation", "er_visits": null, "hospitalisations": null, "dka": true, "points": 85}
  ]
}
"""


PATHWAY_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "message": {
            "type": "STRING",
            "description": "Explanation of the pathway design. Markdown allowed.",
        },
        "config": {
            "type": "OBJECT",
            "properties": {
                "name": {"type": "STRING"},
                "description": {"type": "STRING"},
                "condition": {"type": "STRING"},
                "target_tiers": {"type": "ARRAY", "items": {"type": "INTEGER"}},
                "blocks": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "block_type": {
                                "type": "STRING",
                                "description": "One of: eligibility_diagnosis, eligibility_lab, eligibility_demographics, action_outreach, action_lab_order, action_referral, logic_conditional, logic_wait, escalation_uptier, escalation_downtier, escalation_alert, schedule_recurring",
                            },
                            "category": {
                                "type": "STRING",
                                "description": "One of: eligibility, action, logic, escalation, schedule",
                            },
                            "label": {"type": "STRING"},
                            "config": {"type": "OBJECT", "description": "Block-specific configuration"},
                            "order_index": {"type": "INTEGER"},
                        },
                        "required": ["block_type", "category", "label", "config", "order_index"],
                    },
                },
                "edges": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "source_index": {"type": "INTEGER"},
                            "target_index": {"type": "INTEGER"},
                            "edge_type": {"type": "STRING", "description": "One of: default, true_branch, false_branch"},
                            "label": {"type": "STRING"},
                        },
                        "required": ["source_index", "target_index", "edge_type"],
                    },
                },
            },
            "required": ["name", "condition", "blocks", "edges"],
        },
    },
    "required": ["message", "config"],
}

PATHWAY_PROMPT = """You are a care pathway design assistant. Generate a care pathway configuration.

RULES:
- Each block has a block_type, category, label, config, and order_index (starting at 0)
- Edges connect blocks by order_index (source_index → target_index)
- Use edge_type "default" for normal flow, "true_branch"/"false_branch" for conditional logic blocks
- Use clinically appropriate protocols and real ICD-10 codes
- Block categories: eligibility, action, logic, escalation, schedule
- Always include at least one eligibility block, action blocks, and a logic/escalation block

EXAMPLE block configs:
- eligibility_diagnosis: {"icd10_codes": ["E11"], "match_type": "prefix", "include": true}
- eligibility_lab: {"test_type": "hba1c", "operator": "gte", "value": 7.0, "unit": "%"}
- action_outreach: {"channel": "whatsapp", "template_slug": "enrollment_intro"}
- action_lab_order: {"test_type": "hba1c", "frequency": "quarterly"}
- logic_conditional: {"field": "hba1c", "operator": "gt", "value": "10", "true_branch_label": "Escalate", "false_branch_label": "Continue"}
- escalation_uptier: {"target_tier": 4, "timing": "within_48h"}
"""


class BuilderService:
    """AI builder using Gemini structured output for guaranteed schema compliance."""

    def __init__(self) -> None:
        self._client: genai.Client | None = None

    def _get_client(self) -> genai.Client:
        if self._client is None:
            self._client = genai.Client(api_key=settings.gemini_api_key)
        return self._client

    async def run_turn(
        self,
        session: BuilderSession,
        user_message: str,
    ) -> dict[str, Any]:
        session.add_user_message(user_message)
        contents = session.to_gemini_contents()

        try:
            if session.surface == "cohort_program":
                response = await self._generate_structured(
                    contents, COHORT_PROGRAM_PROMPT, COHORT_PROGRAM_SCHEMA,
                )
            elif session.surface == "pathway":
                response = await self._generate_structured(
                    contents, PATHWAY_PROMPT, PATHWAY_SCHEMA,
                )
            else:
                response = await self._generate_unstructured(contents)
        except Exception as e:
            logger.error(f"Gemini call failed: {e}")
            session.add_model_message("I encountered an error. Please try again.")
            return {"message": "I encountered an error. Please try again.", "config": None}

        message = response.get("message", "")
        config = response.get("config")

        session.add_model_message(message, config=config)
        if config:
            session.current_config = config

        return {"message": message, "config": config}

    async def _generate_structured(
        self,
        contents: list,
        system_prompt: str,
        response_schema: dict,
    ) -> dict[str, Any]:
        """Single Gemini call with structured output — schema enforced by the API."""
        client = self._get_client()

        # Prepend system prompt
        full_contents = [
            {"role": "user", "parts": [{"text": system_prompt}]},
            {"role": "model", "parts": [{"text": "Understood. I will generate configurations that strictly follow the required schema with all mandatory fields."}]},
            *contents,
        ]

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=response_schema,
            max_output_tokens=65536,
            temperature=0.7,
        )

        response = await client.aio.models.generate_content(
            model=BUILDER_MODEL,
            contents=full_contents,
            config=config,
        )

        candidates = response.candidates or []
        if not candidates:
            return {"message": "No response generated. Please try again."}

        content = candidates[0].content
        parts = content.parts if content else []
        raw_text = parts[0].text if parts and parts[0].text else ""

        if not raw_text.strip():
            return {"message": "Empty response. Please try again."}

        try:
            parsed = json.loads(raw_text)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse structured output: {raw_text[:500]}")
            return {"message": raw_text}

        return parsed

    async def _generate_unstructured(self, contents: list) -> dict[str, Any]:
        """Fallback for non-cohort surfaces — plain text response."""
        client = self._get_client()

        config = types.GenerateContentConfig(
            max_output_tokens=65536,
            temperature=0.7,
        )

        response = await client.aio.models.generate_content(
            model=BUILDER_MODEL,
            contents=contents,
            config=config,
        )

        candidates = response.candidates or []
        if not candidates:
            return {"message": "No response generated."}

        parts = candidates[0].content.parts if candidates[0].content else []
        text = parts[0].text if parts else ""
        return {"message": text}
