# Real-Time Scoring via SSE — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stream scoring progress in real-time on the cohortisation page via SSE, with a generic event bus reusable by any feature.

**Architecture:** Generic in-memory pub/sub (`EventBus`) publishes events per tenant+channel. A generic SSE helper converts any async iterator to `StreamingResponse`. The cohortisation worker is the first publisher; the cohortisation page is the first consumer via `fetch` + `getReader()`.

**Tech Stack:** Python asyncio (Queue-based pub/sub), FastAPI StreamingResponse, TypeScript fetch/ReadableStream, Zustand store.

---

## File Inventory

| File | Action | Purpose |
|---|---|---|
| `backend/app/events/__init__.py` | Create | Package init, exports `event_bus` singleton |
| `backend/app/events/bus.py` | Create | Generic tenant+channel event bus |
| `backend/app/events/sse.py` | Create | Generic SSE StreamingResponse helper |
| `backend/app/workers/cohortisation_worker.py` | Modify | Publish events after each patient scores |
| `backend/app/routers/cohortisation.py` | Modify | Add `/stream` SSE endpoint, update recalculate with `scope` |
| `backend/app/schemas/cohort.py` | Modify | Add `scope` to `RecalculateRequest`, update `RecalculateResponse` |
| `src/services/api/cohortisation.ts` | Modify | Add `streamScoring()` SSE client function, update `recalculateAll` |
| `src/services/types/cohort.ts` | Modify | Add SSE event types, update `RecalculateResponse` |
| `src/stores/cohortisation-store.ts` | Modify | Add batch state + real-time event handlers |
| `src/config/api.ts` | Modify | Add `stream` endpoint |
| `src/features/cohortisation/components/batch-progress-bar.tsx` | Create | Generic progress bar component |
| `src/features/cohortisation/components/population-dashboard.tsx` | Modify | Wire SSE stream + progress bar + recalculate dropdown |
| `src/features/cohortisation/components/risk-pool-table.tsx` | Modify | Handle live row inserts + failed badge |

---

### Task 1: Generic Event Bus

**Files:**
- Create: `backend/app/events/__init__.py`
- Create: `backend/app/events/bus.py`

- [ ] **Step 1: Create the event bus module**

Create `backend/app/events/bus.py`:

```python
"""Generic in-memory pub/sub event bus, scoped by tenant + channel."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import AsyncIterator
from uuid import UUID


class EventBus:
    """Tenant+channel scoped pub/sub. Subscribers get their own asyncio.Queue."""

    def __init__(self) -> None:
        self._subscribers: dict[tuple[UUID, str], list[asyncio.Queue]] = defaultdict(list)

    async def publish(self, tenant_id: UUID, channel: str, payload: dict) -> None:
        key = (tenant_id, channel)
        for queue in self._subscribers.get(key, []):
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                pass  # drop if subscriber is slow

    async def subscribe(self, tenant_id: UUID, channel: str) -> AsyncIterator[dict]:
        key = (tenant_id, channel)
        queue: asyncio.Queue[dict] = asyncio.Queue(maxsize=256)
        self._subscribers[key].append(queue)
        try:
            while True:
                yield await queue.get()
        finally:
            self._subscribers[key].remove(queue)
            if not self._subscribers[key]:
                del self._subscribers[key]
```

- [ ] **Step 2: Create the package init with singleton**

Create `backend/app/events/__init__.py`:

```python
from app.events.bus import EventBus

event_bus = EventBus()
```

- [ ] **Step 3: Verify import works**

Run: `docker-compose exec backend python -c "from app.events import event_bus; print(type(event_bus))"`

Expected: `<class 'app.events.bus.EventBus'>`

- [ ] **Step 4: Commit**

```bash
git add backend/app/events/
git commit -m "feat: generic in-memory event bus with tenant+channel pub/sub"
```

---

### Task 2: Generic SSE Helper

**Files:**
- Create: `backend/app/events/sse.py`

- [ ] **Step 1: Create the SSE helper**

Create `backend/app/events/sse.py`:

