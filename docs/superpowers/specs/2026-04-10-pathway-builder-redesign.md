# Pathway Builder Redesign

**Date**: 2026-04-10
**Status**: Approved
**Depends on**: FHIR Reference Data Layer (Spec 1)

## Problem

The pathway builder has 25 hardcoded block types designed for diabetes. Descriptions reference "diabetes diagnosis", lab dropdowns list HbA1c/eGFR, and the sidebar is a fixed menu of condition-specific widgets. This breaks for oncology, cardiology, or any other condition. The AI builder generates against these hardcoded types — if a type doesn't exist, it can't build it.

## Solution

Generic block categories with configurable sub-types, backed by the FHIR reference data layer for all clinical vocabularies. Template library for common patterns per condition. AI builder discovers schemas via tools (mirroring the cohort builder architecture). Full pathway execution engine with cohort linkage and patient-level forks.

---

## Part A: Generic Block System

### Block Categories (6)

Keep existing 5 categories + rename for clarity. Add **Assessment** as a first-class category (currently buried under Actions).

| Category | Colour | Purpose |
|---|---|---|
| **Eligibility** | Green | Gates that determine if a patient enters or continues in the pathway |
| **Assessment** | Purple | Data collection — screenings, instruments, clinical evaluations |
| **Action** | Blue | Things the system does — outreach, orders, referrals, assignments |
| **Logic** | Amber | Flow control — branching, waiting, score evaluation |
| **Escalation** | Red | Tier changes, external escalations, clinician overrides |
| **Schedule** | Cyan | Timing — recurring touchpoints, milestone triggers |

### Generic Block Types (18)

Each block type has a `config_schema` (JSON Schema) that defines what fields the config drawer renders. All clinical reference fields (ICD-10, LOINC, drugs, specialties) are searchable selects backed by the canonical reference tables.

**Eligibility (4):**

| Block Type | Config Fields | Description |
|---|---|---|
| `eligibility_diagnosis` | `icd10_patterns[]`, `match_type` (prefix/exact), `include` (bool) | Match patients by diagnosis code. Patterns search `ref_conditions`. |
| `eligibility_lab` | `test_code` (LOINC from `ref_lab_tests`), `operator`, `value`, `unit`, `missing_rule` | Gate on lab result threshold. |
| `eligibility_demographics` | `rules[]` each with `field` (age/gender/bmi), `operator`, `value` | Demographic inclusion criteria. |
| `eligibility_pharmacy` | `drug_code` (RxNorm from `ref_medications`), `pdc_operator`, `pdc_value`, `active_rx` (bool) | Medication-based eligibility. |

**Assessment (3):**

| Block Type | Config Fields | Description |
|---|---|---|
| `assessment_screening` | `instrument_code` (from `ref_instruments`), `frequency`, `threshold_action` | Administer a screening instrument (PHQ-9, NCCN Distress, ECOG, etc.) |
| `assessment_clinical` | `description`, `required_data[]` (LOINC codes), `assigned_role` | Clinical evaluation step (staging workup, baseline labs, etc.) |
| `assessment_sdoh` | `domains[]` (from `ref_sdoh_domains`), `screening_tool`, `referral_on_positive` | SDOH screening and referral. |

**Action (4):**

| Block Type | Config Fields | Description |
|---|---|---|
| `action_outreach` | `channel`, `template_slug`, `personalisation` (bool), `fallback_action` | Send message via WhatsApp/SMS/phone/email. |
| `action_clinical_order` | `order_type` (lab/imaging/procedure), `item_code` (LOINC/HCPCS from ref tables), `frequency`, `notify_role` | Order a lab, imaging, or procedure. |
| `action_referral` | `specialty_code` (from `ref_specialties`), `urgency`, `prerequisites` | Specialist referral. |
| `action_care_team` | `role`, `assignment_type` (assign/reassign/escalate), `cadence` | Care team role assignment. |

**Logic (4):**

| Block Type | Config Fields | Description |
|---|---|---|
| `logic_conditional` | `field`, `operator`, `value`, `true_label`, `false_label` | Branch pathway based on any clinical field comparison. |
| `logic_wait` | `duration`, `unit` (hours/days/weeks) | Pause execution for specified duration. |
| `logic_data_check` | `required_field` (LOINC code), `missing_action` (order/outreach/skip) | Check if data exists, handle if missing. |
| `logic_score_eval` | `score_source` (risk_score/component_name), `operator`, `value` | Branch based on scoring engine output. |

**Escalation (3):**

| Block Type | Config Fields | Description |
|---|---|---|
| `escalation_tier_change` | `direction` (up/down), `target_tier`, `timing`, `notify_roles[]` | Change patient's cohort tier. |
| `escalation_external` | `target` (ED/crisis/911/hospice), `criteria_description`, `protocol` | External system escalation. |
| `escalation_override` | `require_documentation` (bool), `approval_chain[]`, `expiry_days` | Clinician manual override with audit trail. |

**Schedule (2):**

