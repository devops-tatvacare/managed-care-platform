# Phase 5-7 Execution Prompts

Self-contained prompts for separate Claude Code sessions. Updated to account for the Phase 4A/4B/4C cohort system redesign.

**IMPORTANT:** These prompts assume Phase 4A/4B/4C have been executed. If they haven't, the data model references below will be wrong. Execute 4A → 4B → 4C first.

---

## Session — Phase 5: Command Center

```
You are continuing work on the bradesco-care-admin prototype — a healthcare care management platform.

## Context
- Working directory: /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin
- Phases 1-4C are complete (Foundation, Patients, Pathway Builder, Cohortisation with generic cohort system)
- Design spec: docs/superpowers/specs/2026-04-07-bradesco-care-admin-redesign.md (Section 9.1 for screen spec)
- Cohort redesign spec: docs/superpowers/specs/2026-04-07-cohort-system-redesign.md

## What exists
- Backend: FastAPI + SQLAlchemy async + SQLite
- Models: Tenant/User/Role/Patient/PatientLab/PatientDiagnosis/Pathway/PathwayBlock/PathwayEdge/AISession/Program/Cohort/CohortCriteria/ScoringEngine/CohortAssignment/CohortisationEvent
- Frontend: Next.js 15 + Tailwind 4 + shadcn/ui + Zustand stores
- 500 seeded patients assigned to cohorts within the "Diabetes Care" program (5 cohorts, formerly tiers)
- LLM abstraction layer exists (base provider, Gemini adapter, registry) from pathway AI builder
- Population Dashboard at /dashboard/cohortisation with program cards and risk pool table
- Config registries: routes.ts, icons.ts, status.ts, block-types.ts, api.ts, navigation.ts, rule-types.ts
- Pattern: all queries use selectinload (no lazy loading), all UI uses shadcn components + cn(), no hardcoded colors/paths/labels

## CRITICAL — Data model changes from Phase 4 redesign:
- Patient model NO LONGER has `tier`, `crs_score`, or `crs_breakdown` columns
- Cohort membership is in `cohort_assignments` table (patient_id, program_id, cohort_id, score, score_breakdown, is_current)
- "Tiers" are now "Cohorts" within "Programs" — the `cohorts` table has name, color, sort_order, review_cadence_days, score_range_min/max, member_count
- `tiers.ts` config is removed — cohort metadata comes from the API
- Review due dates are on `cohort_assignments.review_due_at`, not `Patient.review_due_date`
- Use programs/cohorts API endpoints, not the old tier-based endpoints

## Task: Write Phase 5 plan (Command Center), then execute via subagent-driven development

Read the design spec Section 9.1 for the Command Center screen spec. Adapt all tier/CRS references to the new cohort model.

### Phase 5 must include:

**Backend:**
1. Command center data aggregation service — pulls KPIs from patients and cohort_assignments:
   - Total Members (active patients count)
   - Avg Risk Score (avg of cohort_assignments.score where is_current=True and score is not null)
   - HbA1c <7% Rate (from patient_labs, latest HbA1c per patient)
   - Open Care Gaps (count of patients with non-empty care_gaps)
   - PDC ≥80% Rate (from active_medications pdc_90day)
2. AI action queue endpoint — generates prioritised patient alerts from:
   - Care gaps (patients with overdue screenings)
   - Overdue reviews (cohort_assignments.review_due_at < now)
   - Recent cohort changes (cohort_assignments where previous_cohort_id differs)
   - Missed touchpoints
   Each alert has action chips (e.g., "Schedule PCP", "Send HbA1c outreach")
3. AI population insights endpoint — calls LLM to generate daily digest. Cache result. Fallback to static summary if LLM unavailable
4. Upcoming reviews endpoint — patients with review_due_at approaching, grouped by program/cohort
5. Cohort distribution endpoint — patient counts per cohort per program (may already exist from Phase 4, reuse if so)
6. All endpoints require auth + tenant filtering

**Frontend:**
1. Command Center page — replace placeholder at /dashboard with:
   - 5 KPI cards (Total Members, Avg Risk Score, HbA1c <7% Rate, Open Care Gaps, PDC ≥80%)
   - Left column: AI Action Queue (prioritised patient alert cards with action chips — clicking an action navigates to patient detail or triggers an outreach) + Cohort Distribution chart (Recharts BarChart, one group per program, bars per cohort colored by cohort.color)
   - Right column: AI Insights Panel (LLM daily digest rendered as markdown with ReactMarkdown) + Upcoming Reviews table (patient name, program, cohort badge, review due date, days until due) + Comms Summary (placeholder stats until Phase 6)
2. Zustand store: command-center-store.ts
3. Types, API service — follow existing patterns exactly

### Critical rules:
- NO emojis — Lucide icons only
- NO custom UI components — shadcn/ui only
- NO hardcoded paths/colors/labels — config registries only
- cn() for all class composition
- selectinload on all relationship queries — no lazy loading
- All new endpoints require auth + tenant filtering
- Use cohort_assignments for all membership/score queries — NOT Patient.tier/crs_score (those columns don't exist)
- Cohort colors come from the cohort record, not a config file
- AI endpoints use the existing LLM abstraction layer (app/llm/) — if LLM fails, return sensible fallback
- Follow existing patterns: stores, API client, router registry, seed service
- Tabs use variant="line" with consistent styling

Write the plan to docs/superpowers/plans/2026-04-07-phase-5-command-center.md, then execute with subagent-driven development.
```

