# Risk Engine + Action System — Design Spec

## Overview

Build the score computation engine, action generation system, and actionable AI insights for the Bradesco Care Admin platform. This turns the command center from decorative into operational — every number drives a decision, every recommendation has a button.

## Scope: NOW (this spec)

### 1. PostgreSQL Migration
- Switch from SQLite (`aiosqlite`) to PostgreSQL (`asyncpg`)
- Same schema, different engine
- Azure-ready config pattern (local now, Azure later)
- Data re-seeded from existing seed scripts

### 2. Score Computation Engine
- Stateless service: `compute_patient_score(db, patient_id, program_id) → {score, breakdown, tier}`
- Reads `ScoringEngine.components` config from DB
- Evaluates against patient's actual data (labs, diagnoses, medications, SDOH flags)
- Caches result on `Patient.risk_score` + `Patient.risk_score_updated_at`
- Detailed breakdown stored on `CohortAssignment.score_breakdown`
- Exposed on patient list API → visible as a column in patients table

### 3. Action Generation Engine
- `ActionTemplate` table — tied to program/cohort, defines what gaps generate what actions
- `PatientAction` table — instance per patient, status lifecycle (open → in_progress → resolved → dismissed)
- Stateless service: `generate_patient_actions(db, patient_id, program_id) → [PatientAction]`
- Resolution options stored as typed JSON config on ActionTemplate
- Phase 1: navigate + dismiss + send_outreach (via existing comms)
- Schema supports Phase 2: orchestrated flows (provider directory, scheduling APIs)

### 4. Actionable AI Insights
- Population Insights returns structured recommendations alongside markdown narrative
- Each recommendation has action buttons (view filtered patient list, trigger bulk outreach)
- Command center action queue reads from PatientAction table (real data, not random seed)

---

## Database Changes

### New columns on `patients`
```sql
risk_score          REAL            -- cached CRS (0-100), null if never computed
risk_score_updated_at TIMESTAMPTZ  -- when the score was last computed
```

### New table: `action_templates`
```sql
CREATE TABLE action_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    program_id      UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    
    -- What triggers this action
    name            VARCHAR(200) NOT NULL,
    trigger_type    VARCHAR(50) NOT NULL,   -- care_gap | lab_overdue | score_threshold | cohort_change
    trigger_config  JSONB NOT NULL,         -- e.g. {"gap_type": "eye_exam", "max_interval_days": 365}
    
    -- Which cohorts this applies to (null = all cohorts in program)
    cohort_ids      JSONB,                  -- array of cohort UUIDs, null = all
    
    -- Action definition
    priority_base   INTEGER NOT NULL DEFAULT 50,    -- base priority (0-100)
    score_weight    REAL NOT NULL DEFAULT 0.3,      -- how much patient score affects priority
    title_template  TEXT NOT NULL,                   -- "Schedule {gap_type} for {patient_name}"
    description_template TEXT,                       -- "Last exam {days_since} days ago"
    
    -- Resolution options
    resolution_options JSONB NOT NULL,      -- array of resolution option configs
    
    -- Metadata
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### New table: `patient_actions`
```sql
CREATE TABLE patient_actions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    template_id     UUID NOT NULL REFERENCES action_templates(id) ON DELETE CASCADE,
    program_id      UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    cohort_id       UUID REFERENCES cohorts(id) ON DELETE SET NULL,
    
    -- Computed fields
    priority        INTEGER NOT NULL,       -- computed: priority_base + (risk_score × score_weight)
    title           TEXT NOT NULL,           -- resolved from template
    description     TEXT,                    -- resolved from template
    
    -- Lifecycle
    status          VARCHAR(20) NOT NULL DEFAULT 'open',  -- open | in_progress | resolved | dismissed
    assigned_to     VARCHAR(150),           -- care manager name (from patient.assigned_to)
    
    -- Resolution
    resolved_at     TIMESTAMPTZ,
    resolved_by     UUID REFERENCES users(id),
    resolution_type VARCHAR(50),            -- which resolution option was used
    resolution_note TEXT,                   -- reason for dismiss, etc.
    
    -- Context
    trigger_data    JSONB,                  -- snapshot of what triggered this (e.g. last_exam_date)
    resolution_options JSONB NOT NULL,      -- copy of template options with patient context resolved
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_actions_status ON patient_actions(tenant_id, status, priority DESC);
CREATE INDEX idx_patient_actions_patient ON patient_actions(patient_id, status);
```

### Resolution Option Schema (JSONB)
```json
{
  "label": "Send Reminder",
  "action_type": "send_outreach",       // navigate | send_outreach | dismiss | orchestrated_flow
  "icon": "send",                        // icon key from Icons config
  "channel": "whatsapp",                 // for send_outreach
  "template_slug": "eye_exam_reminder",  // for send_outreach
  "navigate_to": "patient_detail",       // for navigate
  "navigate_tab": "communications",      // for navigate
  "requires_reason": false,              // for dismiss
  "flow_steps": []                       // for orchestrated_flow (Phase 2)
}
```

---

## Service Contracts

### Score Computation
```python
async def compute_patient_score(
    db: AsyncSession,
    tenant_id: UUID,
    patient_id: UUID,
    program_id: UUID,
) -> dict:
    """
    Returns: {
        "score": 42.5,
        "tier": "Tier 2 — Diabetes Wellness",
        "cohort_id": "...",
        "breakdown": {
            "glycaemic_control": {"raw": 40, "weighted": 12.0},
            "complication_burden": {"raw": 25, "weighted": 7.5},
            ...
        }
    }
    """
