"""Surface Registrations — registers canonical schemas and options for each builder surface.

Called once at app startup. Each surface defines:
1. Component schemas (the shapes the LLM can generate)
2. Available options (enums/dropdowns the LLM can query)
3. System prompt (domain-specific instructions)
4. Output schema (the full shape of the final submitted config)
"""

from __future__ import annotations

from app.ai_builder.schema_registry import SchemaRegistry


def register_all_surfaces() -> None:
    """Register all builder surfaces. Call once at startup."""
    _register_cohort_program_surface()
    _register_pathway_surface()


# ---------------------------------------------------------------------------
# Cohort Program Surface
# ---------------------------------------------------------------------------

COHORT_PROGRAM_SYSTEM_PROMPT = (
    "You are a clinical program design assistant for a healthcare care-management platform. "
    "You help users design cohortisation programs — risk stratification systems that assign "
    "patients to cohort tiers based on clinical data, with scoring engines and override rules.\n\n"
    "WORKFLOW:\n"
    "1. Ask clarifying questions if the user's request is vague\n"
    "2. Use get_component_schema to understand the exact shape of each component\n"
    "3. Use get_available_options to discover valid field values\n"
    "4. Generate the configuration using submit_config when ready\n"
    "5. Explain what you built and why\n\n"
    "RULES:\n"
    "- Use clinically appropriate thresholds based on published guidelines\n"
    "- Scoring component weights must sum to 100\n"
    "- Each cohort must have non-overlapping score ranges\n"
    "- Override rules should handle clinical edge cases\n"
    "- Be specific with criteria — use real ICD-10, LOINC, or threshold values\n"
)


def _register_cohort_program_surface() -> None:
    # Component schemas — what the LLM can generate
    SchemaRegistry.register_schema("cohort", {
        "type": "object",
        "description": "A cohort tier definition within a program",
        "properties": {
            "name": {"type": "string", "description": "Human-readable cohort name (e.g. 'Tier 2 — Diabetes Wellness')"},
            "color": {"type": "string", "description": "Hex color code (e.g. '#fcd34d')"},
            "sort_order": {"type": "integer", "description": "Display order (0 = lowest tier)"},
            "review_cadence_days": {"type": "integer", "description": "Days between reviews (7, 14, 30, 90, 180, 365)"},
            "score_range_min": {"type": "integer", "description": "Minimum CRS score for this tier"},
            "score_range_max": {"type": "integer", "description": "Maximum CRS score for this tier"},
        },
        "required": ["name", "color", "sort_order", "review_cadence_days", "score_range_min", "score_range_max"],
    })

    SchemaRegistry.register_schema("scoring_component", {
        "type": "object",
        "description": "A weighted component of the composite risk score",
        "properties": {
            "name": {"type": "string", "description": "Internal identifier (snake_case)"},
            "label": {"type": "string", "description": "Display label"},
            "data_source": {"type": "string", "description": "Data source type"},
            "weight": {"type": "integer", "description": "Weight percentage (0-100). All components must sum to 100."},
            "cap": {"type": "integer", "description": "Maximum raw score (usually 100)"},
            "aggregation": {"type": "string", "enum": ["first_match", "sum", "max"], "description": "How to aggregate matched rules"},
            "scoring_table": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "criterion": {"type": "string", "description": "Human-readable condition (e.g. 'HbA1c 5.7-6.4%')"},
                        "points": {"type": "integer", "description": "Points awarded when criterion is met"},
                    },
                    "required": ["criterion", "points"],
                },
            },
        },
        "required": ["name", "label", "data_source", "weight", "cap", "scoring_table"],
    })

    SchemaRegistry.register_schema("override_rule", {
        "type": "object",
        "description": "A tiebreaker/override rule applied after scoring",
        "properties": {
            "priority": {"type": "integer", "description": "Execution order (1 = highest priority)"},
            "rule": {"type": "string", "description": "Human-readable rule description"},
            "action": {"type": "string", "enum": ["override_cohort", "boost_score", "cap_score", "flag_review"]},
        },
        "required": ["priority", "rule", "action"],
    })

    # Output schema — informational, returned by get_component_schema("cohort_program_output")
    # NOTE: No $ref — Gemini function responses cannot contain JSON Schema references
    SchemaRegistry.register_schema("cohort_program_output", {
        "type": "object",
        "description": "Use submit_config with this shape. Cohorts, components, and rules use the schemas from get_component_schema.",
        "properties": {
            "program_name": {"type": "string"},
            "condition": {"type": "string"},
            "description": {"type": "string"},
            "cohorts": {"type": "array", "description": "Array of cohort objects (see get_component_schema('cohort'))"},
            "scoring_engine": {
                "type": "object",
                "properties": {
                    "aggregation_method": {"type": "string", "default": "weighted_sum"},
                    "components": {"type": "array", "description": "Array of scoring components (see get_component_schema('scoring_component'))"},
                },
            },
            "override_rules": {"type": "array", "description": "Array of override rules (see get_component_schema('override_rule'))"},
        },
        "required": ["program_name", "condition", "cohorts", "scoring_engine", "override_rules"],
    })

    # Available options
    SchemaRegistry.register_options("data_sources", [
        {"value": "lab_range", "label": "Lab Range", "description": "Score based on lab test values (e.g. HbA1c, eGFR)"},
        {"value": "diagnosis_match", "label": "Diagnosis Match", "description": "Score based on ICD-10 diagnosis codes"},
        {"value": "pharmacy_adherence", "label": "Pharmacy Adherence", "description": "Score based on medication PDC"},
        {"value": "utilisation", "label": "Utilisation", "description": "Score based on ER visits and hospitalisations"},
        {"value": "sdoh", "label": "SDOH", "description": "Score based on social determinants of health risk domains"},
    ])

    SchemaRegistry.register_options("review_cadences", [
        {"value": "7", "label": "Weekly"},
        {"value": "14", "label": "Bi-weekly"},
        {"value": "30", "label": "Monthly"},
        {"value": "90", "label": "Quarterly"},
        {"value": "180", "label": "6-month"},
        {"value": "365", "label": "Annual"},
    ])

    SchemaRegistry.register_options("override_actions", [
        {"value": "override_cohort", "label": "Override Cohort", "description": "Force patient into a specific tier"},
        {"value": "boost_score", "label": "Boost Score", "description": "Add points to the composite score"},
        {"value": "cap_score", "label": "Cap Score", "description": "Limit the maximum score"},
        {"value": "flag_review", "label": "Flag for Review", "description": "Mark for manual clinical review"},
    ])


