# Cohort System Redesign — Generic Programs, Cohorts, Scoring Engine

**Status:** Design approved, pending implementation plan  
**Scope:** Replace Phase 4 cohortisation (diabetes-specific CRS) with a generic, production-grade cohort system  
**Phases:** 4A (Backend foundation + engine), 4B (Cohort Builder UI), 4C (Pathway integration + Docker)

---

## 1. Core Concepts

### 1.1 Mental Model

- **Program** — A top-level container representing a care management initiative (e.g., "Diabetes Care", "Heart Failure Management"). Owns a scoring engine and a set of cohorts.
- **Cohort** — A named population segment within a program. Defined by eligibility criteria (AND/OR composition). Patients are assigned to cohorts either by the scoring engine or by direct criteria matching. Each cohort has its own review cadence, color, and linked pathways.
- **Scoring Engine** — An optional, program-level automation layer. Evaluates patients against weighted scoring components, computes a composite risk score, and assigns patients to cohorts based on score thresholds. The diabetes CRS is one instance.
- **Cohortisation Engine** — A persistent background service that processes cohortisation events. When new patient data arrives (lab result, diagnosis, claim, PDC change), the engine re-scores affected patients and updates their cohort assignments. Always on, event-driven.

### 1.2 Relationships

```
Program (1) ──── (N) Cohort
Program (1) ──── (0..1) ScoringEngine
Cohort  (1) ──── (N) CohortCriteria (AND/OR groups)
Cohort  (1) ──── (N) CohortAssignment (audit log)
Cohort  (N) ──── (N) Pathway (via eligibility block reference)
Program      ──── versioned (CohortVersion tracks snapshots)
```

### 1.3 Key Design Decisions

- **Tiers ARE cohorts.** No separate tier model. What was "Tier 0-4" becomes 5 cohorts within the Diabetes Care program.
- **Scoring engine is optional.** A program can have cohorts without a scoring engine (criteria-only assignment).
- **Criteria use AND/OR composition.** Same rule types as pathway eligibility blocks (diagnosis, lab, demographics, pharmacy, utilisation, SDOH, PRO, exclusion) but with nested boolean logic.
- **Live reference with versioning.** Pathways reference a specific cohort version. Cohort updates create new versions. Pathways can be upgraded to the latest version explicitly.
- **Event-driven cohortisation.** The engine runs as an async background worker. Patient data changes emit events that trigger re-scoring for affected patients.
- **Generic abstractions.** No diabetes-specific code in the engine. The diabetes CRS is a seeded program configuration, not hardcoded logic.

---

## 2. Database Models

### 2.1 New Tables