```

**Logic:**
1. Load program's ScoringEngine (components + weights)
2. For each component, evaluate patient data:
   - `lab_range` → query patient_labs for latest value, match against scoring_table
   - `diagnosis_match` → query patient_diagnoses, sum applicable points
   - `pharmacy_adherence` → read patient.active_medications PDC values
   - `utilisation` → (stub for now — no encounter table yet, use care_gaps as proxy)
   - `sdoh` → read patient.sdoh_flags, count high-risk domains
3. Compute weighted sum: `CRS = Σ(component_raw × weight / 100)`
4. Apply cap per component
5. Match CRS to cohort score ranges → determine tier
6. Apply override rules (tiebreakers)
7. Cache score on Patient row
8. Return score + breakdown

### Action Generation
```python
async def generate_patient_actions(
    db: AsyncSession,
    tenant_id: UUID,
    patient_id: UUID,
    program_id: UUID,
) -> list[dict]:
    """
    Returns list of generated PatientAction dicts (not yet persisted).
    Caller decides whether to persist (avoids duplicates).
    """
```

**Logic:**
1. Load all active ActionTemplates for the program
2. For each template, evaluate trigger against patient data:
   - `care_gap` → check patient.care_gaps array for matching gap_type
   - `lab_overdue` → check patient_labs for latest date vs max_interval_days
   - `score_threshold` → check patient.risk_score vs threshold
   - `cohort_change` → (deferred to job worker)
3. If triggered, resolve title/description templates with patient data
4. Compute priority: `priority_base + (patient.risk_score × score_weight)`
5. Check for existing open action with same template+patient (avoid duplicates)
6. Return action dicts ready for persistence

### Assignment (existing, enhanced)
```python
async def assign_patient_to_cohort(
    db: AsyncSession,
    tenant_id: UUID,
    patient_id: UUID,
    program_id: UUID,
    score_result: dict,  # from compute_patient_score
) -> CohortAssignment:
    """Uses score result to create/update cohort assignment."""
```

---

## API Endpoints

### Score
- `POST /api/patients/{id}/compute-score` — compute and cache score for one patient (manual trigger)
- `POST /api/programs/{id}/compute-scores` — batch compute for all patients (manual trigger, for testing)

### Actions
- `GET /api/actions?status=open&limit=20` — list actions (for command center)
- `PATCH /api/actions/{id}` — update action status (resolve, dismiss, assign)
- `POST /api/actions/{id}/execute` — execute a resolution option (Phase 1: just updates status + sends outreach)

### Action Templates (CRUD)
- `GET /api/programs/{id}/action-templates` — list templates for a program
- `POST /api/programs/{id}/action-templates` — create template
- `PATCH /api/programs/{id}/action-templates/{tid}` — update template
- `DELETE /api/programs/{id}/action-templates/{tid}` — delete template

### AI Insights (enhanced)
- `POST /api/command-center/insights` — now returns `{markdown, recommendations: [{title, action_type, params}]}`

---

## Frontend Changes

### Patients Table
- Add "Risk Score" column between "Care Gaps" and "Last Contact"
- Color-coded using existing `scoreColor()` from status.ts
- Sortable (future: add sort param to API)

### Command Center Action Queue
- Reads from `GET /api/actions?status=open` instead of current hardcoded seed
- Each action renders resolution buttons
- Phase 1: buttons navigate to patient detail with tab context
- Dismiss opens a reason input dialog

### Cohort Builder — Action Templates Tab
- New sub-tab "Action Templates" in the program editor
- Table view of templates with create/edit via right-side sheet
- Template editor: trigger type, config, title template, description template, resolution options

---

## Config Pattern (Azure-ready)

```env
# .env.local (local development)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/bradesco_care_admin

# .env.production (Azure — filled by devops)
DATABASE_URL=postgresql+asyncpg://${AZURE_PG_USER}:${AZURE_PG_PASS}@${AZURE_PG_HOST}:5432/${AZURE_PG_DB}?ssl=require

# Other Azure services (future)
AZURE_STORAGE_CONNECTION_STRING=
AZURE_SERVICE_BUS_CONNECTION_STRING=
AZURE_REDIS_URL=
```

---

## Implementation Phases

### Phase 1 (this implementation cycle)
1. PostgreSQL migration
2. Score computation engine (service + API + patient table column)
3. ActionTemplate + PatientAction models
4. Action generation engine (service + API)
5. Command center wired to real actions
6. Diabetes program action templates seeded

### Phase 2 (next cycle — with job worker)
- Background job worker system
- Orchestrated resolution flows (provider directory, scheduling APIs)
- Automated score recomputation on data changes
- Automated action generation on cohort changes

### Phase 3 (future)
- AI Insights structured recommendations with bulk action buttons
- Action analytics dashboard