# ---------------------------------------------------------------------------
# Pathway Surface
# ---------------------------------------------------------------------------

PATHWAY_SYSTEM_PROMPT = (
    "You are a care pathway design assistant for a healthcare care-management platform. "
    "You help users design care pathways — visual flowcharts of clinical actions, eligibility "
    "checks, logic gates, escalations, and schedules that define how patients are managed.\n\n"
    "WORKFLOW:\n"
    "1. Ask clarifying questions if needed\n"
    "2. Use get_component_schema to understand block types\n"
    "3. Use get_available_options to discover block categories and types\n"
    "4. Generate the pathway configuration using submit_config\n"
    "5. Explain the pathway flow\n\n"
    "RULES:\n"
    "- Each block has a type, category, label, and config\n"
    "- Edges connect blocks (source → target) with optional conditions\n"
    "- Use clinically appropriate protocols\n"
)


def _register_pathway_surface() -> None:
    SchemaRegistry.register_schema("pathway_block", {
        "type": "object",
        "description": "A single block in a care pathway",
        "properties": {
            "block_type": {"type": "string", "description": "The specific block type (e.g. 'eligibility_diagnosis', 'action_outreach')"},
            "category": {"type": "string", "enum": ["eligibility", "action", "logic", "escalation", "schedule"]},
            "label": {"type": "string", "description": "Human-readable label for the block"},
            "config": {"type": "object", "description": "Block-specific configuration"},
            "order_index": {"type": "integer", "description": "Sequential order in the pathway"},
        },
        "required": ["block_type", "category", "label", "config", "order_index"],
    })

    SchemaRegistry.register_schema("pathway_edge", {
        "type": "object",
        "description": "A connection between two blocks",
        "properties": {
            "source_index": {"type": "integer", "description": "Index of the source block"},
            "target_index": {"type": "integer", "description": "Index of the target block"},
            "edge_type": {"type": "string", "enum": ["default", "true_branch", "false_branch"]},
            "label": {"type": "string", "description": "Optional edge label"},
        },
        "required": ["source_index", "target_index", "edge_type"],
    })

    SchemaRegistry.register_schema("pathway_output", {
        "type": "object",
        "description": "Use submit_config with this shape. Blocks and edges use schemas from get_component_schema.",
        "properties": {
            "name": {"type": "string"},
            "description": {"type": "string"},
            "condition": {"type": "string"},
            "target_tiers": {"type": "array", "items": {"type": "integer"}},
            "blocks": {"type": "array", "description": "Array of pathway blocks (see get_component_schema('pathway_block'))"},
            "edges": {"type": "array", "description": "Array of pathway edges (see get_component_schema('pathway_edge'))"},
        },
        "required": ["name", "condition", "blocks", "edges"],
    })

    SchemaRegistry.register_options("block_categories", [
        {"value": "eligibility", "label": "Eligibility", "description": "Patient qualification checks"},
        {"value": "action", "label": "Actions", "description": "Clinical actions (outreach, lab orders, referrals)"},
        {"value": "logic", "label": "Logic", "description": "Conditional branching and decision points"},
        {"value": "escalation", "label": "Escalation", "description": "Tier changes and alerts"},
        {"value": "schedule", "label": "Schedules", "description": "Recurring events and timers"},
    ])

    SchemaRegistry.register_options("block_types", [
        {"value": "eligibility_diagnosis", "label": "Diagnosis Check", "description": "Check ICD-10 codes"},
        {"value": "eligibility_lab", "label": "Lab Threshold", "description": "Check lab value against threshold"},
        {"value": "eligibility_demographics", "label": "Demographics", "description": "Age, gender, BMI checks"},
        {"value": "eligibility_pharmacy", "label": "Pharmacy", "description": "Medication adherence checks"},
        {"value": "action_outreach", "label": "Patient Outreach", "description": "Send message via channel"},
        {"value": "action_lab_order", "label": "Lab Order", "description": "Order a lab test"},
        {"value": "action_referral", "label": "Referral", "description": "Specialist referral"},
        {"value": "action_care_plan", "label": "Care Plan Update", "description": "Modify the care plan"},
        {"value": "logic_conditional", "label": "Conditional", "description": "If/then branching on a clinical value"},
        {"value": "logic_wait", "label": "Wait", "description": "Pause for a duration"},
        {"value": "escalation_uptier", "label": "Up-tier", "description": "Escalate to higher care tier"},
        {"value": "escalation_downtier", "label": "Down-tier", "description": "De-escalate to lower tier"},
        {"value": "escalation_alert", "label": "Alert", "description": "Notify care team"},
        {"value": "schedule_recurring", "label": "Recurring", "description": "Repeat on a schedule"},
    ])
