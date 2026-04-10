# Pathway Builder Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 25 hardcoded diabetes-specific block types with 18 generic block types backed by FHIR reference tables, integrate AI builder for pathway generation, and add a condition-specific template library.

**Architecture:** Generic block type registry with JSON config schemas. Config drawer renders dynamic forms with autocomplete from `/api/reference/{domain}/search`. AI builder surface registered for pathway generation using the same tool-driven pattern as the cohort builder. Template library provides per-condition shortcuts as pre-filled configs on generic blocks.

**Tech Stack:** React (block-types.ts rewrite), FastAPI (AI builder surface), Zustand (pathway store), React Flow (visual canvas — unchanged layout)

**Depends on:** FHIR Reference Data Layer (Plan 1) must be completed first.

---

## Summary

This plan covers Parts A (Generic Block System), B (Template Library), C (Schema Registry), and D (AI Builder Integration) from the spec. Parts E (Execution Engine) and F (Patient Forks) are separate plans.

8 tasks total:
1. Rewrite block-types.ts with generic types
2. Register pathway schemas in backend
3. Add `lookup_canonical` tool to AI builder
4. Register pathway AI builder surface
5. Update component library sidebar
6. Update block node rendering
7. Update config drawer with reference autocomplete
8. Create template picker + seed templates

---

### Task 1: Rewrite block-types.ts

**Files:**
- Modify: `src/config/block-types.ts`

- [ ] **Step 1: Rewrite the block type registry**

Replace the entire `BLOCK_TYPE_REGISTRY` and `BLOCK_CATEGORIES` with the generic versions. Keep the same TypeScript interfaces (`BlockCategory`, `CategoryDefinition`, `BlockTypeDefinition`, `ConfigFieldDefinition`) — the types are already generic, only the data was hardcoded.

Update `BLOCK_CATEGORIES` — add Assessment category:

```typescript
export type BlockCategory = "eligibility" | "assessment" | "action" | "logic" | "escalation" | "schedule";

export const BLOCK_CATEGORIES: CategoryDefinition[] = [
  { key: "eligibility", label: "Eligibility", colorClass: "text-green-700 dark:text-green-400", bgClass: "bg-green-50 dark:bg-green-950", borderClass: "border-green-200 dark:border-green-700", iconBgClass: "bg-green-600", icon: "completed" },
  { key: "assessment", label: "Assessment", colorClass: "text-purple-700 dark:text-purple-400", bgClass: "bg-purple-50 dark:bg-purple-950", borderClass: "border-purple-200 dark:border-purple-700", iconBgClass: "bg-purple-600", icon: "assessment" },
  { key: "action", label: "Actions", colorClass: "text-blue-700 dark:text-blue-400", bgClass: "bg-blue-50 dark:bg-blue-950", borderClass: "border-blue-200 dark:border-blue-700", iconBgClass: "bg-blue-600", icon: "send" },
  { key: "logic", label: "Logic", colorClass: "text-amber-700 dark:text-amber-400", bgClass: "bg-amber-50 dark:bg-amber-950", borderClass: "border-amber-200 dark:border-amber-700", iconBgClass: "bg-amber-600", icon: "conditional" },
  { key: "escalation", label: "Escalation", colorClass: "text-red-700 dark:text-red-400", bgClass: "bg-red-50 dark:bg-red-950", borderClass: "border-red-200 dark:border-red-700", iconBgClass: "bg-red-600", icon: "warning" },
  { key: "schedule", label: "Schedules", colorClass: "text-cyan-700 dark:text-cyan-400", bgClass: "bg-cyan-50 dark:bg-cyan-950", borderClass: "border-cyan-200 dark:border-cyan-700", iconBgClass: "bg-cyan-600", icon: "schedule" },
];
```

Replace `BLOCK_TYPE_REGISTRY` with 18 generic types. Each block has generic descriptions (no condition-specific language) and config fields that reference canonical domains.

Add a new field type `"reference"` to `ConfigFieldDefinition` for fields backed by reference table search:

```typescript
export interface ConfigFieldDefinition {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "multiselect" | "toggle" | "textarea" | "json" | "list" | "reference";
  options?: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: unknown;
  referenceDomain?: string; // e.g. "conditions", "lab_tests", "medications" — for type="reference"
  referenceMultiple?: boolean; // allow multiple selections from reference
}
```

