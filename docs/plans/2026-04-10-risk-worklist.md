# Risk Worklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Patient Assignments table on the Cohortisation page with a risk-focused worklist that shows at-risk patients above a score threshold, with PDC adherence, review urgency, cohort migration trend, and inline actions (send comms, view pathway, re-score).

**Architecture:** Enrich the existing `/api/cohortisation/assignments` endpoint with `min_score` filter, `pdc_worst`, and `previous_cohort_name` fields (Option A — one endpoint, one call). Replace the frontend `RiskPoolTable` component with a new `RiskWorklist` component. Add a small `SendCommsDialog` for the inline send action.

**Tech Stack:** FastAPI + SQLAlchemy (backend), React + Zustand + shadcn/ui (frontend)

---

### Task 1: Enrich backend AssignmentRecord schema with new fields

**Files:**
- Modify: `backend/app/schemas/cohort.py:51-65` (AssignmentRecord)

- [ ] **Step 1: Add new fields to AssignmentRecord schema**

In `backend/app/schemas/cohort.py`, add three new fields to the `AssignmentRecord` class:

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
    previous_cohort_id: str | None
    previous_cohort_name: str | None          # NEW
    pdc_worst: float | None                   # NEW — worst PDC across active meds
    assigned_at: str
    review_due_at: str | None
```

- [ ] **Step 2: Verify backend still starts**

Run: `cd backend && .venv/bin/python -c "from app.schemas.cohort import AssignmentRecord; print('OK')"`
Expected: `OK`

---

### Task 2: Add min_score filter and enrich assignment query

**Files:**
- Modify: `backend/app/services/cohort_service.py:179-215` (get_assignments)
- Modify: `backend/app/routers/cohortisation.py:58-99` (assignments_list endpoint)

- [ ] **Step 1: Add min_score parameter to get_assignments service**

In `backend/app/services/cohort_service.py`, update `get_assignments`:

```python
async def get_assignments(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
    program_id: uuid.UUID | None = None,
    cohort_id: uuid.UUID | None = None,
    min_score: int | None = None,               # NEW
) -> dict:
    base = select(CohortAssignment).where(
        CohortAssignment.tenant_id == tenant_id,
        CohortAssignment.is_current == True,
    )
    if program_id:
        base = base.where(CohortAssignment.program_id == program_id)
    if cohort_id:
        base = base.where(CohortAssignment.cohort_id == cohort_id)
    if min_score is not None:                     # NEW
        base = base.where(CohortAssignment.score >= min_score)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar_one()

    result = await db.execute(
        base.options(
            selectinload(CohortAssignment.patient),
            selectinload(CohortAssignment.cohort),
        )
        .order_by(CohortAssignment.score.desc().nullslast())   # CHANGED: sort by score desc
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = list(result.scalars().all())

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if page_size else 0,
    }
```

- [ ] **Step 2: Add min_score query param to the router**

In `backend/app/routers/cohortisation.py`, update the `assignments_list` endpoint:

```python
@router.get("/assignments", response_model=AssignmentListResponse)
async def assignments_list(
    auth: AuthContext = Depends(get_auth),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    program_id: uuid.UUID | None = None,
    cohort_id: uuid.UUID | None = None,
    min_score: int | None = None,                # NEW
):
    result = await get_assignments(
        db, auth.tenant_id, page, page_size, program_id, cohort_id, min_score,
    )