---

## Session — Phase 6: Communications

```
You are continuing work on the bradesco-care-admin prototype — a healthcare care management platform.

## Context
- Working directory: /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin
- Phases 1-5 are complete (Foundation, Patients, Pathway Builder, Cohortisation with generic cohort system, Command Center)
- Design spec: docs/superpowers/specs/2026-04-07-bradesco-care-admin-redesign.md (Section 9.5 for screen spec, Section 6.2 for DB models: concierge_actions, message_templates)
- Cohort redesign spec: docs/superpowers/specs/2026-04-07-cohort-system-redesign.md

## What exists
- Backend: FastAPI + SQLAlchemy async + SQLite, full model set including Program/Cohort/CohortAssignment
- Frontend: Next.js 15 + Tailwind 4 + shadcn/ui + Zustand stores
- LLM abstraction layer, command center with AI action queue and insights
- 500 seeded patients assigned to cohorts, 3 pathways, command center functional
- Pattern: all queries use selectinload, all UI uses shadcn + cn(), no hardcoded anything

## CRITICAL — Data model changes from Phase 4 redesign:
- Patient.tier/crs_score/crs_breakdown columns DO NOT EXIST
- Cohort membership is in cohort_assignments table
- "Tiers" are "Cohorts" within "Programs"
- tiers.ts config is removed — cohort metadata comes from API

## Task: Write Phase 6 plan (Communications), then execute via subagent-driven development

Read the design spec Section 9.5 and Section 6.2 (concierge_actions, message_templates).

### Phase 6 must include:

**Backend:**
1. Models: ConciergeAction (append-only action log), MessageTemplate (with cohort_applicability instead of tier_applicability — stores list of cohort IDs or null for all)
2. Thread service — threads derived from concierge_actions grouped by patient_id, ordered by created_at
3. Orchestration service — multi-step outreach sequence tracking
4. AI comms draft endpoint — LLM drafts personalised outreach using patient context + cohort membership + care gaps + templates
5. AI comms rewrite endpoint — rewrites message (tone, simplify, translate)
6. Template CRUD endpoints
7. Seed: 5-10 message templates for common scenarios

**Frontend:**
1. Communications page — replace placeholder with:
   - Sub-tabs: Threads, AI Orchestration (line variant tabs)
   - Threads tab: Thread list (left) + Message thread (center) + Patient context panel (right, shows patient summary + cohort membership + active protocols)
   - AI Orchestration tab: Stats strip + Filter bar + Orchestration table (patient, program, cohort — NOT tier, pathway step, channel, attempt, state, last activity)
   - Compose area: Template chips + text input + AI Rewrite button + channel selector + language selector
2. Zustand store: communications-store.ts
3. Types, API service

### Critical rules:
- NO emojis — Lucide icons only
- NO custom UI components — shadcn/ui only
- NO hardcoded paths/colors/labels — config registries only
- cn() for all class composition
- selectinload on all relationship queries
- ConciergeAction is append-only — never update, only insert
- Message templates use cohort_applicability (cohort IDs), NOT tier_applicability
- Patient context panel shows cohort membership from cohort_assignments, NOT Patient.tier
- AI endpoints use existing LLM abstraction layer
- Follow existing patterns exactly

Write the plan to docs/superpowers/plans/2026-04-07-phase-6-communications.md, then execute with subagent-driven development.
```

---

## Session — Phase 7: Outcomes