| Block Type | Config Fields | Description |
|---|---|---|
| `schedule_recurring` | `frequency`, `channel`, `template_slug`, `end_condition` | Recurring touchpoint at defined cadence. |
| `schedule_milestone` | `trigger_event`, `offset_days`, `action_block_ref` | Fire an action when a clinical milestone occurs. |

### How Diabetes and Oncology Use the Same Blocks

| Block | Diabetes Config | Oncology Config |
|---|---|---|
| `eligibility_diagnosis` | `icd10_patterns: ["E11"]` | `icd10_patterns: ["C50", "C34"]` |
| `eligibility_lab` | `test: HbA1c, op: >=, val: 6.5%` | `test: LDH, op: >, val: 250 U/L` |
| `assessment_screening` | `instrument: PHQ-9, freq: quarterly` | `instrument: NCCN Distress, freq: every visit` |
| `action_clinical_order` | `type: lab, item: HbA1c, freq: quarterly` | `type: imaging, item: CT scan, freq: per RECIST` |
| `action_referral` | `specialty: Ophthalmology, urgency: standard` | `specialty: Palliative Care, urgency: urgent` |
| `logic_conditional` | `field: hba1c, op: >, val: 9.0` | `field: ecog, op: >=, val: 3` |
| `escalation_tier_change` | `direction: up, target: Tier 4, timing: same_day` | `direction: up, target: Palliative, timing: 48h` |

---

## Part B: Template Library

Templates are pre-configured block instances stored in `ref_value_sets` or a dedicated `pathway_templates` table. They appear in a picker modal (not the sidebar). The sidebar shows generic categories; the picker shows condition-specific shortcuts.

Templates are just JSON blobs that pre-fill a generic block's config:

```json
{
  "template_id": "diabetes-hba1c-gate",
  "block_type": "eligibility_lab",
  "label": "HbA1c Eligibility Gate",
  "condition_tag": "diabetes",
  "config": {
    "test_code": "4548-4",
    "test_display": "HbA1c",
    "operator": "gte",
    "value": 6.5,
    "unit": "%",
    "missing_rule": "trigger_outreach"
  }
}
```

Seeded per condition. AI builder can also generate templates.

---

## Part C: Schema Registry (Backend)

Mirror the cohort builder's `SchemaRegistry` pattern. Register block config schemas at startup:

```python
SchemaRegistry.register_schema("eligibility_diagnosis", {
    "type": "object",
    "properties": {
        "icd10_patterns": {"type": "array", "items": {"type": "string"}, "description": "ICD-10 code prefixes from ref_conditions"},
        "match_type": {"type": "string", "enum": ["prefix", "exact"]},
        "include": {"type": "boolean"},
    },
    "required": ["icd10_patterns"]
})
```

Each schema references the canonical domain for lookup fields (e.g. `"description": "LOINC code from ref_lab_tests"`). The AI builder uses `get_component_schema` to discover these, then `lookup_canonical` to find valid codes.

---

## Part D: AI Builder Integration

Register a new surface `"pathway"` with:
- System prompt explaining pathway philosophy, block categories, execution model
- Tool declarations: `get_component_schema`, `get_available_options`, `lookup_canonical`, `submit_config`
- Output schema: pathway with blocks + edges

The AI builder generates pathways the same way it generates cohort programs — discovers schemas, looks up canonical codes, submits validated config.

### Pathway Output Schema

```json
{
  "pathway_name": "Oncology Survivorship Pathway",
  "description": "...",
  "condition": "oncology",
  "target_tiers": [1, 2, 3, 4],
  "blocks": [
    {
      "block_type": "eligibility_diagnosis",
      "category": "eligibility",
      "label": "Cancer Diagnosis Verification",
      "config": {"icd10_patterns": ["C"], "match_type": "prefix", "include": true},
      "order_index": 0
    }
  ],
  "edges": [
    {"from_index": 0, "to_index": 1, "edge_type": "success", "label": "Eligible"}
  ]
}
```

---

## Part E: Pathway Execution Engine

### Cohort ↔ Pathway Linkage

```sql
ALTER TABLE cohorts ADD COLUMN pathway_id UUID REFERENCES pathways(id);
```

A cohort links to a pathway. When a patient is assigned to a cohort, they are enrolled in the cohort's pathway. When a patient migrates cohorts, they transition pathways.

### Execution State (per patient)