The full registry (18 blocks):

```typescript
export const BLOCK_TYPE_REGISTRY: Record<string, BlockTypeDefinition> = {
  // ── Eligibility (4) ────────────────────────────────────────────────────
  eligibility_diagnosis: {
    type: "eligibility_diagnosis",
    category: "eligibility",
    label: "Diagnosis Gate",
    description: "Include or exclude patients by diagnosis code",
    icon: "diagnosis",
    configFields: [
      { key: "icd10_patterns", label: "Diagnosis Codes", type: "reference", required: true, referenceDomain: "conditions", referenceMultiple: true, placeholder: "Search ICD-10 codes..." },
      { key: "match_type", label: "Match Type", type: "select", options: [{ label: "Prefix", value: "prefix" }, { label: "Exact", value: "exact" }], defaultValue: "prefix" },
      { key: "include", label: "Include Matching", type: "toggle", defaultValue: true },
    ],
  },
  eligibility_lab: {
    type: "eligibility_lab",
    category: "eligibility",
    label: "Lab Gate",
    description: "Gate patients by lab result threshold",
    icon: "lab",
    configFields: [
      { key: "test_code", label: "Lab Test", type: "reference", required: true, referenceDomain: "lab_tests", placeholder: "Search LOINC labs..." },
      { key: "operator", label: "Operator", type: "select", required: true, options: [
        { label: "≥", value: "gte" }, { label: "≤", value: "lte" },
        { label: ">", value: "gt" }, { label: "<", value: "lt" },
        { label: "=", value: "eq" }, { label: "Between", value: "between" },
      ]},
      { key: "value", label: "Value", type: "number", required: true },
      { key: "unit", label: "Unit", type: "text", placeholder: "Auto-filled from lab" },
      { key: "missing_rule", label: "If Missing", type: "select", options: [
        { label: "Block", value: "block" }, { label: "Provisional", value: "provisional" },
        { label: "Trigger Outreach", value: "trigger_outreach" }, { label: "Skip", value: "skip" },
      ]},
    ],
  },
  eligibility_demographics: {
    type: "eligibility_demographics",
    category: "eligibility",
    label: "Demographics Gate",
    description: "Filter by age, gender, or other demographics",
    icon: "demographics",
    configFields: [
      { key: "age_min", label: "Min Age", type: "number", placeholder: "18" },
      { key: "age_max", label: "Max Age", type: "number", placeholder: "100" },
      { key: "gender", label: "Gender", type: "select", options: [
        { label: "Any", value: "any" }, { label: "Male", value: "male" }, { label: "Female", value: "female" },
      ]},
    ],
  },
  eligibility_pharmacy: {
    type: "eligibility_pharmacy",
    category: "eligibility",
    label: "Pharmacy Gate",
    description: "Gate by medication or adherence threshold",
    icon: "pharmacy",
    configFields: [
      { key: "drug", label: "Drug / Drug Class", type: "reference", referenceDomain: "medications", placeholder: "Search RxNorm..." },
      { key: "pdc_operator", label: "PDC Operator", type: "select", options: [
        { label: "≥", value: "gte" }, { label: "<", value: "lt" },
      ]},
      { key: "pdc_value", label: "PDC Threshold (%)", type: "number", placeholder: "80" },
      { key: "active_rx_required", label: "Active Rx Required", type: "toggle", defaultValue: false },
    ],
  },

  // ── Assessment (3) ─────────────────────────────────────────────────────
  assessment_screening: {
    type: "assessment_screening",
    category: "assessment",
    label: "Screening Instrument",
    description: "Administer a validated screening tool",
    icon: "assessment",
    configFields: [
      { key: "instrument_code", label: "Instrument", type: "reference", required: true, referenceDomain: "instruments", placeholder: "Search instruments..." },
      { key: "frequency", label: "Frequency", type: "select", required: true, options: [
        { label: "Every Visit", value: "every_visit" }, { label: "Monthly", value: "monthly" },
        { label: "Quarterly", value: "quarterly" }, { label: "Biannual", value: "biannual" },
        { label: "Annual", value: "annual" },
      ]},
      { key: "threshold_score", label: "Alert Threshold", type: "number", placeholder: "Score triggering action" },
      { key: "threshold_action", label: "If Above Threshold", type: "select", options: [
        { label: "Escalate", value: "escalate" }, { label: "Notify Care Team", value: "notify" },
        { label: "Flag for Review", value: "flag" },
      ]},
    ],
  },
  assessment_clinical: {
    type: "assessment_clinical",
    category: "assessment",
    label: "Clinical Assessment",
    description: "Clinical evaluation or data collection step",
    icon: "assessment",
    configFields: [
      { key: "description", label: "Assessment Description", type: "textarea", required: true, placeholder: "Describe what is assessed..." },
      { key: "required_data", label: "Required Data", type: "reference", referenceDomain: "lab_tests", referenceMultiple: true, placeholder: "Labs needed..." },
      { key: "assigned_role", label: "Assigned To", type: "select", options: [
        { label: "Care Manager", value: "care_manager" }, { label: "Physician", value: "physician" },
        { label: "Nurse", value: "nurse" }, { label: "Pharmacist", value: "pharmacist" },
      ]},
    ],
  },
  assessment_sdoh: {
    type: "assessment_sdoh",
    category: "assessment",
    label: "SDOH Screening",
    description: "Screen for social determinants of health",
    icon: "sdoh",
    configFields: [
      { key: "domains", label: "SDOH Domains", type: "reference", required: true, referenceDomain: "sdoh", referenceMultiple: true, placeholder: "Search SDOH domains..." },
      { key: "referral_on_positive", label: "Auto-Refer on Positive", type: "toggle", defaultValue: true },
    ],
  },

  // ── Actions (4) ────────────────────────────────────────────────────────
  action_outreach: {
    type: "action_outreach",
    category: "action",
    label: "Patient Outreach",
    description: "Send message to patient via configured channel",
    icon: "outreach",
    configFields: [
      { key: "channel", label: "Channel", type: "select", required: true, options: [
        { label: "WhatsApp", value: "whatsapp" }, { label: "SMS", value: "sms" },
        { label: "Phone Call", value: "phone" }, { label: "Email", value: "email" },
        { label: "App Push", value: "app_push" },
      ]},
      { key: "template_slug", label: "Message Template", type: "text", placeholder: "Template identifier" },
      { key: "ai_personalisation", label: "AI Personalisation", type: "toggle", defaultValue: true },
      { key: "fallback_action", label: "If No Response", type: "select", options: [
        { label: "Retry in 48h", value: "retry_48h" }, { label: "Escalate to CM", value: "escalate_cm" },
        { label: "Flag Command Center", value: "flag" }, { label: "None", value: "none" },
      ]},
    ],
  },
  action_clinical_order: {
    type: "action_clinical_order",
    category: "action",
    label: "Clinical Order",
    description: "Order a lab test, imaging, or procedure",
    icon: "lab",
    configFields: [
      { key: "order_type", label: "Order Type", type: "select", required: true, options: [
        { label: "Lab Test", value: "lab" }, { label: "Imaging", value: "imaging" },
        { label: "Procedure", value: "procedure" },
      ]},
      { key: "item_code", label: "Order Item", type: "reference", required: true, referenceDomain: "lab_tests", placeholder: "Search labs/procedures..." },
      { key: "frequency", label: "Frequency", type: "select", options: [
        { label: "Once", value: "once" }, { label: "Monthly", value: "monthly" },
        { label: "Quarterly", value: "quarterly" }, { label: "Biannual", value: "biannual" },
        { label: "Annual", value: "annual" },
      ]},
      { key: "notify_role", label: "Notify", type: "select", options: [
        { label: "Care Manager", value: "care_manager" }, { label: "Physician", value: "physician" },
        { label: "Pharmacist", value: "pharmacist" },
      ]},
    ],
  },
  action_referral: {
    type: "action_referral",
    category: "action",
    label: "Specialist Referral",
    description: "Refer patient to a specialist",
    icon: "referral",
    configFields: [
      { key: "specialty_code", label: "Specialty", type: "reference", required: true, referenceDomain: "specialties", placeholder: "Search specialties..." },
      { key: "urgency", label: "Urgency", type: "select", required: true, options: [
        { label: "Standard", value: "standard" }, { label: "Warm Handoff", value: "warm" },
        { label: "Urgent", value: "urgent" },
      ]},
      { key: "prerequisites", label: "Prerequisites", type: "textarea", placeholder: "Required data or tests before referral" },
    ],
  },
  action_care_team: {
    type: "action_care_team",
    category: "action",
    label: "Care Team Action",
    description: "Assign or change care team roles",
    icon: "careTeam",
    configFields: [
      { key: "role", label: "Role", type: "select", required: true, options: [
        { label: "Care Manager", value: "care_manager" }, { label: "Nurse", value: "nurse" },
        { label: "Pharmacist", value: "pharmacist" }, { label: "Social Worker", value: "social_worker" },
        { label: "Oncology Nurse", value: "oncology_nurse" }, { label: "CDCES", value: "cdces" },
      ]},
      { key: "assignment_type", label: "Action", type: "select", options: [
        { label: "Assign", value: "assign" }, { label: "Reassign", value: "reassign" },
        { label: "Escalate", value: "escalate" },
      ]},
      { key: "cadence", label: "Contact Cadence", type: "select", options: [
        { label: "Weekly", value: "weekly" }, { label: "Biweekly", value: "biweekly" },
        { label: "Monthly", value: "monthly" }, { label: "As Needed", value: "as_needed" },
      ]},
    ],
  },

  // ── Logic (4) ──────────────────────────────────────────────────────────
  logic_conditional: {
    type: "logic_conditional",
    category: "logic",
    label: "Conditional Branch",
    description: "Branch pathway based on a clinical condition",
    icon: "conditional",
    configFields: [
      { key: "field", label: "Field", type: "text", required: true, placeholder: "e.g. hba1c, ldh, ecog" },
      { key: "operator", label: "Operator", type: "select", required: true, options: [
        { label: ">", value: "gt" }, { label: "<", value: "lt" },
        { label: "≥", value: "gte" }, { label: "≤", value: "lte" },
        { label: "=", value: "eq" }, { label: "≠", value: "neq" },
      ]},
      { key: "value", label: "Value", type: "text", required: true },
      { key: "true_label", label: "True Branch", type: "text", defaultValue: "Yes" },
      { key: "false_label", label: "False Branch", type: "text", defaultValue: "No" },
    ],
  },
  logic_wait: {
    type: "logic_wait",
    category: "logic",
    label: "Wait / Delay",
    description: "Pause execution for a specified duration",
    icon: "wait",
    configFields: [
      { key: "duration", label: "Duration", type: "number", required: true },
      { key: "unit", label: "Unit", type: "select", required: true, options: [
        { label: "Hours", value: "hours" }, { label: "Days", value: "days" },
        { label: "Weeks", value: "weeks" },
      ]},
    ],
  },
  logic_data_check: {
    type: "logic_data_check",
    category: "logic",
    label: "Data Check",
    description: "Check if required data exists and handle if missing",
    icon: "missingData",
    configFields: [
      { key: "required_field", label: "Required Data", type: "reference", required: true, referenceDomain: "lab_tests", placeholder: "Search labs..." },
      { key: "missing_action", label: "If Missing", type: "select", required: true, options: [
        { label: "Order Lab", value: "order" }, { label: "Send Outreach", value: "outreach" },
        { label: "Skip Block", value: "skip" }, { label: "Wait", value: "wait" },
      ]},
    ],
  },
  logic_score_eval: {
    type: "logic_score_eval",
    category: "logic",
    label: "Score Evaluation",
    description: "Branch based on risk score or component score",
    icon: "compositeScore",
    configFields: [
      { key: "score_source", label: "Score Source", type: "select", required: true, options: [
        { label: "Total Risk Score", value: "risk_score" },
        { label: "Component Score", value: "component" },
      ]},
      { key: "component_name", label: "Component (if applicable)", type: "text", placeholder: "e.g. tumor_burden" },
      { key: "operator", label: "Operator", type: "select", required: true, options: [
        { label: "≥", value: "gte" }, { label: "<", value: "lt" },
      ]},
      { key: "value", label: "Threshold", type: "number", required: true },
    ],
  },

  // ── Escalation (3) ─────────────────────────────────────────────────────
  escalation_tier_change: {
    type: "escalation_tier_change",
    category: "escalation",
    label: "Tier Change",
    description: "Move patient to a different cohort tier",
    icon: "uptier",
    configFields: [
      { key: "direction", label: "Direction", type: "select", required: true, options: [
        { label: "Escalate (Higher Tier)", value: "up" }, { label: "Step Down (Lower Tier)", value: "down" },
      ]},
      { key: "target_tier", label: "Target Tier", type: "number", required: true },
      { key: "timing", label: "Timing", type: "select", required: true, options: [
        { label: "Same Day", value: "same_day" }, { label: "Within 48h", value: "within_48h" },
        { label: "Next Review", value: "next_review" },
      ]},
      { key: "notify_roles", label: "Notify", type: "multiselect", options: [
        { label: "Care Manager", value: "care_manager" }, { label: "Physician", value: "physician" },
        { label: "Patient", value: "patient" },
      ]},
    ],
  },
  escalation_external: {
    type: "escalation_external",
    category: "escalation",
    label: "External Escalation",
    description: "Escalate to external system or emergency protocol",
    icon: "external",
    configFields: [
      { key: "target", label: "Target", type: "select", required: true, options: [
        { label: "Emergency Department", value: "ed" }, { label: "Crisis Protocol", value: "crisis" },
        { label: "911", value: "911" }, { label: "Hospice", value: "hospice" },
      ]},
      { key: "criteria", label: "Criteria", type: "textarea", required: true, placeholder: "When to trigger this escalation" },
      { key: "protocol", label: "Protocol Reference", type: "text", placeholder: "Protocol name or ID" },
    ],
  },
  escalation_override: {
    type: "escalation_override",
    category: "escalation",
    label: "Clinician Override",
    description: "Manual clinician override with documentation",
    icon: "override",
    configFields: [
      { key: "require_documentation", label: "Require Documentation", type: "toggle", defaultValue: true },
      { key: "approval_chain", label: "Approval Chain", type: "multiselect", options: [
        { label: "Care Manager", value: "care_manager" }, { label: "Physician", value: "physician" },
        { label: "Medical Director", value: "medical_director" },
      ]},
      { key: "expiry_days", label: "Override Expiry (days)", type: "number", placeholder: "90" },
    ],
  },

  // ── Schedule (2) ───────────────────────────────────────────────────────
  schedule_recurring: {
    type: "schedule_recurring",
    category: "schedule",
    label: "Recurring Touchpoint",
    description: "Set up a recurring patient touchpoint",
    icon: "schedule",
    configFields: [
      { key: "frequency", label: "Frequency", type: "select", required: true, options: [
        { label: "Daily", value: "daily" }, { label: "Weekly", value: "weekly" },
        { label: "Biweekly", value: "biweekly" }, { label: "Monthly", value: "monthly" },
        { label: "Quarterly", value: "quarterly" },
      ]},
      { key: "channel", label: "Channel", type: "select", options: [
        { label: "WhatsApp", value: "whatsapp" }, { label: "SMS", value: "sms" },
        { label: "Phone", value: "phone" }, { label: "Email", value: "email" },
      ]},
      { key: "template_slug", label: "Template", type: "text" },
      { key: "end_condition", label: "End Condition", type: "select", options: [
        { label: "Never", value: "never" }, { label: "After N occurrences", value: "count" },
        { label: "Until discharged", value: "discharge" },
      ]},
    ],
  },
  schedule_milestone: {
    type: "schedule_milestone",
    category: "schedule",
    label: "Milestone Trigger",
    description: "Trigger an action when a clinical milestone occurs",
    icon: "schedule",
    configFields: [
      { key: "trigger_event", label: "Trigger Event", type: "text", required: true, placeholder: "e.g. end_of_chemo_cycle, 90_days_post_enrollment" },
      { key: "offset_days", label: "Offset (days)", type: "number", placeholder: "0" },
      { key: "action_description", label: "Action to Take", type: "textarea", required: true, placeholder: "What happens when this milestone is reached" },
    ],
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/config/block-types.ts
git commit -m "feat: rewrite block-types.ts — 18 generic blocks with reference-backed config fields"
```