```
You are continuing work on the bradesco-care-admin prototype — a healthcare care management platform.

## Context
- Working directory: /Users/dhspl/Programs/tc-projects/prototypes/bradesco-care-admin
- Phases 1-6 are complete (Foundation, Patients, Pathway Builder, Cohortisation with generic cohort system, Command Center, Communications)
- Design spec: docs/superpowers/specs/2026-04-07-bradesco-care-admin-redesign.md (Section 9.6 for screen spec, Section 6.2 for DB models: outcome_metrics, recohortisation_events)
- Cohort redesign spec: docs/superpowers/specs/2026-04-07-cohort-system-redesign.md

## What exists
- Backend: FastAPI + SQLAlchemy async + SQLite, full model set including Program/Cohort/CohortAssignment/ConciergeAction/MessageTemplate
- Frontend: Next.js 15 + Tailwind 4 + shadcn/ui + Zustand stores
- LLM abstraction layer, command center, communications with threads and orchestration
- 500 seeded patients with full data, all previous phases functional

## CRITICAL — Data model changes from Phase 4 redesign:
- Patient.tier/crs_score/crs_breakdown columns DO NOT EXIST
- Cohort membership is in cohort_assignments table (with score, score_breakdown, previous_cohort_id)
- "Tiers" are "Cohorts" within "Programs"
- Cohort migrations are tracked via cohort_assignments history (previous_cohort_id field)
- The recohortisation_events model from the original spec may be redundant — cohort_assignments already tracks changes with previous_cohort_id, assignment_type, reason. Evaluate whether a separate events table adds value or if cohort_assignments history is sufficient

## Task: Write Phase 7 plan (Outcomes), then execute via subagent-driven development

Read the design spec Section 9.6 and Section 6.2 (outcome_metrics, recohortisation_events).

### Phase 7 must include:

**Backend:**
1. Models: OutcomeMetric (metric_key, category: clinical/hedis/engagement/financial, value, unit, period, baseline, target). For recohortisation: evaluate whether to add a separate model or use cohort_assignments with is_current=False + previous_cohort_id as the migration history
2. Outcome metrics service — computes from real patient data:
   - Clinical: HbA1c control rate per cohort, hospitalisation rate, care gap closure rate, PDC rates
   - HEDIS: CDC measure adherence (HbA1c testing, eye exam, nephropathy, BP control)
   - Engagement: enrollment rate, touchpoint completion, app engagement
   - Financial: estimated cost avoidance from cohort migrations (high→low risk)
3. Cohort migration service — tracks patients moving between cohorts. Uses cohort_assignments history (where previous_cohort_id is not null). Approve/reject workflow for pending manual overrides
4. AI quarterly insight endpoint — LLM narrative of outcomes trends
5. Seed: Baseline outcome metrics for seeded population

**Frontend:**
1. Outcomes page — replace placeholder with:
   - Filter bar: Program (Select), Cohort (Select, filtered by program), Period (Select), Care Team (Select)
   - Sub-tabs: Clinical Outcomes, HEDIS Measures, Engagement, Financial/ROI, Cohort Migrations (line variant tabs)
   - Clinical Outcomes tab: 4 KPI cards + Primary outcomes table (metric, baseline → 90d → current → target → status with color coding) + Cohort migration summary (table showing patient movements between cohorts with counts) + AI quarterly insight card (markdown rendered)
   - HEDIS Measures tab: Measure cards showing current vs target with Progress bars
   - Engagement tab: Enrollment funnel + touchpoint completion rates + app engagement metrics
   - Financial/ROI tab: Cost avoidance KPIs + per-cohort ROI table
   - Cohort Migrations tab: Pending cohort changes table with approve/reject buttons (for manual overrides). History table showing completed migrations
2. Zustand store: outcomes-store.ts
3. Types, API service

### Critical rules:
- NO emojis — Lucide icons only
- NO custom UI components — shadcn/ui only (use Recharts for charts)
- NO hardcoded paths/colors/labels — config registries only
- cn() for all class composition
- selectinload on all relationship queries
- Outcome metrics computed from real patient data, not hardcoded
- All "tier" references in the original spec become "cohort" references — filter by program_id/cohort_id
- Cohort migration approve/reject creates a new cohort_assignment (not updating the old one)
- Cohort colors come from the cohort record via API
- AI endpoints use existing LLM abstraction layer
- Follow existing patterns exactly

Write the plan to docs/superpowers/plans/2026-04-07-phase-7-outcomes.md, then execute with subagent-driven development.
```
