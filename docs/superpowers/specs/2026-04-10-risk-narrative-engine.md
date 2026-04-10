# Risk Narrative Engine

**Date**: 2026-04-10
**Status**: Approved

## Problem

The scoring engine produces numeric scores and component breakdowns, but there's no clinical narrative explaining why a patient scored the way they did. Care managers see numbers without context. The narrative needs to flow through the cohortisation table (tooltip) and patient detail page (AI summary card).

## Design

### Three Layers

**Layer 1 — Structured drivers (instant, deterministic):**
- Derived from `score_breakdown` — no LLM
- Shown as colored tags: `glycaemic_control 70/100`, `complication_burden 55/100`
- Available immediately after scoring

**Layer 2 — Batch risk narrative (1 LLM call per 50 patients):**
- Generated during scoring, after each worker batch completes
- Prompt includes: score, breakdown, cohort name, top lab values, active diagnoses
- Output: 1-2 sentence clinical summary per patient
- Stored on `CohortAssignment.narrative` field
- Shown as tooltip in cohortisation table (hover over score)

**Layer 3 — On-demand AI clinical summary (1 LLM call per patient, user-initiated):**
- Triggered by user clicking "Generate" on patient detail page
- Prompt includes: full patient data + pre-computed risk narrative from Layer 2
- Output: clinical summary paragraph + recommended actions with urgency
- NOT persisted — generated fresh each time (data may have changed)

---

## Backend Changes

### Model: Add `narrative` to CohortAssignment

```python
narrative: Mapped[str | None] = mapped_column(Text, nullable=True)
```

### Worker: Batch narrative generation

After `_process_batch` scores all patients in a batch:
1. Collect all successful score results with patient data
2. Build a single prompt with all patients' data
3. Call Gemini with the batch prompt
4. Parse response → update each CohortAssignment's `narrative` field
5. Publish SSE events with narrative included

If LLM call fails, assignments are still valid — narrative stays null. Non-blocking.

### Prompt: Batch risk narrative

Template in prompt registry. Input per patient:
- score, cohort_name
- score_breakdown (component → raw/weighted)
- top 3 lab values (from patient_data.latest_labs)
- active diagnosis codes
- worst PDC

Output: JSON array of `{patient_id, narrative}` objects.

### New endpoint: Patient AI summary

`POST /api/patients/{id}/ai-summary`

- Auth-gated, user-initiated
- Loads: patient data, current cohort assignment (with narrative), labs, diagnoses, medications, SDOH, care gaps
- Calls Gemini with a clinical summary prompt
- Returns: `{summary: string, actions: [{text, urgency}]}`
- Streamed via SSE (same pattern as command center insights)

---

## Frontend Changes

### Cohortisation table: Narrative tooltip

- `score_breakdown` and `narrative` already returned in assignment records
- Add tooltip component on the score cell
- Tooltip shows: risk narrative text (from Layer 2)
- If narrative is null, show "Narrative pending..." or driver tags as fallback

### Patient detail: Risk Score KPI card

- New 5th card in the KPI strip
- Shows: score number (large, colored by tier) + cohort badge
- Data source: current cohort assignment (already fetched)

### Patient detail: AI Clinical Summary card

- New card between KPI strip and tabs
- Default state: collapsed with "Click to generate" button
- On click: POST to `/api/patients/{id}/ai-summary`, stream response
- Shows: clinical narrative paragraph + driver tags + recommended actions with urgency badges
- Actions come from the LLM response (not the action engine — the LLM suggests clinical actions based on the patient's data)

---

## Schema Updates

### Backend: RecalculateResponse / AssignmentRecord

Add `narrative: str | None` to AssignmentRecord schema.

### Frontend: AssignmentRecord type

Add `narrative: string | null` to the TypeScript interface.

### New types

```typescript
interface AISummaryResponse {
  summary: string;
  actions: { text: string; urgency: "urgent" | "this_week" | "next_visit" }[];
}
```

---

## File Inventory

| File | Action | Purpose |
|---|---|---|
| `backend/app/models/cohort.py` | Modify | Add `narrative` column to CohortAssignment |
| `backend/app/llm/prompts.py` | Modify | Add batch_risk_narrative + patient_ai_summary prompts |
| `backend/app/workers/cohortisation_worker.py` | Modify | Call LLM after batch scoring, store narratives |
| `backend/app/routers/patients.py` | Modify | Add POST `/patients/{id}/ai-summary` endpoint |
| `backend/app/schemas/cohort.py` | Modify | Add narrative to AssignmentRecord |
| `backend/app/schemas/patient.py` | Modify | Add AISummaryResponse schema |
| `src/services/types/cohort.ts` | Modify | Add narrative to AssignmentRecord |
| `src/services/types/patient.ts` | Modify | Add AISummaryResponse type |
| `src/services/api/patients.ts` | Modify | Add streamAISummary() function |
| `src/features/cohortisation/components/risk-worklist.tsx` | Modify | Add tooltip on score cell |
| `src/app/dashboard/patients/[id]/page.tsx` | Modify | Add Risk Score KPI card |
| `src/features/patients/components/ai-summary-card.tsx` | Create | AI Clinical Summary card component |