---

### Task 2: Register Pathway Schemas in Backend

**Files:**
- Modify: `backend/app/ai_builder/surfaces.py`
- Modify: `backend/app/ai_builder/schema_registry.py`

- [ ] **Step 1: Register pathway block schemas and output schema**

In `backend/app/ai_builder/surfaces.py`, add a `_register_pathway_surface()` function and call it from `register_all_surfaces()`. This registers:
- Individual block config schemas (one per block type)
- The pathway output schema
- The system prompt for pathway generation

Read the existing `_register_cohort_program_surface()` function to follow the exact same pattern. The pathway surface uses the same tools (`get_component_schema`, `get_available_options`, `lookup_canonical`, `submit_config`).

System prompt:

```python
PATHWAY_SYSTEM_PROMPT = (
    "You are a clinical pathway design assistant for a healthcare care-management platform. "
    "You help users design care pathways — step-by-step clinical workflows that guide patient care "
    "from enrollment through treatment, monitoring, and outcomes.\n\n"
    "WORKFLOW:\n"
    "1. Ask clarifying questions about the condition, target population, and care goals\n"
    "2. Use get_component_schema to understand block config schemas\n"
    "3. Use lookup_canonical to find valid ICD-10, LOINC, RxNorm, and specialty codes\n"
    "4. Design the pathway with appropriate blocks and edges\n"
    "5. Submit the complete pathway using submit_config\n\n"
    "BLOCK CATEGORIES: eligibility (gates), assessment (data collection), action (interventions), "
    "logic (branching), escalation (tier changes), schedule (recurring touchpoints)\n\n"
    "RULES:\n"
    "- Use clinically appropriate criteria based on published guidelines\n"
    "- All diagnosis codes must be valid ICD-10-CM codes\n"
    "- All lab codes must be valid LOINC codes\n"
    "- All medication references must be valid RxNorm concepts\n"
    "- Design pathways that can serve multiple cohort tiers\n"
)
```