```

- [ ] **Step 3: Enrich response items with pdc_worst and previous_cohort_name**

In the same `assignments_list` function in `backend/app/routers/cohortisation.py`, update the item-building loop. We need to look up the previous cohort name and compute worst PDC from the patient's active_medications JSON:

```python
    # Build a map of cohort IDs to names for previous_cohort lookups
    prev_cohort_ids = {a.previous_cohort_id for a in result["items"] if a.previous_cohort_id}
    prev_cohort_map: dict[uuid.UUID, str] = {}
    if prev_cohort_ids:
        from app.models.cohort import Cohort
        prev_result = await db.execute(
            select(Cohort.id, Cohort.name).where(Cohort.id.in_(prev_cohort_ids))
        )
        prev_cohort_map = {row.id: row.name for row in prev_result.all()}

    items = []
    for a in result["items"]:
        patient_name = ""
        if a.patient:
            patient_name = f"{a.patient.first_name} {a.patient.last_name}"
        cohort_name = a.cohort.name if a.cohort else ""
        cohort_color = a.cohort.color if a.cohort else "#e2e8f0"

        # Compute worst PDC from patient's active medications
        pdc_worst: float | None = None
        if a.patient and a.patient.active_medications:
            pdc_vals = [
                m.get("pdc_90day") for m in a.patient.active_medications
                if isinstance(m, dict) and m.get("pdc_90day") is not None
            ]
            if pdc_vals:
                pdc_worst = min(pdc_vals)

        items.append(AssignmentRecord(
            id=str(a.id),
            patient_id=str(a.patient_id),
            patient_name=patient_name,
            program_id=str(a.program_id),
            cohort_id=str(a.cohort_id),
            cohort_name=cohort_name,
            cohort_color=cohort_color,
            score=a.score,
            score_breakdown=a.score_breakdown,
            assignment_type=a.assignment_type,
            reason=a.reason,
            previous_cohort_id=str(a.previous_cohort_id) if a.previous_cohort_id else None,
            previous_cohort_name=prev_cohort_map.get(a.previous_cohort_id) if a.previous_cohort_id else None,
            pdc_worst=round(pdc_worst, 2) if pdc_worst is not None else None,
            assigned_at=a.assigned_at.isoformat() if a.assigned_at else "",
            review_due_at=a.review_due_at.isoformat() if a.review_due_at else None,
        ))
```

- [ ] **Step 4: Verify endpoint works**

Run: `cd backend && .venv/bin/python -c "from app.routers.cohortisation import router; print('OK')"`
Expected: `OK`

---

### Task 3: Update frontend types and API client

**Files:**
- Modify: `src/services/types/cohort.ts:16-32` (AssignmentRecord)
- Modify: `src/services/api/cohortisation.ts:22-33` (fetchAssignments)
- Modify: `src/stores/cohortisation-store.ts:35,84-97` (loadAssignments)

- [ ] **Step 1: Add new fields to frontend AssignmentRecord type**

In `src/services/types/cohort.ts`:

```typescript
export interface AssignmentRecord {
  id: string;
  patient_id: string;
  patient_name: string;
  program_id: string;
  program_name: string | null;
  cohort_id: string;
  cohort_name: string;
  cohort_color: string;
  score: number | null;
  score_breakdown: Record<string, { raw: number; weighted: number }> | null;
  assignment_type: string;
  reason: string | null;
  previous_cohort_id: string | null;
  previous_cohort_name: string | null;       // NEW
  pdc_worst: number | null;                  // NEW
  assigned_at: string;
  review_due_at: string | null;
}
```

- [ ] **Step 2: Add min_score to fetchAssignments params**

In `src/services/api/cohortisation.ts`:

```typescript
export async function fetchAssignments(params?: {
  page?: number;
  page_size?: number;
  program_id?: string;
  cohort_id?: string;
  min_score?: number;                        // NEW
}): Promise<AssignmentListResponse> {
  return apiRequest<AssignmentListResponse>({
    method: "GET",
    path: API_ENDPOINTS.cohortisation.assignments,
    params,
  });
}
```

- [ ] **Step 3: Add min_score to store's loadAssignments**

In `src/stores/cohortisation-store.ts`, update the `loadAssignments` signature and the store interface:

```typescript
// In the interface:
loadAssignments: (params?: { page?: number; program_id?: string; cohort_id?: string; min_score?: number }) => Promise<void>;

// In the implementation (already passes params through, no change needed to the body)
```

---

### Task 4: Build the RiskWorklist component (replace RiskPoolTable)

**Files:**
- Create: `src/features/cohortisation/components/risk-worklist.tsx`
- Modify: `src/features/cohortisation/components/population-dashboard.tsx:23,138-147`

- [ ] **Step 1: Create risk-worklist.tsx**

Create `src/features/cohortisation/components/risk-worklist.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/config/icons";
import { scoreColor } from "@/config/status";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { SendCommsDialog } from "./send-comms-dialog";
import { toast } from "sonner";