```
programs
  id: UUID PK
  tenant_id: UUID FK → tenants.id
  name: String(200)
  slug: String(100)
  condition: String(100) NULLABLE        -- "diabetes", "heart_failure", etc. (nullable = generic)
  description: Text NULLABLE
  status: String(20) DEFAULT "draft"     -- "draft" | "active" | "archived"
  version: Integer DEFAULT 1
  published_at: DateTime NULLABLE
  published_by: UUID FK → users.id NULLABLE
  created_by: UUID FK → users.id
  created_at, updated_at: TimestampMixin
  UNIQUE(tenant_id, slug)

program_versions
  id: UUID PK
  program_id: UUID FK → programs.id
  version: Integer
  snapshot: JSON                          -- full serialised program state at time of publish
  published_at: DateTime
  published_by: UUID FK → users.id
  created_at: TimestampMixin

cohorts
  id: UUID PK
  tenant_id: UUID FK → tenants.id
  program_id: UUID FK → programs.id
  name: String(200)                       -- "Prevention Program", "Advanced Diabetes Care"
  slug: String(100)
  description: Text NULLABLE
  color: String(7)                        -- hex color for UI
  sort_order: Integer DEFAULT 0           -- display order within program
  review_cadence_days: Integer            -- 7, 30, 90, 180, 365
  score_range_min: Integer NULLABLE       -- if scoring engine active: min CRS for this cohort
  score_range_max: Integer NULLABLE       -- if scoring engine active: max CRS for this cohort
  member_count: Integer DEFAULT 0         -- denormalised, updated by engine
  is_active: Boolean DEFAULT true
  created_at, updated_at: TimestampMixin
  UNIQUE(tenant_id, program_id, slug)

cohort_criteria
  id: UUID PK
  cohort_id: UUID FK → cohorts.id
  parent_group_id: UUID FK → cohort_criteria.id NULLABLE  -- for nested groups
  group_operator: String(3) NULLABLE      -- "AND" | "OR" (only for group nodes)
  rule_type: String(50) NULLABLE          -- "diagnosis" | "lab" | "demographics" | "pharmacy" | "utilisation" | "sdoh" | "pro" | "exclusion" (only for leaf nodes)
  config: JSON NULLABLE                   -- rule configuration (same schema as pathway eligibility block configs)
  sort_order: Integer DEFAULT 0
  created_at: TimestampMixin

scoring_engines
  id: UUID PK
  tenant_id: UUID FK → tenants.id
  program_id: UUID FK → programs.id UNIQUE
  components: JSON                        -- [{name, label, weight, cap, data_source, scoring_table, bonus_table}]
  tiebreaker_rules: JSON                  -- [{priority, rule, condition, action, ...}]
  aggregation_method: String(20) DEFAULT "weighted_sum"  -- "weighted_sum" | "max" | "custom"
  is_active: Boolean DEFAULT true
  created_at, updated_at: TimestampMixin

cohort_assignments
  id: UUID PK
  tenant_id: UUID FK → tenants.id
  patient_id: UUID FK → patients.id
  program_id: UUID FK → programs.id
  cohort_id: UUID FK → cohorts.id
  score: Integer NULLABLE                 -- composite risk score (null if no scoring engine)
  score_breakdown: JSON NULLABLE          -- {component_name: {raw, weighted}, ...}
  assignment_type: String(20)             -- "engine" | "criteria" | "manual" | "override"
  assigned_by: UUID FK → users.id NULLABLE
  reason: Text NULLABLE                   -- tiebreaker rule description or manual override reason
  previous_cohort_id: UUID FK → cohorts.id NULLABLE
  is_current: Boolean DEFAULT true
  assigned_at: DateTime
  review_due_at: DateTime NULLABLE
  created_at: TimestampMixin
  INDEX(tenant_id, patient_id, program_id, is_current)

cohortisation_events
  id: UUID PK
  tenant_id: UUID FK → tenants.id
  patient_id: UUID FK → patients.id
  event_type: String(50)                  -- "lab_result" | "diagnosis_added" | "claim_processed" | "pdc_updated" | "manual_trigger" | "bulk_recalculate"
  event_data: JSON NULLABLE               -- trigger-specific payload
  status: String(20) DEFAULT "pending"    -- "pending" | "processing" | "completed" | "failed"
  processed_at: DateTime NULLABLE
  error: Text NULLABLE
  created_at: TimestampMixin
  INDEX(tenant_id, status, created_at)
```

### 2.2 Modified Tables

```
patients
  -- REMOVE: tier (Integer), crs_score (Integer), crs_breakdown (JSON)
  -- These are replaced by cohort_assignments lookups
  -- ADD: nothing — patient is clean, cohort membership lives in cohort_assignments

pathway_blocks (eligibility blocks only)
  -- config JSON gains optional field:
  config.cohort_reference: {
    cohort_id: UUID,
    program_version: Integer    -- pinned version
  } | null
  -- When set, the block's criteria come from the referenced cohort
  -- When null, the block uses its own inline config (existing behaviour)
```

### 2.3 Tables to Remove

```
crs_configs                              -- replaced by scoring_engines
```

### 2.4 Migration Strategy

The existing `crs_configs` table data migrates into:
- One `programs` row ("Diabetes Care")
- Five `cohorts` rows (one per former tier)
- One `scoring_engines` row (the CRS formula)
- `cohort_criteria` rows derived from the tier threshold prerequisites
- Existing `cohort_assignments` rows get `program_id` and `cohort_id` backfilled

The `Patient.tier` / `Patient.crs_score` / `Patient.crs_breakdown` columns are dropped after migration. All queries use `cohort_assignments` with `is_current=True`.

---

## 3. Backend Architecture

### 3.1 Project Structure (new/modified files)