```sql
CREATE TABLE pathway_enrollments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    pathway_id      UUID NOT NULL REFERENCES pathways(id) ON DELETE CASCADE,
    cohort_id       UUID REFERENCES cohorts(id),
    fork_id         UUID REFERENCES pathway_patient_forks(id),  -- null if standard
    status          TEXT NOT NULL DEFAULT 'active',              -- active | completed | paused | exited
    current_block_id UUID REFERENCES pathway_blocks(id),
    enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_enrollment_patient_pathway UNIQUE (patient_id, pathway_id)
);

CREATE TABLE pathway_block_executions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id   UUID NOT NULL REFERENCES pathway_enrollments(id) ON DELETE CASCADE,
    block_id        UUID NOT NULL REFERENCES pathway_blocks(id),
    status          TEXT NOT NULL DEFAULT 'pending',     -- pending | in_progress | completed | skipped | failed
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    result          JSONB,                               -- outcome data from block execution
    error           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Execution Flow

The pathway engine is a background worker (like the cohortisation worker):

1. Poll `pathway_enrollments` where `status = 'active'`
2. For each enrollment, get `current_block_id`
3. If current block is completed → find next block via edges
4. Evaluate next block:
   - **Eligibility** → check patient data against config, pass/fail
   - **Assessment** → create assessment task, mark in_progress, wait for completion
   - **Action** → execute action (send outreach, create order, etc.), mark completed
   - **Logic** → evaluate condition, follow true/false edge
   - **Escalation** → trigger tier change via cohortisation events
   - **Schedule** → create scheduled task, mark in_progress
5. Record execution in `pathway_block_executions`
6. Update `current_block_id` to next block

---

## Part F: Patient Pathway Forks

### DB Model

```sql
CREATE TABLE pathway_patient_forks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pathway_id      UUID NOT NULL REFERENCES pathways(id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id),
    reason          TEXT NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_fork_patient_pathway UNIQUE (patient_id, pathway_id)
);

CREATE TABLE pathway_block_overrides (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fork_id         UUID NOT NULL REFERENCES pathway_patient_forks(id) ON DELETE CASCADE,
    block_id        UUID REFERENCES pathway_blocks(id),  -- null for ADD type
    override_type   TEXT NOT NULL,                         -- 'config' | 'skip' | 'add'
    config_override JSONB,                                 -- merged over parent config
    label           TEXT,                                  -- for ADD blocks
    block_type      TEXT,                                  -- for ADD blocks
    category        TEXT,                                  -- for ADD blocks
    order_after     UUID REFERENCES pathway_blocks(id),   -- insert after this block (for ADD)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Merge Logic

When the execution engine processes a patient with a fork:

1. Load parent pathway blocks
2. Load fork overrides
3. For each block:
   - If override_type = `skip` → skip this block
   - If override_type = `config` → deep merge `config_override` over block's config
   - If override_type = `add` → insert new block after `order_after`
4. Execute the merged block list

### Patient Detail UI

In the Pathways tab of patient detail:
- Shows the merged pathway (parent + fork)
- Overridden blocks have an orange indicator
- Added blocks have a "Custom" badge
- Skipped blocks shown greyed with strikethrough
- "Customise Pathway" button creates a fork
- "Reset to Standard" deletes the fork
- Config drawer shows both parent config (read-only) and override config (editable)

---

## Visual Canvas — No Changes to Layout

The visual canvas (React Flow) stays exactly as-is:
- Left sidebar: shows block categories (not hardcoded block types — categories with generic sub-types)
- Center: React Flow canvas with drag-and-drop
- Right: Config drawer with dynamic form fields

What changes:
- Sidebar content: populated from schema registry, not `BLOCK_TYPE_REGISTRY`
- Block node rendering: uses block's `label` and `category` for display, not registry lookup for description
- Config drawer: renders form fields from the block's `config_schema`, not from hardcoded `configFields`
- Dropdown fields: query `/api/reference/{domain}/search` for autocomplete

---

## File Inventory

| File | Action | Purpose |
|---|---|---|
| `src/config/block-types.ts` | Rewrite | Generic block types with config schemas, remove hardcoded descriptions |
| `backend/app/ai_builder/surfaces.py` | Modify | Register `pathway` surface with schemas |
| `backend/app/ai_builder/tool_registry.py` | Modify | Add `lookup_canonical` tool |
| `backend/app/models/pathway.py` | Modify | Add `pathway_enrollments`, `pathway_block_executions`, fork tables |
| `backend/app/models/cohort.py` | Modify | Add `pathway_id` to Cohort |
| `backend/app/workers/pathway_worker.py` | Create | Pathway execution engine |
| `backend/app/services/pathway_execution.py` | Create | Block execution logic |
| `backend/app/routers/pathways.py` | Modify | Add fork CRUD, enrollment endpoints |
| `src/features/pathway-builder/components/component-library.tsx` | Modify | Dynamic sidebar from schema registry |
| `src/features/pathway-builder/components/pathway-block-node.tsx` | Modify | Render from block data, not registry |
| `src/features/pathway-builder/components/block-config-form.tsx` | Modify | Dynamic form from config schema |
| `src/features/pathway-builder/components/config-drawer.tsx` | Modify | Reference table autocomplete |
| `src/features/pathway-builder/components/template-picker.tsx` | Create | Condition-specific template picker modal |
| `src/features/patients/components/pathway-fork-editor.tsx` | Create | Patient-level fork UI in detail page |
| `scripts/ingest/data/pathway_templates.json` | Create | Seed templates for diabetes + oncology |