const ALL_VALUE = "__all__";
const DEFAULT_MIN_SCORE = 50;

function reviewUrgency(dateStr: string | null): { className: string; label: string } {
  if (!dateStr) return { className: "text-text-placeholder", label: "--" };
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0) return { className: "text-red-600 font-semibold", label: `${Math.abs(days)}d overdue` };
  if (days <= 3) return { className: "text-red-600", label: `${days}d` };
  if (days <= 7) return { className: "text-amber-600", label: `${days}d` };
  return { className: "text-text-muted", label: formatDate(dateStr) };
}

function pdcDisplay(pdc: number | null): { className: string; label: string } {
  if (pdc == null) return { className: "text-text-placeholder", label: "--" };
  const pct = Math.round(pdc * 100);
  if (pdc < 0.6) return { className: "text-red-600 font-semibold", label: `${pct}%` };
  if (pdc < 0.8) return { className: "text-amber-600", label: `${pct}%` };
  return { className: "text-green-700", label: `${pct}%` };
}

function trendIcon(previousCohortId: string | null, previousCohortName: string | null, currentCohortName: string) {
  if (!previousCohortId) return <Icons.idle className="h-3.5 w-3.5 text-text-placeholder" />;
  // If previous cohort exists, patient moved. We show direction based on name comparison
  // In practice, sort_order would be better but we don't have it here
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      {previousCohortName ? (
        <>
          <Icons.arrowRightLeft className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-text-muted truncate max-w-[80px]" title={`From: ${previousCohortName}`}>
            {previousCohortName}
          </span>
        </>
      ) : (
        <Icons.arrowRightLeft className="h-3.5 w-3.5 text-amber-500" />
      )}
    </span>
  );
}

