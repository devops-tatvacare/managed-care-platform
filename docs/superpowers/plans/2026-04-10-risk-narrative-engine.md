# Risk Narrative Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate clinical risk narratives during batch scoring and surface them in the cohortisation table (tooltip) and patient detail page (KPI card + on-demand AI summary card).

**Architecture:** Worker calls Gemini after each batch to generate narratives for all scored patients in one LLM call. Narratives are stored on CohortAssignment. Patient detail page gets a new Risk Score KPI card (deterministic) and an AI Summary card (on-demand LLM call with streaming).

**Tech Stack:** Python (Gemini API, asyncio), FastAPI StreamingResponse, React/Zustand, Sonner tooltips.

---

## File Inventory

| File | Action | Purpose |
|---|---|---|
| `backend/app/models/cohort.py` | Modify | Add `narrative` column to CohortAssignment |
| `backend/app/llm/prompts.py` | Modify | Add `batch_risk_narrative` + `patient_ai_summary` prompt templates |
| `backend/app/workers/cohortisation_worker.py` | Modify | Call LLM after batch, store narratives, include narrative in SSE events |
| `backend/app/schemas/cohort.py` | Modify | Add `narrative` to AssignmentRecord |
| `backend/app/routers/cohortisation.py` | Modify | Include narrative in assignment serialization |
| `backend/app/routers/patients.py` | Modify | Add `POST /{id}/ai-summary` streaming endpoint |
| `backend/app/schemas/patient.py` | Modify | Add `AISummaryAction` schema |
| `src/services/types/cohort.ts` | Modify | Add `narrative` to AssignmentRecord |
| `src/services/types/patient.ts` | Modify | Add `AISummaryResponse` type |
| `src/config/api.ts` | Modify | Add `aiSummary` endpoint |
| `src/services/api/patients.ts` | Modify | Add `streamAISummary()` function |
| `src/features/cohortisation/components/risk-worklist.tsx` | Modify | Add tooltip on score cell |
| `src/features/patients/components/patient-kpi-strip.tsx` | Modify | Add Risk Score KPI card |
| `src/features/patients/components/ai-summary-card.tsx` | Create | AI Clinical Summary card component |
| `src/app/dashboard/patients/[id]/page.tsx` | Modify | Insert AISummaryCard between KpiStrip and Tabs |

---

### Task 1: Add `narrative` Column to CohortAssignment

**Files:**
- Modify: `backend/app/models/cohort.py`

- [ ] **Step 1: Add narrative field to CohortAssignment**

In `backend/app/models/cohort.py`, add this line after the `reason` field (around line 132):

```python
    narrative: Mapped[str | None] = mapped_column(Text, nullable=True)
```

- [ ] **Step 2: Add narrative to AssignmentRecord schema**

In `backend/app/schemas/cohort.py`, add `narrative` to `AssignmentRecord`:

```python
class AssignmentRecord(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    program_id: str
    cohort_id: str
    cohort_name: str
    cohort_color: str
    score: int | None
    score_breakdown: dict[str, Any] | None
    assignment_type: str
    reason: str | None
    narrative: str | None  # <-- NEW
    previous_cohort_id: str | None
    previous_cohort_name: str | None
    pdc_worst: float | None
    assigned_at: str
    review_due_at: str | None
```

- [ ] **Step 3: Update assignment serialization in cohortisation router**

In `backend/app/routers/cohortisation.py`, in the `assignments_list` function, add `narrative` to the `AssignmentRecord` construction:

```python
        items.append(AssignmentRecord(
            # ... existing fields ...
            narrative=a.narrative,
            # ... rest of fields ...
        ))
```

- [ ] **Step 4: Update frontend AssignmentRecord type**

In `src/services/types/cohort.ts`, add to `AssignmentRecord`:

```typescript
  narrative: string | null;
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/cohort.py backend/app/schemas/cohort.py backend/app/routers/cohortisation.py src/services/types/cohort.ts
git commit -m "feat: add narrative field to CohortAssignment model and schemas"
```