```
backend/
  app/
    models/
      program.py                          -- Program, ProgramVersion
      cohort.py                           -- Cohort, CohortCriteria (REPLACE existing)
      scoring_engine.py                   -- ScoringEngine
      cohort_assignment.py                -- CohortAssignment (REPLACE existing)
      cohort_event.py                     -- CohortisationEvent

    schemas/
      program.py                          -- Pydantic schemas for program CRUD
      cohort.py                           -- Pydantic schemas for cohort CRUD (REPLACE)
      scoring_engine.py                   -- Pydantic schemas for scoring engine

    routers/
      programs.py                         -- /api/programs/* (NEW)
      cohortisation.py                    -- /api/cohortisation/* (REWORK)

    services/
      program_service.py                  -- Program CRUD + versioning
      cohort_service.py                   -- Cohort CRUD + criteria management (REWORK)
      scoring_engine_service.py           -- Scoring engine CRUD + calculation
      cohortisation_engine.py             -- Background worker: event processing, scoring, assignment
      criteria_evaluator.py               -- Generic criteria evaluation (AND/OR tree)
      seed_service.py                     -- Updated to seed programs/cohorts/engine

    engine/
      base.py                             -- Abstract base for scoring components
      component_registry.py               -- Registry of scoring component types
      components/
        lab_range.py                       -- Lab-based scoring (HbA1c, eGFR, etc.)
        diagnosis_match.py                 -- Diagnosis-based scoring (ICD-10 matching)
        pharmacy_adherence.py              -- PDC-based scoring
        utilisation.py                     -- ER/hospitalisation scoring
        sdoh.py                            -- SDOH domain counting
      aggregators/
        weighted_sum.py                    -- Default: weighted sum of component scores
      tiebreakers.py                       -- Tiebreaker rule evaluation

    workers/
      cohortisation_worker.py             -- Async background task: polls cohortisation_events, processes them
      event_emitter.py                    -- Helper to emit cohortisation events from other services

  Dockerfile                              -- Backend Docker image
  docker-compose.yml                      -- Backend + Frontend + shared network
```

### 3.2 Scoring Engine Architecture

The scoring engine is generic. Components are pluggable via a registry pattern.

```python
# engine/base.py
class ScoringComponent(ABC):
    """Base class for all scoring components."""

    @abstractmethod
    def score(self, patient_data: PatientData, config: dict) -> int:
        """Evaluate patient data against this component's config.
        Returns raw score (0 to cap)."""
        ...

class Aggregator(ABC):
    """Combines component scores into a final score."""

    @abstractmethod
    def aggregate(self, component_scores: dict[str, ComponentResult], config: dict) -> int:
        """Returns final composite score (0-100)."""
        ...

# engine/component_registry.py
COMPONENT_REGISTRY: dict[str, type[ScoringComponent]] = {
    "lab_range": LabRangeComponent,
    "diagnosis_match": DiagnosisMatchComponent,
    "pharmacy_adherence": PharmacyAdherenceComponent,
    "utilisation": UtilisationComponent,
    "sdoh": SDOHComponent,
}

AGGREGATOR_REGISTRY: dict[str, type[Aggregator]] = {
    "weighted_sum": WeightedSumAggregator,
}
```

Each scoring component in the JSON config specifies a `data_source` key that maps to a registered component type. The engine instantiates the right component, passes the config, and collects scores.

### 3.3 Criteria Evaluator

Evaluates AND/OR criterion trees against patient data. Used by both cohort criteria matching and the scoring engine's tiebreaker rules.

```python
# services/criteria_evaluator.py

def evaluate_criteria_tree(
    root_criteria: list[CohortCriteria],
    patient: Patient,
    labs: list[PatientLab],
    diagnoses: list[PatientDiagnosis],
) -> bool:
    """Recursively evaluate an AND/OR criteria tree.
    Returns True if the patient matches."""
```

Rule type evaluators are registered (same pattern as scoring components):

```python
RULE_EVALUATORS: dict[str, Callable] = {
    "diagnosis": evaluate_diagnosis_rule,
    "lab": evaluate_lab_rule,
    "demographics": evaluate_demographics_rule,
    "pharmacy": evaluate_pharmacy_rule,
    "utilisation": evaluate_utilisation_rule,
    "sdoh": evaluate_sdoh_rule,
    "pro": evaluate_pro_rule,
    "exclusion": evaluate_exclusion_rule,
}
```

### 3.4 Cohortisation Engine (Background Worker)

The cohortisation engine runs as an async background task within the FastAPI process (upgradeable to Celery/ARQ later). It processes events from the `cohortisation_events` table.

