# Real-Time Scoring via SSE

**Date**: 2026-04-10
**Status**: Approved

## Problem

When patients are bulk-imported or a recalculate is triggered, the cohortisation page has no way to show scoring progress. Users see stale data until they manually refresh. The goal is to stream scoring progress in real-time so KPI cards, the assignment table, and a progress bar all update live.

## Decision: SSE over WebSocket or Polling

SSE wins because:
- Server-to-client only (no bidirectional need)
- Already proven in the codebase (command center insights stream)
- Works through Next.js proxy without extra config
- Native `EventSource` with auto-reconnect

## Architecture

Four pieces, ordered by dependency:

```
1. Generic Event Bus (backend)     — in-memory pub/sub, tenant+channel scoped
2. Generic SSE Helper (backend)    — converts async iterator to StreamingResponse
3. Generic SSE Hook (frontend)     — useEventStream(channel, onEvent)
4. Cohortisation Wiring (both)     — the first consumer of the generic infra
```

---

## 1. Generic Event Bus

**File**: `backend/app/events/bus.py`

A singleton, in-memory, tenant+channel scoped pub/sub.

### Interface

```python
class EventBus:
    async def publish(tenant_id: UUID, channel: str, payload: dict) -> None
    def subscribe(tenant_id: UUID, channel: str) -> AsyncIterator[dict]
```

### Behavior

- `subscribe()` returns an async generator that yields dicts. Each subscriber gets its own `asyncio.Queue`.
- `publish()` pushes to all active subscribers matching `(tenant_id, channel)`.
- Subscriber cleanup is automatic when the async iterator exits (client disconnect, context manager exit).
- Channel is a free-form string — no enum, no registry. Convention-based: `"cohortisation"`, `"imports"`, etc.
- No persistence. Events are ephemeral. If nobody is listening, the event is dropped.
- Thread-safe via asyncio primitives only (no locks needed — single event loop).

### Event Envelope

Publishers send raw dicts. The bus does not enforce schema. Convention:

```json
{
  "type": "item_processed | item_failed | batch_started | batch_progress | batch_complete",
  "entity_id": "uuid-string (optional)",
  "data": { ... }
}
```

---

## 2. Generic SSE Helper

**File**: `backend/app/events/sse.py`

Converts an `AsyncIterator[dict]` into a `StreamingResponse` with SSE formatting.

### Interface

```python
def sse_response(events: AsyncIterator[dict], heartbeat_interval: int = 15) -> StreamingResponse
```

### Behavior

- Wraps the iterator in an async generator that yields `data: {json}\n\n` lines.
- Sends `:ping\n\n` every `heartbeat_interval` seconds to keep the connection alive.
- Sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
- On client disconnect, the generator exits cleanly.

### Usage (any router)

```python
@router.get("/stream")
async def stream(auth: AuthDep):
    events = event_bus.subscribe(auth.tenant_id, "cohortisation")
    return sse_response(events)
```

---

## 3. Generic SSE Hook (Frontend)

**File**: `src/hooks/use-event-stream.ts`

### Interface

```typescript
function useEventStream(channel: string, onEvent: (event: Record<string, unknown>) => void): {
  connected: boolean;
  error: string | null;
}
```

### Behavior

- Connects to `/api/${channel}/stream` using `EventSource`.
- Parses each `data:` line as JSON and calls `onEvent`.
- Auto-reconnects with exponential backoff (1s, 2s, 4s, max 30s) on disconnect.
- Cleans up on unmount.
- Returns reactive `connected` and `error` state.
- No channel-specific logic — fully generic.

---

## 4. Cohortisation Wiring

### 4a. Backend — Worker Publishes Events

**File changes**: `backend/app/workers/cohortisation_worker.py`

After each patient is scored (success or fail), publish to the event bus:

**On success:**
```json
{
  "type": "item_processed",
  "entity_id": "<patient_id>",
  "data": {
    "patient_name": "...",
    "score": 72,
    "cohort_id": "<uuid>",
    "cohort_name": "Tier 3",
    "cohort_color": "#f59e0b",
    "assignment_type": "engine",
    "program_id": "<uuid>",
    "program_name": "Diabetes Care"
  }
}
```