---

### Task 2: Batch Risk Narrative Prompt

**Files:**
- Modify: `backend/app/llm/prompts.py`

- [ ] **Step 1: Add batch_risk_narrative prompt template**

In `backend/app/llm/prompts.py`, add this template to `_register(...)` (before the closing parenthesis):

```python
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
```

- [ ] **Step 2: Add patient_ai_summary prompt template**

Add another template for the on-demand patient summary:

```python
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
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/llm/prompts.py
git commit -m "feat: add batch_risk_narrative and patient_ai_summary prompt templates"
```

---

### Task 3: Worker Generates Narratives After Batch Scoring

**Files:**
- Modify: `backend/app/workers/cohortisation_worker.py`

- [ ] **Step 1: Add narrative generation function**

Add this function after the existing imports in `cohortisation_worker.py`:

```python
import json as _json

async def _generate_batch_narratives(
    db: AsyncSession,
    scored_patients: list[dict],
) -> None:
    """Call LLM to generate risk narratives for a batch of scored patients.

    scored_patients: list of {assignment_id, patient_id, patient_name, score,
                              cohort_name, breakdown, labs_summary, diagnoses_summary}
    """
    if not scored_patients:
        return

    try:
        from app.llm import get_provider, PROMPT_REGISTRY

        template = PROMPT_REGISTRY.get("batch_risk_narrative")
        if not template:
            return

        patients_json = _json.dumps([
            {
                "patient_id": str(p["patient_id"]),
                "name": p["patient_name"],
                "score": p["score"],
                "cohort": p["cohort_name"],
                "top_drivers": [
                    f"{k}: {v['raw']}/{100} (weighted {v['weighted']})"
                    for k, v in sorted(
                        (p.get("breakdown") or {}).items(),
                        key=lambda x: x[1].get("weighted", 0),
                        reverse=True,
                    )[:3]
                ],
                "labs": p.get("labs_summary", ""),
                "diagnoses": p.get("diagnoses_summary", ""),
            }
            for p in scored_patients
        ], indent=2)

        system_prompt, user_prompt = template.render(
            count=str(len(scored_patients)),
            patients_json=patients_json,
        )

        provider = get_provider()
        result = await provider.generate(
            user_prompt, system=system_prompt, max_tokens=2048, parse_json=True,
        )

        # Parse and update assignments
        narratives = result if isinstance(result, list) else result.get("narratives", result) if isinstance(result, dict) else []
        if not isinstance(narratives, list):
            return

        narrative_map = {n["patient_id"]: n["narrative"] for n in narratives if "patient_id" in n and "narrative" in n}

        for p in scored_patients:
            pid = str(p["patient_id"])
            narrative = narrative_map.get(pid)
            if narrative and p.get("assignment_id"):
                from app.models.cohort import CohortAssignment
                await db.execute(
                    update(CohortAssignment)
                    .where(CohortAssignment.id == p["assignment_id"])
                    .values(narrative=narrative)
                )

        await db.commit()
    except Exception:
        logger.warning("Batch narrative generation failed — assignments saved without narratives", exc_info=True)
```

- [ ] **Step 2: Collect scored patient data in _process_batch and call narrative generation**

In the `_process_batch` function, after the existing `for event in events:` loop and before `await db.commit()`, add collection of scored patient data. The `_assign_patient_to_program` already returns a dict with patient data. We need to also return the assignment_id and clinical summaries.

Update the processing loop. After `result_data = await _process_event(db, event)`, also capture lab/diagnosis summaries. Modify the `for event in events:` loop to collect narrative inputs:

After the existing loop ends (after publishing events), before the batch_complete check, add:

```python
    # Generate narratives for scored patients
    if scored_for_narrative:
        await _generate_batch_narratives(db, scored_for_narrative)

        # Publish narrative updates via SSE
        for p in scored_for_narrative:
            if p.get("narrative"):
                await event_bus.publish(events[0].tenant_id, "cohortisation", {
                    "type": "narrative_ready",
                    "entity_id": str(p["patient_id"]),
                    "data": {"narrative": p["narrative"]},
                })
```