```python
"""Generic SSE helper — converts an async event iterator to a StreamingResponse."""

from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

from starlette.responses import StreamingResponse


async def _sse_generator(
    events: AsyncIterator[dict],
    heartbeat_interval: int = 15,
) -> AsyncIterator[str]:
    """Wrap an event iterator in SSE format with periodic heartbeats."""
    try:
        while True:
            try:
                event = await asyncio.wait_for(
                    events.__anext__(), timeout=heartbeat_interval
                )
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                yield ":ping\n\n"
            except StopAsyncIteration:
                break
    except asyncio.CancelledError:
        return


def sse_response(
    events: AsyncIterator[dict],
    heartbeat_interval: int = 15,
) -> StreamingResponse:
    """Create a StreamingResponse from an async event iterator."""
    return StreamingResponse(
        _sse_generator(events, heartbeat_interval),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/events/sse.py
git commit -m "feat: generic SSE StreamingResponse helper with heartbeat"
```

---

### Task 3: Backend — Recalculate Endpoint with Scope + SSE Stream

**Files:**
- Modify: `backend/app/schemas/cohort.py` (RecalculateRequest, RecalculateResponse)
- Modify: `backend/app/routers/cohortisation.py` (update recalculate, add /stream)

- [ ] **Step 1: Update schemas**

In `backend/app/schemas/cohort.py`, update `RecalculateRequest` and `RecalculateResponse`:

```python
class RecalculateRequest(BaseModel):
    patient_ids: list[str] | None = None
    scope: str = "unassigned"  # "all" | "unassigned"


class RecalculateResponse(BaseModel):
    events_created: int
    scope: str
```

- [ ] **Step 2: Update the recalculate endpoint to support scope**

In `backend/app/routers/cohortisation.py`, update the `recalculate` function. Replace the existing implementation:

```python
@router.post("/recalculate", response_model=RecalculateResponse)
async def recalculate(
    data: RecalculateRequest | None = None,
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
):
    scope = data.scope if data else "unassigned"

    if data and data.patient_ids:
        patient_ids = [uuid.UUID(pid) for pid in data.patient_ids]
    elif scope == "unassigned":
        # Only patients without a current assignment in any active program
        from app.models.cohort import CohortAssignment
        assigned_sub = (
            select(CohortAssignment.patient_id)
            .where(CohortAssignment.is_current == True)
            .scalar_subquery()
        )
        result = await db.execute(
            select(Patient.id).where(
                Patient.tenant_id == auth.tenant_id,
                Patient.is_active == True,
                Patient.id.notin_(assigned_sub),
            )
        )
        patient_ids = [row[0] for row in result.all()]
    else:
        # All active patients
        result = await db.execute(
            select(Patient.id).where(
                Patient.tenant_id == auth.tenant_id,
                Patient.is_active == True,
            )
        )
        patient_ids = [row[0] for row in result.all()]

    count = await emit_bulk_events(db, auth.tenant_id, patient_ids)
    await db.commit()

    # Publish batch_started to event bus
    from app.events import event_bus
    await event_bus.publish(auth.tenant_id, "cohortisation", {
        "type": "batch_started",
        "data": {"total": count, "scope": scope},
    })

    return RecalculateResponse(events_created=count, scope=scope)
```

- [ ] **Step 3: Add the SSE stream endpoint**

In `backend/app/routers/cohortisation.py`, add a new endpoint at the top of the router (after imports):

Add these imports at the top of the file:

```python
from app.events import event_bus
from app.events.sse import sse_response
```

Add the endpoint:

```python
@router.get("/stream")
async def stream(
    auth: AuthContext = Depends(get_auth),
):
    events = event_bus.subscribe(auth.tenant_id, "cohortisation")
    return sse_response(events)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/schemas/cohort.py backend/app/routers/cohortisation.py
git commit -m "feat: cohortisation SSE stream endpoint + recalculate with scope"
```

---

### Task 4: Worker — Publish Scoring Events

**Files:**
- Modify: `backend/app/workers/cohortisation_worker.py`

- [ ] **Step 1: Add event bus import**

At the top of `backend/app/workers/cohortisation_worker.py`, add:

```python
from app.events import event_bus
```

- [ ] **Step 2: Publish per-patient events in `_process_batch`**

Replace the processing loop in `_process_batch` (the `for event in events:` block, lines ~76-85) with:

```python
    processed = 0
    failed = 0
    for event in events:
        try:
            result_data = await _process_event(db, event)
            event.status = "completed"
            event.processed_at = datetime.now(timezone.utc)
            processed += 1

            if result_data:
                await event_bus.publish(event.tenant_id, "cohortisation", {
                    "type": "item_processed",
                    "entity_id": str(event.patient_id),
                    "data": result_data,
                })
        except Exception as exc:
            logger.exception(f"Failed to process event {event.id}")
            event.status = "failed"
            event.error = str(exc)
            failed += 1

            await event_bus.publish(event.tenant_id, "cohortisation", {
                "type": "item_failed",
                "entity_id": str(event.patient_id),
                "data": {"error": str(exc)},
            })

    await db.commit()

    # Check if batch is complete (no more pending events)
    remaining = await db.execute(
        select(CohortisationEvent)
        .where(CohortisationEvent.status == "pending")
        .limit(1)
    )
    if not remaining.scalar_one_or_none() and (processed + failed) > 0:
        # Get tenant_id from last event processed
        tid = events[0].tenant_id
        await event_bus.publish(tid, "cohortisation", {
            "type": "batch_complete",
            "data": {"processed": processed, "failed": failed},
        })

    return processed + failed
```

- [ ] **Step 3: Update `_assign_patient_to_program` to return result data**

At the end of `_assign_patient_to_program` (after `await db.flush()`), add a return statement. Change the function signature to return `dict | None`:

```python
async def _assign_patient_to_program(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    patient: Patient,
    patient_data,
    program: Program,
) -> dict | None:
```

At the very end of the function (after `await db.flush()`), add:

```python
    return {
        "patient_name": f"{patient.first_name} {patient.last_name}",
        "score": assignment.score,
        "cohort_id": str(matched_cohort.id),
        "cohort_name": matched_cohort.name,
        "cohort_color": matched_cohort.color or "#e2e8f0",
        "assignment_type": assignment_type,
        "program_id": str(program.id),
        "program_name": program.name,
        "assigned_at": assignment.assigned_at.isoformat(),
        "review_due_at": assignment.review_due_at.isoformat() if assignment.review_due_at else None,
    }
```

Also update the early returns in the function to return `None`:
- `if not cohorts: return None`
- `if not matched_cohort: return None`
- `if current and current.cohort_id == matched_cohort.id: return None`

- [ ] **Step 4: Update `_process_event` to collect and return results**

`_process_event` currently calls `_assign_patient_to_program` for each program but doesn't return anything. Update it to return the first successful result (for the SSE event):

At the end of the `for program in programs:` loop, capture and return the result:

```python
async def _process_event(db: AsyncSession, event: CohortisationEvent) -> dict | None:
    """Process a single cohortisation event — score patient against all active programs."""
    # ... existing patient loading code stays the same ...

    last_result = None
    for program in programs:
        result = await _assign_patient_to_program(db, event.tenant_id, patient, patient_data, program)
        if result:
            last_result = result
    return last_result
```

- [ ] **Step 5: Verify backend starts without errors**

Run: `docker-compose up --build backend`

Expected: Backend starts, worker runs, no import errors.

- [ ] **Step 6: Commit**

```bash
git add backend/app/workers/cohortisation_worker.py
git commit -m "feat: cohortisation worker publishes scoring events to event bus"
```

---

### Task 5: Frontend — SSE Event Types + API Config

**Files:**
- Modify: `src/services/types/cohort.ts`
- Modify: `src/config/api.ts`
- Modify: `src/services/api/cohortisation.ts`

- [ ] **Step 1: Add SSE event types**

In `src/services/types/cohort.ts`, add at the bottom:

```typescript
export interface ScoringEventData {
  patient_name: string;
  score: number | null;
  cohort_id: string;
  cohort_name: string;
  cohort_color: string;
  assignment_type: string;
  program_id: string;
  program_name: string;
  assigned_at: string;
  review_due_at: string | null;
}

export interface SSEEvent {
  type: "batch_started" | "item_processed" | "item_failed" | "batch_complete";
  entity_id?: string;
  data: Record<string, unknown>;
}
```

Update `RecalculateResponse`:

```typescript
export interface RecalculateResponse {
  events_created: number;
  scope: string;
}
```

- [ ] **Step 2: Add stream endpoint to API config**

In `src/config/api.ts`, update the cohortisation section:

```typescript
cohortisation: {
  dashboard: "/api/cohortisation/dashboard",
  recalculate: "/api/cohortisation/recalculate",
  assignments: "/api/cohortisation/assignments",
  distribution: (programId: string) => `/api/cohortisation/distribution/${programId}`,
  stream: "/api/cohortisation/stream",
},
```

- [ ] **Step 3: Add SSE stream client function and update recalculate**

In `src/services/api/cohortisation.ts`, add the stream function and update `recalculateAll`:

```typescript
import type {
  AssignmentListResponse,
  CohortDistribution,
  DashboardStats,
  RecalculateResponse,
  SSEEvent,
} from "../types/cohort";

export async function recalculateAll(
  patientIds?: string[],
  scope: "all" | "unassigned" = "unassigned",
): Promise<RecalculateResponse> {
  return apiRequest<RecalculateResponse>({
    method: "POST",
    path: API_ENDPOINTS.cohortisation.recalculate,
    body: patientIds ? { patient_ids: patientIds, scope } : { scope },
  });
}

export function streamScoring(
  onEvent: (event: SSEEvent) => void,
  onError?: (error: string) => void,
): () => void {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const streamBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  let cancelled = false;

  (async () => {
    try {
      const resp = await fetch(`${streamBase}${API_ENDPOINTS.cohortisation.stream}`, {
        method: "GET",
        headers,
      });

      if (!resp.ok) {
        onError?.(`Stream failed: ${resp.status}`);
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
            const event = JSON.parse(line.slice(6)) as SSEEvent;
            onEvent(event);
          } catch {
            // skip malformed
          }
        }
      }
    } catch (err) {
      if (!cancelled) onError?.(String(err));
    }
  })();

  return () => { cancelled = true; };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/services/types/cohort.ts src/config/api.ts src/services/api/cohortisation.ts
git commit -m "feat: SSE event types, stream endpoint config, and streaming client"
```

---

### Task 6: Frontend — Zustand Store Real-Time Handlers

**Files:**
- Modify: `src/stores/cohortisation-store.ts`

- [ ] **Step 1: Add batch state and real-time actions to the store**

In `src/stores/cohortisation-store.ts`, update the interface and implementation.

Add to the interface (after `lastRecalcResult`):

```typescript
  // Real-time batch
  batchActive: boolean;
  batchTotal: number;
  batchProcessed: number;
  batchFailed: number;

  // Real-time actions
  onBatchStarted: (total: number) => void;
  onItemProcessed: (entityId: string, data: Record<string, unknown>) => void;
  onItemFailed: (entityId: string) => void;
  onBatchComplete: () => void;
```

Add to the initial state (after `lastRecalcResult: null`):

```typescript
  batchActive: false,
  batchTotal: 0,
  batchProcessed: 0,
  batchFailed: 0,
```

Add the action implementations:

```typescript
  onBatchStarted: (total: number) => {
    set({ batchActive: true, batchTotal: total, batchProcessed: 0, batchFailed: 0 });
  },

  onItemProcessed: (entityId: string, data: Record<string, unknown>) => {
    set((s) => {
      const newProcessed = s.batchProcessed + 1;
      const stats = s.stats
        ? {
            ...s.stats,
            assigned: s.stats.assigned + 1,
            unassigned: Math.max(0, s.stats.unassigned - 1),
          }
        : s.stats;

      // Upsert into assignments list
      const record = {
        id: entityId,
        patient_id: entityId,
        patient_name: (data.patient_name as string) ?? "",
        program_id: (data.program_id as string) ?? "",
        program_name: (data.program_name as string) ?? null,
        cohort_id: (data.cohort_id as string) ?? "",
        cohort_name: (data.cohort_name as string) ?? "",
        cohort_color: (data.cohort_color as string) ?? "#e2e8f0",
        score: (data.score as number) ?? null,
        score_breakdown: null,
        assignment_type: (data.assignment_type as string) ?? "engine",
        reason: null,
        previous_cohort_id: null,
        assigned_at: (data.assigned_at as string) ?? new Date().toISOString(),
        review_due_at: (data.review_due_at as string) ?? null,
      };

      const existing = s.assignments.findIndex((a) => a.patient_id === entityId);
      const assignments =
        existing >= 0
          ? s.assignments.map((a, i) => (i === existing ? record : a))
          : [record, ...s.assignments];

      return { batchProcessed: newProcessed, stats, assignments };
    });
  },

  onItemFailed: (entityId: string) => {
    set((s) => ({ batchFailed: s.batchFailed + 1 }));
  },

  onBatchComplete: () => {
    set({ batchActive: false });
  },
```