**Event flow:**

```
Patient data change (new lab, diagnosis, claim)
  → event_emitter.emit("lab_result", patient_id, {...})
    → INSERT into cohortisation_events (status="pending")

Cohortisation Worker (polling loop, 5s interval)
  → SELECT pending events, batch of 50
  → For each event:
    1. Load patient with labs, diagnoses, medications
    2. For each active program in tenant:
       a. Evaluate program's cohort criteria → which cohorts match?
       b. If scoring engine active: score patient → map score to cohort
       c. Apply tiebreaker rules
       d. Compare with current assignment → if changed, create new assignment
    3. Mark event as completed
  → Commit batch
```

**Startup:**

```python
# app/main.py lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ... existing startup ...
    # Start cohortisation worker
    worker_task = asyncio.create_task(cohortisation_worker.run())
    yield
    worker_task.cancel()
```

**Bulk recalculation:**

```
POST /api/cohortisation/recalculate
  → Emits one "bulk_recalculate" event per patient (or per batch)
  → Worker processes them through the same pipeline
  → Response returns job_id for polling status
```

### 3.5 API Routes

```
# Programs
GET    /api/programs                          -- List programs for tenant
POST   /api/programs                          -- Create program
GET    /api/programs/:id                      -- Get program with cohorts + engine summary
PATCH  /api/programs/:id                      -- Update program metadata
POST   /api/programs/:id/publish              -- Publish new version (snapshots state)
GET    /api/programs/:id/versions             -- List versions
GET    /api/programs/:id/versions/:version    -- Get specific version snapshot

# Cohorts (nested under program)
GET    /api/programs/:id/cohorts              -- List cohorts for program
POST   /api/programs/:id/cohorts              -- Create cohort
GET    /api/programs/:id/cohorts/:cid         -- Get cohort with criteria
PATCH  /api/programs/:id/cohorts/:cid         -- Update cohort
DELETE /api/programs/:id/cohorts/:cid         -- Delete cohort

# Cohort Criteria
GET    /api/programs/:id/cohorts/:cid/criteria       -- Get criteria tree
PUT    /api/programs/:id/cohorts/:cid/criteria       -- Replace criteria tree (atomic)

# Scoring Engine
GET    /api/programs/:id/engine               -- Get scoring engine config
PUT    /api/programs/:id/engine               -- Create/update scoring engine
DELETE /api/programs/:id/engine               -- Remove scoring engine

# Cohortisation Operations
GET    /api/cohortisation/dashboard           -- Population dashboard data (cross-program)
POST   /api/cohortisation/recalculate         -- Trigger bulk recalculation
GET    /api/cohortisation/assignments         -- Paginated assignment log (filterable by program/cohort)
GET    /api/cohortisation/events              -- Event processing status/history
GET    /api/patients/:id/cohort-assignments   -- Patient's cohort membership across programs
```

---

## 4. Frontend Architecture

### 4.1 New/Modified Files

```
src/
  app/dashboard/
    cohortisation/
      page.tsx                             -- Population Dashboard (REWORK)
      builder/
        page.tsx                           -- Program list
        [id]/page.tsx                      -- Cohort Builder (AI + Config modes)

  features/
    cohortisation/
      components/
        population-dashboard.tsx           -- KPI strip + program cards + risk pool table
        program-card.tsx                   -- Program summary card with cohort distribution bar
        risk-pool-table.tsx                -- Filterable member table

    cohort-builder/
      components/
        builder-shell.tsx                  -- Top bar + mode toggle (mirrors pathway builder)
        ai-builder.tsx                     -- AI chat for cohort creation (mirrors pathway AI)
        cohort-cards.tsx                   -- Grid of cohort cards within program
        cohort-detail-drawer.tsx           -- Drawer: edit cohort criteria + metadata
        criteria-editor.tsx                -- AND/OR criteria tree builder
        criteria-rule-form.tsx             -- Per-rule-type config form
        scoring-engine-panel.tsx           -- Card-based scoring component builder
        scoring-component-drawer.tsx       -- Drawer: edit scoring rules for one component
        override-rules-panel.tsx           -- Tiebreaker rules editor
        linked-pathways-panel.tsx          -- Pathways referencing this program's cohorts
        population-preview.tsx             -- Live preview: run criteria against population

    pathway-builder/
      components/
        block-config-form.tsx              -- MODIFY: eligibility blocks get "Config | Cohort" toggle
        cohort-picker.tsx                  -- NEW: dropdown to select from saved cohorts

  stores/
    cohortisation-store.ts                 -- REWORK: programs, cohorts, dashboard data
    cohort-builder-store.ts                -- NEW: builder state (selected program, editing state, AI chat)

  services/
    api/
      programs.ts                          -- NEW: program CRUD API
      cohortisation.ts                     -- REWORK: dashboard, assignments, recalculate
    types/
      program.ts                           -- NEW: Program, Cohort, ScoringEngine types
      cohort.ts                            -- REWORK: assignment types, dashboard types

  config/
    api.ts                                 -- ADD: /api/programs/* endpoints
    rule-types.ts                          -- NEW: criteria rule type registry (mirrors backend)
```