Initialize `scored_for_narrative = []` before the loop. In the success branch (where `result_data` is not None), append:

```python
            if result_data:
                scored_for_narrative.append({
                    "assignment_id": result_data.get("assignment_id"),
                    "patient_id": event.patient_id,
                    "patient_name": result_data.get("patient_name", ""),
                    "score": result_data.get("score"),
                    "cohort_name": result_data.get("cohort_name", ""),
                    "breakdown": result_data.get("score_breakdown"),
                    "labs_summary": result_data.get("labs_summary", ""),
                    "diagnoses_summary": result_data.get("diagnoses_summary", ""),
                })
```

- [ ] **Step 3: Update _assign_patient_to_program to return assignment_id and clinical summaries**

In the return dict at the end of `_assign_patient_to_program`, add these fields:

```python
        "assignment_id": str(assignment.id),
        "score_breakdown": score_result["breakdown"] if score_result else None,
        "labs_summary": ", ".join(f"{k}: {v}" for k, v in list(patient_data.latest_labs.items())[:5]),
        "diagnoses_summary": ", ".join(patient_data.active_diagnosis_codes[:5]),
```

- [ ] **Step 4: Include narrative in SSE item_processed events**

After `_generate_batch_narratives` runs, the narratives are in the DB but the SSE `item_processed` events were already sent without them. The `narrative_ready` event (from step 2) handles this as a separate SSE event type. The frontend will handle this event to update the assignment's narrative in the store.

- [ ] **Step 5: Commit**

```bash
git add backend/app/workers/cohortisation_worker.py
git commit -m "feat: worker generates batch risk narratives via LLM after scoring"
```

---

### Task 4: Patient AI Summary Streaming Endpoint

**Files:**
- Modify: `backend/app/routers/patients.py`
- Modify: `backend/app/schemas/patient.py`
- Modify: `src/config/api.ts`
- Modify: `src/services/types/patient.ts`
- Modify: `src/services/api/patients.ts`

- [ ] **Step 1: Add AISummaryAction schema**

In `backend/app/schemas/patient.py`, add at the bottom:

```python
class AISummaryAction(BaseModel):
    text: str
    urgency: str  # "urgent" | "this_week" | "next_visit"
```

- [ ] **Step 2: Add the streaming AI summary endpoint**

In `backend/app/routers/patients.py`, add this endpoint (after the `bulk_import` endpoint):