export function RiskWorklist() {
  const {
    assignments,
    programs,
    assignmentsPage,
    assignmentsPages,
    assignmentsTotal,
    assignmentsLoading,
    loadAssignments,
    recalculate,
    recalculating,
  } = useCohortisationStore();

  const [programFilter, setProgramFilter] = useState<string>(ALL_VALUE);
  const [cohortFilter, setCohortFilter] = useState<string>(ALL_VALUE);
  const [minScore, setMinScore] = useState<number>(DEFAULT_MIN_SCORE);
  const [scoreInput, setScoreInput] = useState<string>(String(DEFAULT_MIN_SCORE));
  const [commsPatient, setCommsPatient] = useState<{ id: string; name: string } | null>(null);

  const applyFilters = useCallback(
    (nextProgram?: string, nextCohort?: string, nextMinScore?: number) => {
      const pId = nextProgram ?? programFilter;
      const cId = nextCohort ?? cohortFilter;
      const ms = nextMinScore ?? minScore;
      loadAssignments({
        page: 1,
        ...(pId !== ALL_VALUE && { program_id: pId }),
        ...(cId !== ALL_VALUE && { cohort_id: cId }),
        min_score: ms,
      });
    },
    [programFilter, cohortFilter, minScore, loadAssignments],
  );

  const handleProgramChange = (value: string) => {
    setProgramFilter(value);
    setCohortFilter(ALL_VALUE);
    applyFilters(value, ALL_VALUE);
  };

  const handleCohortChange = (value: string) => {
    setCohortFilter(value);
    applyFilters(undefined, value);
  };

  const handleScoreApply = () => {
    const val = parseInt(scoreInput, 10);
    if (!isNaN(val) && val >= 0) {
      setMinScore(val);
      applyFilters(undefined, undefined, val);
    }
  };

  const handlePage = (page: number) => {
    loadAssignments({
      page,
      ...(programFilter !== ALL_VALUE && { program_id: programFilter }),
      ...(cohortFilter !== ALL_VALUE && { cohort_id: cohortFilter }),
      min_score: minScore,
    });
  };

  const handleRescore = async (patientId: string, patientName: string) => {
    const result = await recalculate([patientId]);
    if (result) {
      toast.success(`Re-score triggered for ${patientName}`);
      // Reload after worker processes (small delay)
      setTimeout(() => applyFilters(), 3000);
    } else {
      toast.error("Re-score failed");
    }
  };

  const uniqueCohorts = Array.from(
    new Map(
      assignments.map((a) => [a.cohort_id, { id: a.cohort_id, name: a.cohort_name }]),
    ).values(),
  );

  const filterTriggerClass = "h-8 w-fit gap-1 rounded-lg border-[color:var(--color-surface-border)] bg-white px-2.5 text-xs shadow-none";

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={programFilter} onValueChange={handleProgramChange}>
          <SelectTrigger className={filterTriggerClass}>
            <SelectValue placeholder="All Programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Programs</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={cohortFilter} onValueChange={handleCohortChange}>
          <SelectTrigger className={filterTriggerClass}>
            <SelectValue placeholder="All Cohorts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Cohorts</SelectItem>
            {uniqueCohorts.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted whitespace-nowrap">Score &ge;</span>
          <Input
            type="number"
            value={scoreInput}
            onChange={(e) => setScoreInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScoreApply()}
            onBlur={handleScoreApply}
            className="h-8 w-16 px-2 text-xs"
            min={0}
            max={100}
          />
        </div>

        <span className="text-xs text-text-muted ml-auto">
          {assignmentsTotal} patient{assignmentsTotal !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Top Factors</TableHead>
              <TableHead className="text-right">PDC</TableHead>
              <TableHead>Review Due</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignmentsLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <Icons.spinner className="mx-auto h-5 w-5 animate-spin text-text-muted" />
                </TableCell>
              </TableRow>
            ) : assignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-text-muted text-sm">
                  No at-risk patients above threshold
                </TableCell>
              </TableRow>
            ) : (
              assignments.map((a) => {
                const review = reviewUrgency(a.review_due_at);
                const pdc = pdcDisplay(a.pdc_worst);
                // Top 2-3 score breakdown factors
                const topFactors = a.score_breakdown
                  ? Object.entries(a.score_breakdown)
                      .sort(([, x], [, y]) => y.weighted - x.weighted)
                      .slice(0, 3)
                  : [];
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-text-primary">
                      <Link
                        href={`/dashboard/patients/${a.patient_id}`}
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        <Icons.user className="h-3 w-3 shrink-0 text-text-placeholder" />
                        {a.patient_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-transparent text-white text-[10px]"
                        style={{ backgroundColor: a.cohort_color }}
                      >
                        {a.cohort_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn("tabular-nums text-sm font-medium", scoreColor(a.score))}>
                        {a.score != null ? a.score : "--"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {topFactors.length > 0 ? topFactors.map(([name, val]) => (
                          <span
                            key={name}
                            className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                            title={`Raw: ${val.raw}, Weighted: ${val.weighted}`}
                          >
                            {name.replace(/_/g, " ")}
                          </span>
                        )) : (
                          <span className="text-xs text-text-placeholder">--</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn("tabular-nums text-sm", pdc.className)}>
                        {pdc.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-sm tabular-nums", review.className)}>
                        {review.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      {trendIcon(a.previous_cohort_id, a.previous_cohort_name ?? null, a.cohort_name)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Icons.more className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setCommsPatient({ id: a.patient_id, name: a.patient_name })}>
                            <Icons.send className="mr-2 h-3.5 w-3.5" />
                            Send Communication
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/patients/${a.patient_id}`}>
                              <Icons.pathwayBuilder className="mr-2 h-3.5 w-3.5" />
                              View Pathway
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRescore(a.patient_id, a.patient_name)}
                            disabled={recalculating}
                          >
                            <Icons.recurring className="mr-2 h-3.5 w-3.5" />
                            Re-score
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {assignmentsPages > 1 && (
        <div className="flex items-center justify-between pb-1">
          <p className="text-sm text-text-muted">
            Page {assignmentsPage} of {assignmentsPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={assignmentsPage <= 1}
              onClick={() => handlePage(assignmentsPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={assignmentsPage >= assignmentsPages}
              onClick={() => handlePage(assignmentsPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Send Comms Dialog */}
      <SendCommsDialog
        patient={commsPatient}
        onClose={() => setCommsPatient(null)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Update population-dashboard.tsx to use RiskWorklist**

In `src/features/cohortisation/components/population-dashboard.tsx`:

1. Replace import: change `import { RiskPoolTable } from "./risk-pool-table"` to `import { RiskWorklist } from "./risk-worklist"`
2. Update section heading and description (lines 138-147):

```tsx
      {/* Risk Worklist */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">At-Risk Patients</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Patients above the risk score threshold. Filter by program or cohort to drill down.
          </p>
        </div>
        <RiskWorklist />
      </section>
```

---

### Task 5: Build the SendCommsDialog component

**Files:**
- Create: `src/features/cohortisation/components/send-comms-dialog.tsx`

- [ ] **Step 1: Create send-comms-dialog.tsx**

```tsx
"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Icons } from "@/config/icons";
import { sendAction } from "@/services/api/communications";
import { toast } from "sonner";

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp", icon: Icons.send },
  { value: "sms", label: "SMS", icon: Icons.send },
  { value: "call", label: "Call", icon: Icons.phone },
  { value: "app_push", label: "Push", icon: Icons.notifications },
] as const;

interface Props {
  patient: { id: string; name: string } | null;
  onClose: () => void;
}

export function SendCommsDialog({ patient, onClose }: Props) {
  const [channel, setChannel] = useState("whatsapp");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!patient) return;
    setSending(true);
    try {
      await sendAction({
        patient_id: patient.id,
        channel,
        action_type: "outreach",
      });
      toast.success(`${channel} outreach sent to ${patient.name}`);
      onClose();
    } catch {
      toast.error("Failed to send communication");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!patient} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Send Communication</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-text-secondary">
            Send outreach to <span className="font-medium text-text-primary">{patient?.name}</span>
          </p>
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">
              Channel
            </span>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((ch) => (
                  <SelectItem key={ch.value} value={ch.value}>{ch.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Task 6: Wire initial load with min_score default

**Files:**
- Modify: `src/app/dashboard/cohortisation/page.tsx`

- [ ] **Step 1: Pass min_score on initial load**

In the page's `useEffect`, update the `loadAssignments` call to include the default threshold:

```tsx
useEffect(() => {
  loadDashboard();
  loadPrograms();
  loadAssignments({ min_score: 50 });
}, [loadDashboard, loadPrograms, loadAssignments]);
```

This ensures the worklist shows at-risk patients from first load instead of all assignments.

- [ ] **Step 2: Verify the full flow**

1. Start the backend: `pnpm dev:backend`
2. Start the frontend: `pnpm dev`
3. Navigate to `/dashboard/cohortisation`
4. Verify: the "At-Risk Patients" section shows only patients with score >= 50
5. Verify: score threshold input works — change to 70, press Enter, table updates
6. Verify: PDC column shows worst PDC per patient, red if < 60%
7. Verify: Trend column shows migration arrow when previous_cohort_id exists
8. Verify: Actions dropdown → Send Communication opens dialog
9. Verify: Actions dropdown → Re-score triggers recalculation toast
10. Verify: Actions dropdown → View Pathway navigates to patient detail

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/cohort.py backend/app/services/cohort_service.py backend/app/routers/cohortisation.py src/services/types/cohort.ts src/services/api/cohortisation.ts src/stores/cohortisation-store.ts src/features/cohortisation/components/risk-worklist.tsx src/features/cohortisation/components/send-comms-dialog.tsx src/features/cohortisation/components/population-dashboard.tsx src/app/dashboard/cohortisation/page.tsx
git commit -m "feat(cohortisation): replace patient assignments with risk worklist

- Add min_score filter, pdc_worst, previous_cohort_name to assignments endpoint
- New RiskWorklist component with score threshold, PDC, review urgency, trend
- Inline actions: send comms, view pathway, re-score
- SendCommsDialog for quick outreach from worklist"
```