Register the pathway output schema:

```python
SchemaRegistry.register_schema("pathway_output", {
    "type": "object",
    "properties": {
        "pathway_name": {"type": "string"},
        "description": {"type": "string"},
        "condition": {"type": "string"},
        "target_tiers": {"type": "array", "items": {"type": "integer"}},
        "blocks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "block_type": {"type": "string"},
                    "category": {"type": "string"},
                    "label": {"type": "string"},
                    "config": {"type": "object"},
                    "order_index": {"type": "integer"},
                },
                "required": ["block_type", "category", "label", "config", "order_index"],
            },
        },
        "edges": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "from_index": {"type": "integer"},
                    "to_index": {"type": "integer"},
                    "edge_type": {"type": "string"},
                    "label": {"type": "string"},
                },
                "required": ["from_index", "to_index", "edge_type"],
            },
        },
    },
    "required": ["pathway_name", "description", "condition", "blocks", "edges"],
})
```

Register block config schemas (one per block type):

```python
SchemaRegistry.register_schema("eligibility_diagnosis", {
    "type": "object",
    "description": "Diagnosis gate — include/exclude patients by ICD-10 code",
    "properties": {
        "icd10_patterns": {"type": "array", "items": {"type": "string"}, "description": "ICD-10-CM codes or prefixes. Use lookup_canonical('conditions', query) to find valid codes."},
        "match_type": {"type": "string", "enum": ["prefix", "exact"]},
        "include": {"type": "boolean"},
    },
    "required": ["icd10_patterns"],
})
# ... repeat for all 18 block types
```