**On failure:**
```json
{
  "type": "item_failed",
  "entity_id": "<patient_id>",
  "data": {
    "patient_name": "...",
    "error": "KeyError: 'field'"
  }
}
```

**Batch lifecycle events** (published by the recalculate endpoint and worker):

| Event | Published by | Payload |
|---|---|---|
| `batch_started` | Recalculate endpoint | `{total: 100, scope: "all"}` |
| `batch_progress` | Worker (end of each poll) | `{processed: 50, failed: 2, total: 100}` |
| `batch_complete` | Worker (no more pending) | `{processed: 98, failed: 2, total: 100}` |

Batch tracking: the recalculate endpoint writes `total` to a lightweight in-memory dict keyed by `(tenant_id, channel)`. The worker increments counters as it processes. When `processed + failed == total`, it publishes `batch_complete`.

### 4b. Backend — Recalculate Endpoint Update

**File**: `backend/app/routers/cohortisation.py`

Update `POST /api/cohortisation/recalculate`:

- Accept `scope` in request body: `"all"` (re-queue every patient) or `"unassigned"` (only patients without a current assignment).
- After emitting events, publish `batch_started` to the event bus.
- Response: `{events_created: int, scope: string}`.

### 4c. Backend — SSE Endpoint

**File**: `backend/app/routers/cohortisation.py`

```python
@router.get("/stream")
async def stream(auth: AuthDep):
    events = event_bus.subscribe(auth.tenant_id, "cohortisation")
    return sse_response(events)
```

### 4d. Frontend — Cohortisation Page

**Store updates** (`src/stores/cohortisation-store.ts`):

Add actions for real-time events:
- `onBatchStarted(total)` — set `isBatchActive`, `batchTotal`, reset counters
- `onItemProcessed(data)` — increment `batchProcessed`, upsert assignment row, update KPI cards (decrement unassigned, recalc avg score)
- `onItemFailed(data)` — increment `batchFailed`, add row with failed status
- `onBatchComplete(summary)` — clear `isBatchActive`, show summary

**UI components**:

- `<BatchProgressBar />` — generic progress bar. Props: `processed`, `failed`, `total`, `active`. Shows at top of page when `active=true`. Renders: progress bar fill, "Scoring 45/100 patients... (2 failed)" text.
- Assignment table: rows upsert in real-time as `item_processed` events arrive. New rows get a subtle fade-in. Failed rows show a red "Failed" badge in the score column.
- KPI cards: `members`, `unassigned`, `pending_rescore` update live as events stream in.
- Recalculate button: dropdown with "All patients" / "Unassigned only". Disabled while `isBatchActive`.

---

## What This Does NOT Include

- **Persistence of events** — bus is in-memory only. Missed events (e.g. page wasn't open) are gone. The page does a full data fetch on mount anyway.
- **Multi-server broadcast** — in-memory queue means single-process only. Fine for prototype. Redis pub/sub is the obvious upgrade path.
- **Bulk patient import API** — that's a separate feature. When it exists, it publishes to the same bus.
- **Real-time on other pages** — cohortisation page only for now.
- **CSV upload UI** — future work. API-first for now.

---

## File Inventory

| File | Action | Purpose |
|---|---|---|
| `backend/app/events/__init__.py` | Create | Package |
| `backend/app/events/bus.py` | Create | Generic event bus |
| `backend/app/events/sse.py` | Create | Generic SSE helper |
| `backend/app/workers/cohortisation_worker.py` | Modify | Publish events after scoring |
| `backend/app/routers/cohortisation.py` | Modify | Add `/stream` endpoint, update recalculate with scope |
| `backend/app/schemas/cohort.py` | Modify | Add scope to RecalculateRequest |
| `src/hooks/use-event-stream.ts` | Create | Generic SSE hook |
| `src/stores/cohortisation-store.ts` | Modify | Add real-time event handlers |
| `src/app/dashboard/cohortisation/page.tsx` | Modify | Wire up SSE + progress bar |
| `src/components/shared/batch-progress-bar.tsx` | Create | Generic progress bar component |