Update the `recalculate` action to accept `scope`:

```typescript
  recalculate: async (patientIds, scope = "unassigned") => {
    set({ recalculating: true });
    try {
      const result = await recalculateAll(patientIds, scope);
      set({ recalculating: false, lastRecalcResult: result });
      return result;
    } catch {
      set({ recalculating: false });
      return null;
    }
  },
```

And update the `recalculate` type in the interface:

```typescript
  recalculate: (patientIds?: string[], scope?: "all" | "unassigned") => Promise<RecalculateResponse | null>;
```

Update the `reset` action to include new fields:

```typescript
  reset: () => set({
    stats: null, statsLoading: false,
    programs: [], programsLoading: false, programsError: null,
    distributions: {},
    assignments: [], assignmentsTotal: 0, assignmentsPage: 1, assignmentsPages: 1, assignmentsLoading: false,
    recalculating: false, lastRecalcResult: null,
    batchActive: false, batchTotal: 0, batchProcessed: 0, batchFailed: 0,
  }),
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/cohortisation-store.ts
git commit -m "feat: cohortisation store real-time batch state and event handlers"
```

---

### Task 7: Frontend — Batch Progress Bar Component

**Files:**
- Create: `src/features/cohortisation/components/batch-progress-bar.tsx`

- [ ] **Step 1: Create the progress bar component**

Create `src/features/cohortisation/components/batch-progress-bar.tsx`:

```tsx
"use client";

import { cn } from "@/lib/cn";
import { Icons } from "@/config/icons";

interface BatchProgressBarProps {
  processed: number;
  failed: number;
  total: number;
  active: boolean;
}

export function BatchProgressBar({ processed, failed, total, active }: BatchProgressBarProps) {
  if (!active || total === 0) return null;

  const pct = Math.round(((processed + failed) / total) * 100);

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-indigo-700">
          <Icons.spinner className="h-4 w-4 animate-spin" />
          Scoring {processed + failed} / {total} patients...
        </span>
        <span className="tabular-nums text-indigo-600">{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-indigo-100">
        <div
          className="flex h-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        >
          {processed > 0 && (
            <div
              className="bg-indigo-500"
              style={{ width: `${(processed / (processed + failed || 1)) * 100}%` }}
            />
          )}
          {failed > 0 && (
            <div
              className="bg-red-400"
              style={{ width: `${(failed / (processed + failed || 1)) * 100}%` }}
            />
          )}
        </div>
      </div>
      {failed > 0 && (
        <p className="mt-1.5 text-xs text-red-600">{failed} failed</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/cohortisation/components/batch-progress-bar.tsx
git commit -m "feat: batch progress bar component for real-time scoring"
```

---

### Task 8: Frontend — Wire SSE into Cohortisation Page

**Files:**
- Modify: `src/features/cohortisation/components/population-dashboard.tsx`
- Modify: `src/features/cohortisation/components/risk-pool-table.tsx`

- [ ] **Step 1: Add SSE stream connection and progress bar to PopulationDashboard**

In `src/features/cohortisation/components/population-dashboard.tsx`:

Add imports at the top:

```typescript
import { useEffect, useRef, useState } from "react";
import { streamScoring } from "@/services/api/cohortisation";
import { BatchProgressBar } from "./batch-progress-bar";
import type { SSEEvent } from "@/services/types/cohort";
```

Remove the existing `import { useState } from "react";` line.

Inside the `PopulationDashboard` component, add the SSE connection and recalculate dropdown. After the existing store destructuring, add:

```typescript
  const {
    stats, statsLoading, programs, programsLoading, distributions, loadPrograms,
    loadDashboard, loadAssignments,
    batchActive, batchTotal, batchProcessed, batchFailed,
    onBatchStarted, onItemProcessed, onItemFailed, onBatchComplete,
    recalculate, recalculating,
  } = useCohortisationStore();

  // SSE stream connection
  const disconnectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const handleEvent = (event: SSEEvent) => {
      switch (event.type) {
        case "batch_started":
          onBatchStarted((event.data.total as number) ?? 0);
          break;
        case "item_processed":
          onItemProcessed(event.entity_id ?? "", event.data);
          break;
        case "item_failed":
          onItemFailed(event.entity_id ?? "");
          break;
        case "batch_complete":
          onBatchComplete();
          // Refresh full data after batch completes
          loadDashboard();
          loadAssignments();
          break;
      }
    };

    disconnectRef.current = streamScoring(handleEvent);
    return () => {
      disconnectRef.current?.();
    };
  }, [onBatchStarted, onItemProcessed, onItemFailed, onBatchComplete, loadDashboard, loadAssignments]);
```

Replace the existing `PageHeader` actions prop with a recalculate dropdown + create button:

```tsx
<PageHeader
  title="Cohortisation"
  description="Stratify patients into risk cohorts, assign scoring engines, and track population shifts"
  actions={
    <div className="flex items-center gap-2">
      <Select
        disabled={recalculating || batchActive}
        onValueChange={(scope) => recalculate(undefined, scope as "all" | "unassigned")}
      >
        <SelectTrigger className="h-9 w-fit gap-1.5 rounded-lg px-3 text-xs">
          {recalculating || batchActive ? (
            <Icons.spinner className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Icons.recurring className="h-3.5 w-3.5" />
          )}
          <span>Recalculate</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">Unassigned Only</SelectItem>
          <SelectItem value="all">All Patients</SelectItem>
        </SelectContent>
      </Select>
      <Button onClick={() => setDialogOpen(true)}>
        <Icons.plus className="mr-1.5 h-4 w-4" />
        Create Program
      </Button>
    </div>
  }
/>
```

Add the `Select` imports at the top (they're already available in the project, used in risk-pool-table):

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
```

Add the progress bar right after the KPI strip:

```tsx
      {/* Batch Progress */}
      <BatchProgressBar
        processed={batchProcessed}
        failed={batchFailed}
        total={batchTotal}
        active={batchActive}
      />
```

- [ ] **Step 2: Add failed badge support to RiskPoolTable**

In `src/features/cohortisation/components/risk-pool-table.tsx`, the table already renders from `assignments` in the store. Since failed items don't create assignments (they publish `item_failed` events without adding to the table), no changes are needed for the table rows themselves. The store's `onItemProcessed` handles upserting successful rows.

No code changes needed here — the existing table will render new rows as they appear in the store.

- [ ] **Step 3: Verify the full stack**

Run: `docker-compose down -v && docker-compose up --build`

Expected:
1. Backend starts, seeds 500 patients with program status="active"
2. Worker processes events, publishes to event bus
3. Frontend cohortisation page connects to SSE stream
4. Progress bar appears and fills as patients are scored
5. KPI cards update in real-time
6. Assignment table rows appear live

- [ ] **Step 4: Commit**

```bash
git add src/features/cohortisation/components/population-dashboard.tsx
git commit -m "feat: wire SSE stream into cohortisation page with progress bar and recalculate dropdown"
```

---

### Task 9: Fix the datetime bug in command_center_service.py

**Files:**
- Modify: `backend/app/services/command_center_service.py`

This was identified during the earlier debugging session — `get_upcoming_reviews` uses naive datetime that crashes against timezone-aware DB values.

- [ ] **Step 1: Fix the datetime**

In `backend/app/services/command_center_service.py`, the line:

```python
    now = datetime.now(timezone.utc).replace(tzinfo=None)
```

at the `get_upcoming_reviews` function should be:

```python
    now = datetime.now(timezone.utc)
```

(This was already applied in the working tree but should be committed.)

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/command_center_service.py
git commit -m "fix: use timezone-aware datetime in get_upcoming_reviews"
```

---

### Task 10: Commit seed data fixes

**Files:**
- Modify: `backend/app/services/diabetes_seed.py` (already modified in working tree)

These fixes were applied during debugging — program status and scoring engine config structure.

- [ ] **Step 1: Commit the seed fixes**

```bash
git add backend/app/services/diabetes_seed.py
git commit -m "fix: seed diabetes program with status=active and structured scoring engine config"
```