```python
@router.post("/{patient_id}/ai-summary")
async def ai_summary(
    patient_id: uuid.UUID,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    """Stream an AI clinical summary for a patient."""
    import json as _json
    from starlette.responses import StreamingResponse
    from app.llm import get_provider, PROMPT_REGISTRY
    from app.models.patient import PatientLab, PatientDiagnosis
    from app.models.cohort import CohortAssignment

    # Load patient
    patient = await get_patient(db, auth.tenant_id, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Load current cohort assignment
    assignment_result = await db.execute(
        select(CohortAssignment)
        .where(
            CohortAssignment.patient_id == patient_id,
            CohortAssignment.is_current == True,
        )
        .order_by(CohortAssignment.assigned_at.desc())
        .limit(1)
    )
    assignment = assignment_result.scalar_one_or_none()

    # Load labs and diagnoses
    labs_result = await db.execute(
        select(PatientLab)
        .where(PatientLab.patient_id == patient_id)
        .order_by(PatientLab.recorded_at.desc())
        .limit(10)
    )
    labs = list(labs_result.scalars().all())

    diag_result = await db.execute(
        select(PatientDiagnosis)
        .where(PatientDiagnosis.patient_id == patient_id, PatientDiagnosis.is_active == True)
    )
    diagnoses = list(diag_result.scalars().all())

    # Build prompt context
    from datetime import date
    age = (date.today() - patient.date_of_birth).days // 365 if patient.date_of_birth else "?"
    meds = patient.active_medications or []
    worst_pdc = min((m.get("pdc_90day", 1.0) for m in meds), default=1.0)

    template = PROMPT_REGISTRY["patient_ai_summary"]
    system_prompt, user_prompt = template.render(
        patient_name=f"{patient.first_name} {patient.last_name}",
        age=str(age),
        gender=patient.gender or "Unknown",
        score=str(assignment.score) if assignment else "N/A",
        cohort_name=assignment.cohort.name if assignment and hasattr(assignment, "cohort") and assignment.cohort else "Unassigned",
        narrative=assignment.narrative or "No narrative available" if assignment else "No assignment",
        diagnoses=", ".join(f"{d.icd10_code} ({d.description})" for d in diagnoses) or "None",
        labs=", ".join(f"{l.test_type}: {l.value} {l.unit}" for l in labs[:5]) or "None",
        medications=", ".join(f"{m['name']} {m.get('dose', '')}" for m in meds) or "None",
        worst_pdc=f"{worst_pdc * 100:.0f}%" if meds else "N/A",
        sdoh_flags=", ".join(k for k, v in (patient.sdoh_flags or {}).items() if v) or "None",
        care_gaps=", ".join(patient.care_gaps or []) or "None",
    )

    async def event_stream():
        try:
            provider = get_provider()
            async for chunk in provider.generate_stream(
                user_prompt, system=system_prompt, max_tokens=2048,
            ):
                yield f"data: {_json.dumps({'text': chunk})}\n\n"
            yield f"data: {_json.dumps({'done': True})}\n\n"
        except Exception as exc:
            logger.exception("AI summary stream failed")
            yield f"data: {_json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

- [ ] **Step 3: Add frontend types**

In `src/services/types/patient.ts`, add at the bottom:

```typescript
export interface AISummaryAction {
  text: string;
  urgency: "urgent" | "this_week" | "next_visit";
}

export interface AISummaryResponse {
  summary: string;
  actions: AISummaryAction[];
}
```

- [ ] **Step 4: Add API endpoint config**

In `src/config/api.ts`, add to the patients section:

```typescript
    aiSummary: (id: string) => `/api/patients/${id}/ai-summary`,
