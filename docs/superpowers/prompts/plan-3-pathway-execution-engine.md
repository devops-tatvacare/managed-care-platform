# Plan 3: Pathway Execution Engine — Execution Prompt

## Context

You are building the pathway execution engine for a healthcare care-management platform. The pathway builder (Plan 2) creates pathways with generic blocks. The scoring engine (already built) assigns patients to cohorts. Now you need to connect them: when a patient is assigned to a cohort, they get enrolled in the cohort's linked pathway, and a background worker advances them through the blocks.

## What You Are Building

1. Cohort → Pathway linkage (FK on Cohort model)
2. Enrollment table (per-patient pathway state)
3. Block execution table (per-block completion tracking)
4. Block evaluation handlers (evaluate each block type against patient data)
5. Background worker that polls enrollments and advances patients
6. Auto-enrollment triggered by cohort assignment

## Plan Location

Read the full plan at: `docs/superpowers/plans/2026-04-10-pathway-execution-engine.md`

Read the spec at: `docs/superpowers/specs/2026-04-10-pathway-builder-redesign.md` (Part E)

## Critical Implementation Standards

### Database Models

- **`pathway_enrollments`**: One row per (patient, pathway) pair. Tracks `status` (active/completed/paused/exited), `current_block_id`, `enrolled_at`, `completed_at`. Unique constraint on `(patient_id, pathway_id)` — a patient can only be enrolled once per pathway.
- **`pathway_block_executions`**: One row per block execution attempt within an enrollment. Tracks `status` (pending/in_progress/completed/skipped/failed), `started_at`, `completed_at`, `result` (JSONB), `error`. FK to both enrollment and block.
- **Add `pathway_id` to `cohorts` table**: `UUID FK REFERENCES pathways(id), nullable`. This is the linkage — a cohort can optionally point to a pathway.
- **No cascade deletes from pathway to enrollment.** If a pathway is modified, existing enrollments continue with their current state. New enrollments pick up the updated pathway.

### Enrollment Lifecycle

```
Patient assigned to Cohort (via scoring engine)
  → Cohort has pathway_id?
    → Yes: Create PathwayEnrollment (status=active, current_block=first block)
    → No: No enrollment
  
Enrollment advances through blocks:
  pending → in_progress → completed → next block
  
Terminal states:
  - completed: All blocks executed, no more edges
  - paused: Manual pause by care manager
  - exited: Patient left the program or migrated cohorts
```

### Block Evaluation

Each block type has a handler function: `(config: dict, patient_data: PatientData) -> {passed: bool, result: dict, edge_type: str}`

- **Eligibility blocks**: Evaluate against patient data (diagnoses, labs, meds). Return `passed=True/False` and `edge_type="success"/"false_branch"`.
- **Assessment blocks**: Always pass (execution means the assessment was ordered). The actual completion is tracked externally.
- **Action blocks**: Always pass (execution means the action was fired — outreach sent, order placed, referral created).
- **Logic blocks**: Evaluate the condition and return the appropriate edge type for branching.
- **Escalation blocks**: Always pass (execution triggers the tier change via cohortisation events).
- **Schedule blocks**: Always pass (execution creates the recurring schedule).

For this plan, assessment/action/schedule blocks are **passthrough** — they record that execution happened but don't actually fire real actions (that's a future integration). The evaluation logic for eligibility and logic blocks is real.

### Background Worker

Follow the **exact same pattern** as `backend/app/workers/cohortisation_worker.py`:

```python
async def run(shutdown_event: asyncio.Event | None = None) -> None:
    while True:
        if shutdown_event and shutdown_event.is_set():
            break
        try:
            async with async_session() as db:
                processed = await _process_batch(db)
        except Exception:
            logger.exception("Error in pathway worker")
        await asyncio.sleep(POLL_INTERVAL)
```

- **`POLL_INTERVAL = 10`** seconds (slower than cohortisation worker — pathways don't need sub-second latency)
- **`BATCH_SIZE = 50`** enrollments per poll
- **Use `async_session`** from `app.database` — same session factory as the rest of the app
- **Start in lifespan** alongside the cohortisation worker in `main.py`. Use the same shutdown event pattern.
- **No file locks, no mutexes.** The worker is single-instance (single uvicorn process). Concurrency is handled by processing enrollments in batches with proper DB commits between iterations.

### Auto-Enrollment

In `cohortisation_worker.py`, in `_assign_patient_to_program`, after the cohort assignment is created:

```python
if matched_cohort.pathway_id:
    from app.services.pathway_enrollment import enroll_patient
    await enroll_patient(db, tenant_id, patient.id, matched_cohort.pathway_id, cohort_id=matched_cohort.id)
```

This is a single line addition. The enrollment service handles the rest (creates enrollment, sets first block, creates pending execution).

### State Management

- **Enrollment state** is the source of truth for where a patient is in their pathway.
- **Block execution history** is an audit trail — every block evaluation is recorded with timestamp, result, and any errors.
- **`current_block_id`** on the enrollment always points to the block being evaluated or waiting for evaluation. When a block completes, the worker finds the next block via edges and updates `current_block_id`.
- **Edge traversal**: Use the `pathway_edges` table. The `edge_type` from block evaluation (`"success"` or `"false_branch"`) determines which edge to follow. If no matching edge exists, the enrollment completes.

### Existing Code To Study First

- `backend/app/workers/cohortisation_worker.py` — worker pattern to follow exactly
- `backend/app/services/patient_data.py` — `build_patient_data()` for creating PatientData from ORM models
- `backend/app/engine/base.py` — `PatientData` dataclass definition
- `backend/app/models/pathway.py` — existing Pathway, PathwayBlock, PathwayEdge models
- `backend/app/services/pathway_enrollment.py` — you create this

### What NOT To Do

- Do not implement real action execution (actually sending WhatsApp messages, placing lab orders, making referrals). Block execution records that the block was reached — actual integrations come later.
- Do not use threading or multiprocessing. The worker is async, single-process, uses asyncio.
- Do not hold DB connections across sleep intervals. Open a session, process a batch, commit, close. Open a new session for the next batch.
- Do not lock rows. The worker is single-instance and processes enrollments sequentially within a batch. No optimistic locking needed.
- Do not create API endpoints for manually advancing enrollments in this plan. The worker handles all advancement. Manual controls come in Plan 4 (patient forks can pause/skip blocks).