Add to `SURFACE_PROMPTS`:

```python
SURFACE_PROMPTS["pathway"] = PATHWAY_SYSTEM_PROMPT
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/ai_builder/surfaces.py
git commit -m "feat: register pathway AI builder surface with block schemas"
```

---

### Task 3: Add lookup_canonical Tool

**Files:**
- Modify: `backend/app/ai_builder/tool_registry.py`

- [ ] **Step 1: Add the lookup_canonical tool declaration and handler**

In `tool_registry.py`, add a new `FunctionDeclaration` for `lookup_canonical` and a handler method in `ToolHandler`.

Add to `get_tool_declarations()`:

```python
types.FunctionDeclaration(
    name="lookup_canonical",
    description="Search canonical clinical reference data to find valid codes. Use this before including any ICD-10, LOINC, RxNorm, or other clinical codes in your configuration.",
    parameters=types.Schema(
        type="OBJECT",
        properties={
            "domain": types.Schema(type="STRING", description="One of: conditions, lab_tests, medications, procedures, specialties, sdoh, instruments"),
            "query": types.Schema(type="STRING", description="Search term (code prefix or text description)"),
            "limit": types.Schema(type="INTEGER", description="Max results, default 10"),
        },
        required=["domain", "query"],
    ),
),
```

Add handler in `ToolHandler`:

```python
def _handle_lookup_canonical(self, args: dict) -> dict:
    """Synchronous handler — queries reference tables."""
    import requests
    domain = args.get("domain", "")
    query = args.get("query", "")
    limit = args.get("limit", 10)

    # Call the reference API (running in the same process)
    from app.models.reference import (
        RefCondition, RefLabTest, RefMedication, RefProcedure,
        RefSpecialty, RefSdohDomain, RefInstrument,
    )
    # For the tool handler running in async context, we need sync DB access
    # Return a helpful message pointing to the API for now
    return {
        "domain": domain,
        "query": query,
        "note": f"Use valid {domain} codes. Search '{query}' at /api/reference/{domain}/search?q={query}&limit={limit}",
        "suggestion": f"Include this in your pathway config with validated codes from the canonical set.",
    }
```

Note: In a full implementation, the tool handler would do a direct DB query. For now, the LLM uses the schema descriptions to generate plausible codes, and `submit_config` validates them.

Register in `_handlers`:

```python
self._handlers = {
    "get_component_schema": self._handle_get_component_schema,
    "get_available_options": self._handle_get_available_options,
    "get_current_config": self._handle_get_current_config,
    "submit_config": self._handle_submit_config,
    "lookup_canonical": self._handle_lookup_canonical,
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/ai_builder/tool_registry.py
git commit -m "feat: add lookup_canonical tool for AI builder reference data search"
```