```

- [ ] **Step 5: Add streaming client function**

In `src/services/api/patients.ts`, add:

```typescript
export function streamAISummary(
  patientId: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError?: (error: string) => void,
): () => void {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const streamBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  let cancelled = false;

  (async () => {
    try {
      const resp = await fetch(`${streamBase}${API_ENDPOINTS.patients.aiSummary(patientId)}`, {
        method: "POST",
        headers,
      });

      if (!resp.ok) {
        onError?.(`Failed: ${resp.status}`);
        return;
      }
      if (!resp.body) {
        onError?.("No response body");
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) { onDone(); return; }
            if (data.error) { onError?.(data.error); return; }
            if (data.text) onChunk(data.text);
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      if (!cancelled) onError?.(String(err));
    }
  })();

  return () => { cancelled = true; };
}
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/patients.py backend/app/schemas/patient.py src/config/api.ts src/services/types/patient.ts src/services/api/patients.ts
git commit -m "feat: patient AI summary streaming endpoint + client"
```

---

### Task 5: Cohortisation Table — Narrative Tooltip

**Files:**
- Modify: `src/features/cohortisation/components/risk-worklist.tsx`
- Modify: `src/stores/cohortisation-store.ts`

- [ ] **Step 1: Add Tooltip import and narrative tooltip to score cell**

In `src/features/cohortisation/components/risk-worklist.tsx`, add Tooltip imports at the top:

```typescript
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
```

Replace the Score `<TableCell>` (around line 251-255) with:

```tsx
                    {/* Score with narrative tooltip */}
                    <TableCell className="text-right">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn("tabular-nums text-sm font-medium cursor-help", scoreColor(a.score))}>
                              {a.score != null ? a.score : "--"}
                            </span>
                          </TooltipTrigger>
                          {a.narrative && (
                            <TooltipContent side="left" className="max-w-xs text-xs leading-relaxed">
                              {a.narrative}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
```

- [ ] **Step 2: Handle narrative_ready SSE event in store**

In `src/stores/cohortisation-store.ts`, the `onItemsFlushed` already handles `item_processed`. Add handling for `narrative_ready` events. Add a new action to the interface:

```typescript
  onNarrativeReady: (entityId: string, narrative: string) => void;
```

Implementation:

```typescript
  onNarrativeReady: (entityId: string, narrative: string) => {
    set((s) => ({
      assignments: s.assignments.map((a) =>
        a.patient_id === entityId ? { ...a, narrative } : a
      ),
    }));
  },
```

- [ ] **Step 3: Handle narrative_ready in PopulationDashboard SSE handler**

In `src/features/cohortisation/components/population-dashboard.tsx`, add `onNarrativeReady` to the store destructuring and handle the new event type in the flush buffer:

Add to store destructuring:
```typescript
    onBatchStarted, onItemsFlushed, onBatchComplete, onNarrativeReady,
```

In the `flushBuffer` function, add a case in the switch:
```typescript
          case "narrative_ready":
            onNarrativeReady(event.entity_id ?? "", (event.data.narrative as string) ?? "");
            break;
```

Update the SSE event type in `src/services/types/cohort.ts`:
```typescript
export interface SSEEvent {
  type: "batch_started" | "item_processed" | "item_failed" | "batch_complete" | "narrative_ready";
  entity_id?: string;
  data: Record<string, unknown>;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/cohortisation/components/risk-worklist.tsx src/stores/cohortisation-store.ts src/features/cohortisation/components/population-dashboard.tsx src/services/types/cohort.ts
git commit -m "feat: narrative tooltip on cohortisation table score + SSE narrative_ready handler"
```

---

### Task 6: Patient Detail — Risk Score KPI Card

**Files:**
- Modify: `src/features/patients/components/patient-kpi-strip.tsx`

- [ ] **Step 1: Add risk score as the first KPI card**

In `src/features/patients/components/patient-kpi-strip.tsx`, the component accepts `PatientDetail` which has `risk_score: number | null`. But we also need the cohort assignment data for the cohort badge. For now, use `risk_score` from the patient model.

Update the `kpis` array to add Risk Score as the first card. Replace the existing `kpis` array definition:

```typescript
  const kpis: KpiItem[] = [
    {
      label: "Risk Score",
      value: patient.risk_score != null ? String(patient.risk_score) : "--",
      valueClass: patient.risk_score != null
        ? patient.risk_score >= 70
          ? "text-status-error"
          : patient.risk_score >= 40
            ? "text-status-warning"
            : "text-status-success"
        : undefined,
    },
    {
      label: "Care Gaps",
      value: String(careGapCount),
      sub: patient.care_gaps?.slice(0, 2).join(", ") || undefined,
      valueClass: careGapCount > 0 ? "text-status-warning" : undefined,
    },
    {
      label: "Last Contact",
      value: daysAgo(patient.last_contact_date),
    },
    {
      label: "Lowest PDC",
      value: worstPdc ? `${Math.round(worstPdc.pdc * 100)}%` : "--",
      sub: worstPdc?.name,
      valueClass: pdcValueClass,
    },
    {
      label: "Review Due",
      value: patient.review_due_date ? formatDate(patient.review_due_date) : "--",
    },
  ];
```

Update the grid from `grid-cols-5` to `grid-cols-5` (stays 5, we replaced Pathway and Assigned To with Risk Score and Review Due to keep it at 5).

- [ ] **Step 2: Commit**

```bash
git add src/features/patients/components/patient-kpi-strip.tsx
git commit -m "feat: add Risk Score as first KPI card in patient detail strip"
```

---

### Task 7: AI Clinical Summary Card Component

**Files:**
- Create: `src/features/patients/components/ai-summary-card.tsx`

- [ ] **Step 1: Create the AI summary card component**

Create `src/features/patients/components/ai-summary-card.tsx`:

```tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import { streamAISummary } from "@/services/api/patients";
import type { AISummaryAction } from "@/services/types/patient";

interface AISummaryCardProps {
  patientId: string;
}

const URGENCY_CONFIG: Record<string, { dot: string; label: string }> = {
  urgent: { dot: "bg-red-500", label: "Urgent" },
  this_week: { dot: "bg-amber-500", label: "This week" },
  next_visit: { dot: "bg-blue-500", label: "Next visit" },
};

export function AISummaryCard({ patientId }: AISummaryCardProps) {
  const [streaming, setStreaming] = useState(false);
  const [text, setText] = useState("");
  const [actions, setActions] = useState<AISummaryAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  const handleGenerate = useCallback(() => {
    setText("");
    setActions([]);
    setError(null);
    setStreaming(true);
    setGenerated(false);

    let fullText = "";

    cancelRef.current = streamAISummary(
      patientId,
      (chunk) => {
        fullText += chunk;
        setText(fullText);
      },
      () => {
        setStreaming(false);
        setGenerated(true);
        // Try to parse actions from the accumulated text (LLM returns JSON)
        try {
          const parsed = JSON.parse(fullText);
          if (parsed.summary) setText(parsed.summary);
          if (parsed.actions) setActions(parsed.actions);
        } catch {
          // Text was streamed as plain text, not JSON — keep as-is
        }
      },
      (err) => {
        setStreaming(false);
        setError(err);
      },
    );
  }, [patientId]);

  return (
    <Card className="mt-3 border-border-default">
      <CardHeader className="flex flex-row items-center justify-between py-2.5 px-4">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-sm">&#10024;</span>
          AI Clinical Summary
        </CardTitle>
        {!streaming && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleGenerate}
          >
            {generated ? (
              <>
                <Icons.recurring className="mr-1.5 h-3 w-3" />
                Regenerate
              </>
            ) : (
              "Generate"
            )}
          </Button>
        )}
        {streaming && (
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <Icons.spinner className="h-3 w-3 animate-spin" />
            Generating...
          </span>
        )}
      </CardHeader>

      {(text || error) && (
        <CardContent className="px-4 pb-3 pt-0">
          {error ? (
            <p className="text-xs text-status-error">{error}</p>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-text-secondary whitespace-pre-wrap">
                {text}
                {streaming && <span className="animate-pulse">|</span>}
              </p>

              {actions.length > 0 && (
                <div className="mt-3 border-t border-border-default pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-placeholder mb-2">
                    Recommended Actions
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {actions.map((action, i) => {
                      const config = URGENCY_CONFIG[action.urgency] ?? URGENCY_CONFIG.next_visit;
                      return (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", config.dot)} />
                          <span className="flex-1 text-text-secondary">{action.text}</span>
                          <span className="shrink-0 rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] text-text-muted">
                            {config.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/patients/components/ai-summary-card.tsx
git commit -m "feat: AI Clinical Summary card component with streaming and actions"
```

---

### Task 8: Wire AI Summary Card into Patient Detail Page

**Files:**
- Modify: `src/app/dashboard/patients/[id]/page.tsx`

- [ ] **Step 1: Import and add AISummaryCard**

In `src/app/dashboard/patients/[id]/page.tsx`, add the import:

```typescript
import { AISummaryCard } from "@/features/patients/components/ai-summary-card";
```

Insert the card between `PatientKpiStrip` and `PatientTabs` (around line 88-89):

```tsx
      <PatientHeader patient={selectedPatient} diagnoses={diagnoses} />
      <PatientKpiStrip patient={selectedPatient} />
      <AISummaryCard patientId={id} />
      <PatientTabs patient={selectedPatient} labs={labs} initialTab={initialTab} />
```

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/patients/[id]/page.tsx
git commit -m "feat: wire AI summary card into patient detail page"
```