### 4.2 Population Dashboard (Page 1)

**Route:** `/dashboard/cohortisation`

**Layout:**
- KPI strip: Total members, Active programs, Unassigned members, Pending re-score
- Program cards grid: Each card shows program name, status, cohort count, member count, stacked distribution bar with cohort colors and labels. Click → navigate to builder.
- "+ Create Program" card
- Risk Pool table: All members, filterable by program/cohort/search. Columns: Patient, Program, Cohort, Score, Assigned date, Review due date.

### 4.3 Cohort Builder (Page 2)

**Route:** `/dashboard/cohortisation/builder/:id`

**Top bar:** Program name + status badge | Mode toggle (AI Builder | Configuration) | Save Draft + Publish buttons

**AI Builder mode:**
- Same DNA as pathway AI builder
- Template prompts (e.g., "Diabetes 5-tier program", "Heart failure 3-tier", "Simple age-based cohort")
- Chat interface with history sidebar
- AI generates: program metadata + cohort definitions + optional scoring engine config
- "Accept" loads into Configuration mode

**Configuration mode tabs:**
1. **Cohorts** — Card grid showing each cohort (name, color, criteria summary, member count, CRS range, linked pathway). Click "Edit" → drawer with criteria editor + metadata.
2. **Scoring Engine** — Card-based component builder. Each component card shows name, data source, weight bar, rule count. Click → drawer with scoring rules table. + Add Component card. Weight total indicator.
3. **Override Rules** — Tiebreaker rules table (priority, rule, action). Add/edit/reorder.
4. **Linked Pathways** — Read-only list of pathways referencing this program's cohorts, with version info.

### 4.4 Criteria Editor Component

The criteria editor is reusable — used in cohort detail drawer and potentially in pathway eligibility blocks.

**Layout:** A tree of rule groups. Each group has an AND/OR toggle. Groups contain either leaf rules or nested groups.

```
AND ─┬─ Diagnosis: E11.x (T2DM)
     ├─ OR ─┬─ Lab: HbA1c ≥ 8.0%
     │       └─ Lab: FPG ≥ 200
     └─ Demographics: Age 18-80
```

Each leaf rule has a type selector (dropdown: Diagnosis, Lab, Demographics, etc.) and a type-specific config form (same schemas as pathway eligibility block configs from `block-types.ts`).

### 4.5 Pathway Builder Integration

The eligibility block's config form gains a toggle at the top:

```
[ Configure Manually ] | [ Select from Cohort ]
```

- **Configure Manually:** Existing behaviour. Full config form.
- **Select from Cohort:** Dropdown of programs → dropdown of cohorts within selected program. Shows the cohort's criteria as read-only summary. Stores `cohort_reference: {cohort_id, program_version}` in the block config.

---

## 5. Docker Packaging

### 5.1 Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ app/

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 5.2 Frontend Dockerfile

```dockerfile
# Dockerfile (project root)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static .next/static
COPY --from=builder /app/public public

EXPOSE 3000
CMD ["node", "server.js"]
```

### 5.3 Docker Compose

```yaml
# docker-compose.yml (project root)
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend/data:/app/data
    environment:
      - DATABASE_URL=sqlite+aiosqlite:///data/care-admin.db
      - CORS_ORIGINS=http://localhost:3000

  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend
```

---

## 6. Seed Data

### 6.1 Default Program: Diabetes Care

Seed one complete program demonstrating the full system:

- **Program:** "Diabetes Care", condition="diabetes", status="active"
- **5 Cohorts:**
  - Prevention Program (color: #86efac, sort: 0, cadence: 365d, score range: 0-15)
  - Pre-Diabetes Reversal (color: #93c5fd, sort: 1, cadence: 180d, score range: 16-30)
  - Diabetes Wellness (color: #fcd34d, sort: 2, cadence: 90d, score range: 31-50)
  - Advanced Diabetes Care (color: #fdba74, sort: 3, cadence: 30d, score range: 51-70)
  - Comprehensive Diabetes Support (color: #fca5a5, sort: 4, cadence: 7d, score range: 71-100)
- **Criteria per cohort:** Migrated from Diabetes Care Pathway doc tier definitions
- **Scoring Engine:** 5-component weighted formula (Glycaemic 35%, Complication 25%, Adherence 20%, Utilisation 15%, SDOH 5%) with full scoring tables from the clinical doc
- **Tiebreaker Rules:** DKA → Comprehensive Support, T1DM → min Advanced Care, Tier 3 hard criteria, HbA1c escalation
- **500 patients** re-assigned to cohorts via engine on first startup

### 6.2 Migration from Phase 4

- Existing `CRSConfig` data → `scoring_engines` + `cohorts`
- Existing `CohortAssignment` data → new `cohort_assignments` with `program_id` and `cohort_id`
- Patient `tier`/`crs_score`/`crs_breakdown` columns dropped
- Patient queries that previously used `Patient.tier` now join `cohort_assignments`
- Frontend `config/tiers.ts` removed — tier/cohort metadata comes from API

---

## 7. Implementation Phases

### Phase 4A — Backend Foundation + Engine (backend only)

1. New models: Program, ProgramVersion, Cohort, CohortCriteria, ScoringEngine, CohortAssignment (new), CohortisationEvent
2. Engine architecture: ScoringComponent base, component registry, 5 concrete components, WeightedSumAggregator, tiebreaker evaluator
3. Criteria evaluator: AND/OR tree evaluation, rule type registry
4. Services: program CRUD + versioning, cohort CRUD + criteria management, scoring engine CRUD + calculation
5. Cohortisation worker: async background task, event processing loop
6. Event emitter: helper to emit cohortisation events from other services
7. API routes: /api/programs/*, /api/cohortisation/* (reworked)
8. Seed: Diabetes Care program with 5 cohorts, scoring engine, criteria, 500 patients scored
9. Migration: drop old CRS models, migrate data
10. Dockerfiles: backend + frontend + docker-compose

### Phase 4B — Cohort Builder UI (frontend)

1. Population Dashboard page (rework existing cohortisation page)
2. Program list page (/builder)
3. Cohort Builder shell (top bar, mode toggle — mirrors pathway builder)
4. AI Builder mode (templates, chat, history — mirrors pathway AI builder)
5. Configuration mode: Cohorts tab (cards, detail drawer with criteria editor)
6. Configuration mode: Scoring Engine tab (card-based component builder)
7. Configuration mode: Override Rules tab
8. Configuration mode: Linked Pathways tab
9. Criteria editor component (AND/OR tree builder — reusable)
10. Stores: cohortisation-store (rework), cohort-builder-store (new)
11. Types + API services

### Phase 4C — Pathway Integration

1. Eligibility block: "Configure | Select from Cohort" toggle
2. Cohort picker component (program → cohort dropdown with version pinning)
3. Update pathway publish to snapshot cohort version reference
4. Patient detail: replace Risk & CRS tab with cohort membership view (multi-program)
5. Remove `config/tiers.ts` and all tier references — replaced by cohort API data

---

## 8. Non-Functional Requirements

- **No hardcoded paths, colors, labels** — all from config registries or API responses
- **No diabetes-specific code in engine** — diabetes is a seeded configuration
- **Generic abstractions** — scoring components, criteria evaluators, aggregators all use registry + base class patterns
- **selectinload everywhere** — no lazy loading (async SQLAlchemy)
- **cn() for all class composition** — no template literal concatenation
- **shadcn/ui only** — no custom components
- **Lucide icons only** — no emojis
- **Event-driven architecture** — cohortisation events processed asynchronously
- **Versioned cohorts** — pathways pin to specific versions
- **Docker-ready** — backend and frontend containerised with docker-compose for local dev
- **Tenant isolation** — all queries scoped by tenant_id from AuthContext