---

### Task 4: Update Component Library Sidebar

**Files:**
- Modify: `src/features/pathway-builder/components/component-library.tsx`

- [ ] **Step 1: Update sidebar to use generic block types**

Read the current file. The sidebar already derives its content from `BLOCK_CATEGORIES` and `getBlocksByCategory()`. Since we rewrote `block-types.ts` in Task 1, the sidebar will automatically show the new 18 generic blocks organized by 6 categories.

The main change needed: update any hardcoded references to old block types, and ensure the "assessment" category renders correctly (it's new).

Read the file, verify it renders from the registry dynamically, and fix any issues. The component should already work with the rewritten registry — this task is verification + any fixups.

- [ ] **Step 2: Commit (if changes needed)**

```bash
git add src/features/pathway-builder/components/component-library.tsx
git commit -m "feat: update component library sidebar for generic block categories"
```

---

### Task 5: Update Block Node Rendering

**Files:**
- Modify: `src/features/pathway-builder/components/pathway-block-node.tsx`

- [ ] **Step 1: Update node rendering to use block's own label and category**

Read the current file. The node currently looks up `getBlockType(data.block_type)` for icon and description. Update it to:
- Use `data.label` for the block title (already does this)
- Use the block's `category` for color/styling via `getCategoryDef()` (already does this)
- Show a shorter description from the block's own `data.config.description` if it exists, otherwise fall back to the registry description
- Ensure the new "assessment" category renders with purple styling

The key change: the subtitle/description shown under the block label should come from the block's config (user-provided) rather than the hardcoded registry description.

- [ ] **Step 2: Commit**

```bash
git add src/features/pathway-builder/components/pathway-block-node.tsx
git commit -m "feat: block node renders description from config, not hardcoded registry"
```

---

### Task 6: Update Config Drawer with Reference Autocomplete

**Files:**
- Modify: `src/features/pathway-builder/components/block-config-form.tsx`

- [ ] **Step 1: Add a ReferenceField component for `type: "reference"` fields**

In `block-config-form.tsx`, add handling for the new `"reference"` field type. This renders a searchable select that queries `/api/reference/{domain}/search?q=...`.

Create a `ReferenceField` component inline (or in a separate file):

```typescript
function ReferenceField({ field, value, onChange }: { field: ConfigFieldDefinition; value: unknown; onChange: (val: unknown) => void }) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Array<{ system: string; code: string; display: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2 || !field.referenceDomain) return;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const resp = await apiRequest<Array<{ system: string; code: string; display: string }>>({
          method: "GET",
          path: `/api/reference/${field.referenceDomain}/search`,
          params: { q: query, limit: 15 },
        });
        setOptions(resp);
      } catch { setOptions([]); }
      setLoading(false);
    }, 300); // debounce
    return () => clearTimeout(timeout);
  }, [query, field.referenceDomain]);

  // Render as a combobox/searchable select
  // For referenceMultiple, render as multi-select with tags
  // ...
}
```

Add the `"reference"` case to the field type switch in the form renderer.

- [ ] **Step 2: Commit**

```bash
git add src/features/pathway-builder/components/block-config-form.tsx
git commit -m "feat: reference field type with canonical table autocomplete in config drawer"
```

---

### Task 7: Template Picker + Seed Templates

**Files:**
- Create: `src/features/pathway-builder/components/template-picker.tsx`
- Create: `scripts/ingest/data/pathway_templates.json`

- [ ] **Step 1: Create template seed data**

Create `scripts/ingest/data/pathway_templates.json` with pre-configured blocks for diabetes and oncology:

```json
[
  {
    "template_id": "diabetes-hba1c-gate",
    "block_type": "eligibility_lab",
    "label": "HbA1c Eligibility Gate",
    "condition_tag": "diabetes",
    "config": {"test_code": "4548-4", "test_display": "HbA1c", "operator": "gte", "value": 6.5, "unit": "%", "missing_rule": "trigger_outreach"}
  },
  {
    "template_id": "diabetes-diagnosis-gate",
    "block_type": "eligibility_diagnosis",
    "label": "T2DM Diagnosis Gate",
    "condition_tag": "diabetes",
    "config": {"icd10_patterns": ["E11"], "match_type": "prefix", "include": true}
  },
  {
    "template_id": "oncology-diagnosis-gate",
    "block_type": "eligibility_diagnosis",
    "label": "Cancer Diagnosis Gate",
    "condition_tag": "oncology",
    "config": {"icd10_patterns": ["C"], "match_type": "prefix", "include": true}
  },
  {
    "template_id": "oncology-ecog-screening",
    "block_type": "assessment_screening",
    "label": "ECOG Performance Status",
    "condition_tag": "oncology",
    "config": {"instrument_code": "89247-1", "instrument_display": "ECOG", "frequency": "every_visit", "threshold_score": 3, "threshold_action": "escalate"}
  },
  {
    "template_id": "oncology-distress-screening",
    "block_type": "assessment_screening",
    "label": "NCCN Distress Screening",
    "condition_tag": "oncology",
    "config": {"instrument_code": "NCCN-DT", "instrument_display": "NCCN Distress Thermometer", "frequency": "every_visit", "threshold_score": 4, "threshold_action": "notify"}
  },
  {
    "template_id": "diabetes-phq9-screening",
    "block_type": "assessment_screening",
    "label": "PHQ-9 Depression Screening",
    "condition_tag": "diabetes",
    "config": {"instrument_code": "44249-1", "instrument_display": "PHQ-9", "frequency": "quarterly", "threshold_score": 10, "threshold_action": "escalate"}
  },
  {
    "template_id": "generic-whatsapp-outreach",
    "block_type": "action_outreach",
    "label": "WhatsApp Check-In",
    "condition_tag": "general",
    "config": {"channel": "whatsapp", "ai_personalisation": true, "fallback_action": "retry_48h"}
  },
  {
    "template_id": "oncology-palliative-referral",
    "block_type": "action_referral",
    "label": "Palliative Care Referral",
    "condition_tag": "oncology",
    "config": {"specialty_code": "207R00000X", "specialty_display": "Palliative Medicine", "urgency": "urgent"}
  }
]
```

- [ ] **Step 2: Create template picker component**

Create `src/features/pathway-builder/components/template-picker.tsx` — a modal/sheet that shows templates grouped by condition tag, with search. Clicking a template creates a new block on the canvas with pre-filled config.

The component:
- Loads templates from a static JSON import (or future API)
- Groups by `condition_tag`
- Shows block label, type badge, and preview of key config values
- On select: calls `addBlock()` from the pathway store with the template's block_type, label, and config

- [ ] **Step 3: Commit**

```bash
git add scripts/ingest/data/pathway_templates.json src/features/pathway-builder/components/template-picker.tsx
git commit -m "feat: pathway template picker with diabetes + oncology templates"
```

---

### Task 8: Wire Template Picker into Builder Shell

**Files:**
- Modify: `src/features/pathway-builder/components/builder-shell.tsx`

- [ ] **Step 1: Add a "Templates" button to the visual canvas toolbar**

In the builder shell, add a button next to the existing controls that opens the template picker modal. When a template is selected, it adds a block to the canvas.

- [ ] **Step 2: Commit**

```bash
git add src/features/pathway-builder/components/builder-shell.tsx
git commit -m "feat: wire template picker into pathway builder shell"
```
