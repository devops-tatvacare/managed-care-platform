# Cohort Builder UX Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the cohort builder from a card-based stub into a production-grade configuration interface with tables, right-side sheet editors, pathway linkage, toast feedback, and design system consistency.

**Architecture:** Replace card grids with data tables (action columns → open sheets). All create/edit flows use right-side `Sheet` overlays. Add `pathway_id` FK on `Cohort` model. Add `aggregation` field on scoring components. Add `gate_criteria` concept for hard clinical prerequisites per cohort. Toast feedback on all mutations via Sonner (already installed). Design system tokens, icons, and semantic colors throughout.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 4, Radix UI (Sheet/Table), Zustand, FastAPI, SQLAlchemy, SQLite, Sonner (toasts)

---

## File Map

### Backend (Modify)
- `backend/app/models/cohort.py` — Add `pathway_id` FK to Cohort, add `gate_criteria` relationship
- `backend/app/models/pathway.py` — No changes needed (Pathway model already exists)
- `backend/app/schemas/program.py` — Add `pathway_id`, `pathway_name` to CohortSummary; add `aggregation` to scoring component schema
- `backend/app/services/cohort_service.py` — Update serialization to include pathway_id/name
- `backend/app/routers/programs.py` — Update cohort endpoints to handle pathway_id; add link/unlink pathway endpoint

### Frontend (Modify)
- `src/services/types/program.ts` — Add `pathway_id`, `pathway_name` to CohortSummary; add `aggregation` to ScoringComponentConfig
- `src/services/api/programs.ts` — Add pathway link API call
- `src/stores/cohort-builder-store.ts` — Add toast calls, pathway link actions
- `src/features/cohort-builder/components/builder-shell.tsx` — Redesign top bar, config tab icons
- `src/features/cohort-builder/components/cohort-cards.tsx` — **Replace entirely** with `cohort-table.tsx`
- `src/features/cohort-builder/components/cohort-detail-drawer.tsx` — Polish sheet, widen, add gate criteria section
- `src/features/cohort-builder/components/scoring-engine-panel.tsx` — **Replace entirely** with `scoring-table.tsx`
- `src/features/cohort-builder/components/scoring-component-drawer.tsx` — Polish sheet
- `src/features/cohort-builder/components/override-rules-panel.tsx` — **Replace dialog with sheet**, convert to table layout
- `src/features/cohort-builder/components/linked-pathways-panel.tsx` — **Replace stub** with functional pathway linking UI

### Frontend (Create)
- `src/features/cohort-builder/components/cohort-table.tsx` — Table view of cohorts with action column
- `src/features/cohort-builder/components/scoring-table.tsx` — Table view of scoring components with action column
- `src/features/cohort-builder/components/override-rules-table.tsx` — Table view of override rules with action column
- `src/features/cohort-builder/components/override-rule-drawer.tsx` — Right-side sheet for override rule editing

### Database Migration
- Add `pathway_id` column to `cohorts` table (nullable FK to `pathways.id`)

---

## Task 1: Backend Schema — Add pathway_id to Cohort

**Files:**
- Modify: `backend/app/models/cohort.py:11-42`
- Modify: `backend/app/schemas/program.py:21-30`
- Modify: `backend/app/services/cohort_service.py`
- Modify: `backend/app/routers/programs.py`

- [ ] **Step 1: Add pathway_id FK to Cohort model**

In `backend/app/models/cohort.py`, add after `member_count` field (around line 30):

```python
    pathway_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("pathways.id", ondelete="SET NULL"), nullable=True
    )
    pathway: Mapped["Pathway | None"] = relationship("Pathway", lazy="selectin")
```

Add import at top:
```python
from app.models.pathway import Pathway
```

- [ ] **Step 2: Update CohortSummary schema**

In `backend/app/schemas/program.py`, add to `CohortSummary`:
```python
    pathway_id: str | None = None
    pathway_name: str | None = None
```

- [ ] **Step 3: Update cohort serialization in router**

In `backend/app/routers/programs.py`, update `_serialize_cohort` to include:
```python
    "pathway_id": str(c.pathway_id) if c.pathway_id else None,
    "pathway_name": c.pathway.name if c.pathway else None,
```

- [ ] **Step 4: Update CohortUpdate schema to accept pathway_id**

In `backend/app/schemas/program.py`, add to `CohortCreate` and `CohortUpdate` (or add to existing):
```python
    pathway_id: str | None = None
```

- [ ] **Step 5: Add DB migration — add column**

```bash
cd backend
.venv/bin/python -c "
import sqlite3
conn = sqlite3.connect('data/care-admin.db')
cur = conn.cursor()
try:
    cur.execute('ALTER TABLE cohorts ADD COLUMN pathway_id TEXT REFERENCES pathways(id) ON DELETE SET NULL')
    conn.commit()
    print('Added pathway_id column')
except Exception as e:
    print(f'Column may already exist: {e}')
conn.close()
"
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/models/cohort.py backend/app/schemas/program.py backend/app/services/cohort_service.py backend/app/routers/programs.py
git commit -m "feat(cohort): add pathway_id FK to cohort model for pathway linkage"
```

---

## Task 2: Frontend Types — Update CohortSummary and ScoringComponentConfig

**Files:**
- Modify: `src/services/types/program.ts:1-11` (CohortSummary)
- Modify: `src/services/types/program.ts:20-30` (ScoringComponentConfig)

- [ ] **Step 1: Add pathway fields to CohortSummary**

```typescript
export interface CohortSummary {
  id: string;
  name: string;
  slug: string;
  color: string;
  sort_order: number;
  review_cadence_days: number;
  score_range_min: number | null;
  score_range_max: number | null;
  member_count: number;
  pathway_id: string | null;
  pathway_name: string | null;
}
```

- [ ] **Step 2: Add aggregation to ScoringComponentConfig**

Add field to `ScoringComponentConfig`:
```typescript
  aggregation?: "sum" | "max" | "first_match";
```

- [ ] **Step 3: Add pathway_id to CohortCreate and CohortUpdate**

```typescript
// In CohortCreate, add:
  pathway_id?: string | null;

// In CohortUpdate, add:
  pathway_id?: string | null;
```

- [ ] **Step 4: Commit**

```bash
git add src/services/types/program.ts
git commit -m "feat(types): add pathway linkage and scoring aggregation to program types"
```

---

## Task 3: Replace Cohort Cards with Cohort Table

**Files:**
- Create: `src/features/cohort-builder/components/cohort-table.tsx`
- Modify: `src/features/cohort-builder/components/builder-shell.tsx:130`

- [ ] **Step 1: Create cohort-table.tsx**

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Icons } from "@/config/icons";
import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import { CohortDetailDrawer } from "./cohort-detail-drawer";
import { toast } from "sonner";

const CADENCE_LABELS: Record<number, string> = {
  7: "Weekly", 14: "Bi-weekly", 30: "Monthly",
  90: "Quarterly", 180: "6-month", 365: "Annual",
};

export function CohortTable() {
  const { program, createCohort, selectCohort } = useCohortBuilderStore();
  if (!program) return null;

  const cohorts = program.cohorts;

  const handleAdd = async () => {
    await createCohort({ name: "New Cohort" });
    toast.success("Cohort created");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Cohorts</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Define risk tiers with score ranges, review cadence, and entry criteria.
          </p>
        </div>
        <Button size="sm" onClick={handleAdd}>
          <Icons.plus className="mr-1.5 h-3.5 w-3.5" />
          Add Cohort
        </Button>
      </div>

      {cohorts.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border-default py-10">
          <div className="space-y-2 text-center">
            <Icons.cohortisation className="mx-auto h-6 w-6 text-text-placeholder" />
            <p className="text-sm text-text-muted">No cohorts defined</p>
            <Button variant="outline" size="sm" onClick={handleAdd}>
              <Icons.plus className="mr-1.5 h-3.5 w-3.5" />
              Add your first cohort
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Score Range</TableHead>
                <TableHead>Review Cadence</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead>Linked Pathway</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohorts
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="text-sm font-medium text-text-primary">{c.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-text-secondary">
                      {c.score_range_min != null && c.score_range_max != null
                        ? `${c.score_range_min}–${c.score_range_max}`
                        : <span className="text-text-placeholder">--</span>}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {CADENCE_LABELS[c.review_cadence_days] ?? `${c.review_cadence_days}d`}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-text-secondary">
                      {c.member_count}
                    </TableCell>
                    <TableCell>
                      {c.pathway_name ? (
                        <Badge variant="outline" className="text-[10px]">
                          <Icons.pathwayBuilder className="mr-1 h-2.5 w-2.5" />
                          {c.pathway_name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-text-placeholder">Not linked</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => selectCohort(c.id)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CohortDetailDrawer />
    </div>
  );
}
```

- [ ] **Step 2: Update builder-shell.tsx to use CohortTable**

Replace the import and usage:
```tsx
// Change import
import { CohortTable } from "./cohort-table";

// Change render (line ~130)
{configTab === "cohorts" && <CohortTable />}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/cohort-builder/components/cohort-table.tsx src/features/cohort-builder/components/builder-shell.tsx
git commit -m "feat(cohort-builder): replace cohort cards with table + action column"
```

---

## Task 4: Replace Scoring Cards with Scoring Table

**Files:**
- Create: `src/features/cohort-builder/components/scoring-table.tsx`
- Modify: `src/features/cohort-builder/components/builder-shell.tsx`

- [ ] **Step 1: Create scoring-table.tsx**

```tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import { ScoringComponentDrawer } from "./scoring-component-drawer";
import { toast } from "sonner";
import type { ScoringComponentConfig } from "@/services/types/program";

export function ScoringTable() {
  const { program, saveEngine } = useCohortBuilderStore();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  if (!program) return null;

  const engine = program.scoring_engine;
  const components = engine?.components ?? [];
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);

  const handleEnable = async () => {
    await saveEngine({
      components: [],
      tiebreaker_rules: engine?.tiebreaker_rules ?? [],
      aggregation_method: engine?.aggregation_method ?? "weighted_sum",
    });
    toast.success("Scoring engine enabled");
  };

  const handleAddComponent = () => {
    const newComp: ScoringComponentConfig = {
      name: `component_${components.length}`,
      label: "",
      data_source: "lab_range",
      weight: 0,
      cap: 100,
      scoring_table: [],
    };
    const updated = [...components, newComp];
    saveEngine({
      components: updated,
      tiebreaker_rules: engine?.tiebreaker_rules ?? [],
      aggregation_method: engine?.aggregation_method ?? "weighted_sum",
    });
    setEditingIdx(updated.length - 1);
    toast.success("Component added");
  };

  const handleSaveComponent = async (idx: number, comp: ScoringComponentConfig) => {
    const updated = components.map((c, i) => (i === idx ? comp : c));
    await saveEngine({
      components: updated,
      tiebreaker_rules: engine?.tiebreaker_rules ?? [],
      aggregation_method: engine?.aggregation_method ?? "weighted_sum",
    });
    setEditingIdx(null);
    toast.success("Component saved");
  };

  const handleDeleteComponent = async (idx: number) => {
    const updated = components.filter((_, i) => i !== idx);
    await saveEngine({
      components: updated,
      tiebreaker_rules: engine?.tiebreaker_rules ?? [],
      aggregation_method: engine?.aggregation_method ?? "weighted_sum",
    });
    setEditingIdx(null);
    toast.success("Component removed");
  };

  if (!engine) {
    return (
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Scoring Engine</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Define weighted scoring components to compute a composite risk score (0–100).
          </p>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border-default py-10">
          <div className="space-y-2 text-center">
            <Icons.compositeScore className="mx-auto h-6 w-6 text-text-placeholder" />
            <p className="text-sm text-text-muted">No scoring engine configured</p>
            <Button variant="outline" size="sm" onClick={handleEnable}>
              Enable Scoring Engine
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Scoring Engine</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Composite risk score components. Weights must total 100%.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-semibold tabular-nums",
              totalWeight === 100
                ? "border-green-300 bg-green-50 text-green-700"
                : "border-red-300 bg-red-50 text-red-700",
            )}
          >
            Weight: {totalWeight}%
          </Badge>
          <Button size="sm" onClick={handleAddComponent}>
            <Icons.plus className="mr-1.5 h-3.5 w-3.5" />
            Add Component
          </Button>
        </div>
      </div>

      {components.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border-default py-10">
          <div className="space-y-2 text-center">
            <Icons.compositeScore className="mx-auto h-6 w-6 text-text-placeholder" />
            <p className="text-sm text-text-muted">No components defined</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Data Source</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead className="text-right">Cap</TableHead>
                <TableHead className="text-right">Rules</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((comp, idx) => (
                <TableRow key={comp.name}>
                  <TableCell className="font-medium text-text-primary">
                    {comp.label || comp.name}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary capitalize">
                    {comp.data_source.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums font-medium">
                    {comp.weight}%
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-text-muted">
                    {comp.cap}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums text-text-muted">
                    {comp.scoring_table.length}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setEditingIdx(idx)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {editingIdx !== null && components[editingIdx] && (
        <ScoringComponentDrawer
          component={components[editingIdx]}
          onClose={() => setEditingIdx(null)}
          onSave={(comp) => handleSaveComponent(editingIdx, comp)}
          onDelete={() => handleDeleteComponent(editingIdx)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update builder-shell.tsx**

```tsx
import { ScoringTable } from "./scoring-table";

// Replace render line
{configTab === "scoring" && <ScoringTable />}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/cohort-builder/components/scoring-table.tsx src/features/cohort-builder/components/builder-shell.tsx
git commit -m "feat(cohort-builder): replace scoring cards with table + action column"
```

---

## Task 5: Replace Override Rules Dialog with Table + Sheet

**Files:**
- Create: `src/features/cohort-builder/components/override-rules-table.tsx`
- Create: `src/features/cohort-builder/components/override-rule-drawer.tsx`
- Modify: `src/features/cohort-builder/components/builder-shell.tsx`

- [ ] **Step 1: Create override-rule-drawer.tsx** (right-side sheet)

```tsx
"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icons } from "@/config/icons";
import type { TiebreakerRule } from "@/services/types/program";

const ACTION_OPTIONS = [
  { value: "override_cohort", label: "Override Cohort" },
  { value: "boost_score", label: "Boost Score" },
  { value: "cap_score", label: "Cap Score" },
  { value: "flag_review", label: "Flag for Review" },
];

interface OverrideRuleDrawerProps {
  rule: TiebreakerRule | null;
  open: boolean;
  onClose: () => void;
  onSave: (rule: TiebreakerRule) => void;
  onDelete?: () => void;
}

export function OverrideRuleDrawer({ rule, open, onClose, onSave, onDelete }: OverrideRuleDrawerProps) {
  const [priority, setPriority] = useState(0);
  const [name, setName] = useState("");
  const [action, setAction] = useState("override_cohort");

  useEffect(() => {
    if (rule) {
      setPriority(rule.priority);
      setName(rule.rule);
      setAction(rule.action);
    } else {
      setPriority(0);
      setName("");
      setAction("override_cohort");
    }
  }, [rule, open]);

  const handleSave = () => {
    onSave({ priority, rule: name, action, condition: rule?.condition ?? {} });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{rule ? "Edit Override Rule" : "Add Override Rule"}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4 px-4">
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">Priority</span>
            <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">Rule Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. DKA → Tier 4" />
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">Action</span>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between px-4">
          {onDelete ? (
            <Button variant="destructive" size="sm" onClick={() => { onDelete(); onClose(); }}>
              <Icons.close className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          ) : <div />}
          <Button size="sm" onClick={handleSave} disabled={!name.trim()}>Save</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Create override-rules-table.tsx**

```tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Icons } from "@/config/icons";
import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import { OverrideRuleDrawer } from "./override-rule-drawer";
import { toast } from "sonner";
import type { TiebreakerRule } from "@/services/types/program";

const ACTION_LABELS: Record<string, { label: string; className: string }> = {
  override_cohort: { label: "Override Cohort", className: "border-red-200 bg-red-50 text-red-700" },
  boost_score: { label: "Boost Score", className: "border-amber-200 bg-amber-50 text-amber-700" },
  cap_score: { label: "Cap Score", className: "border-blue-200 bg-blue-50 text-blue-700" },
  flag_review: { label: "Flag Review", className: "border-indigo-200 bg-indigo-50 text-indigo-700" },
};

export function OverrideRulesTable() {
  const { program, saveEngine } = useCohortBuilderStore();
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!program) return null;

  const engine = program.scoring_engine;
  const rules = engine?.tiebreaker_rules ?? [];

  const handleSave = async (rule: TiebreakerRule) => {
    const updated = editingIdx !== null
      ? rules.map((r, i) => (i === editingIdx ? rule : r))
      : [...rules, rule];
    await saveEngine({
      components: engine?.components ?? [],
      tiebreaker_rules: updated,
      aggregation_method: engine?.aggregation_method ?? "weighted_sum",
    });
    setEditingIdx(null);
    setDrawerOpen(false);
    toast.success(editingIdx !== null ? "Rule updated" : "Rule added");
  };

  const handleDelete = async () => {
    if (editingIdx === null) return;
    const updated = rules.filter((_, i) => i !== editingIdx);
    await saveEngine({
      components: engine?.components ?? [],
      tiebreaker_rules: updated,
      aggregation_method: engine?.aggregation_method ?? "weighted_sum",
    });
    setEditingIdx(null);
    setDrawerOpen(false);
    toast.success("Rule removed");
  };

  const handleAdd = () => {
    setEditingIdx(null);
    setDrawerOpen(true);
  };

  const handleEdit = (idx: number) => {
    setEditingIdx(idx);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Override Rules</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Tiebreaker rules applied in priority order after scoring. Override cohort assignments for clinical edge cases.
          </p>
        </div>
        <Button size="sm" onClick={handleAdd} disabled={!engine}>
          <Icons.plus className="mr-1.5 h-3.5 w-3.5" />
          Add Rule
        </Button>
      </div>

      {!engine ? (
        <div className="rounded-xl border border-dashed border-border-default py-8 text-center">
          <p className="text-sm text-text-muted">Enable scoring engine first to define override rules.</p>
        </div>
      ) : rules.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border-default py-10">
          <div className="space-y-2 text-center">
            <Icons.override className="mx-auto h-6 w-6 text-text-placeholder" />
            <p className="text-sm text-text-muted">No override rules</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Priority</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules
                .slice()
                .sort((a, b) => a.priority - b.priority)
                .map((rule, idx) => {
                  const actionCfg = ACTION_LABELS[rule.action];
                  return (
                    <TableRow key={idx}>
                      <TableCell className="text-sm tabular-nums font-medium text-text-primary">
                        {rule.priority}
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {rule.rule}
                      </TableCell>
                      <TableCell>
                        {actionCfg ? (
                          <Badge variant="outline" className={`text-[10px] ${actionCfg.className}`}>
                            {actionCfg.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-text-muted">{rule.action}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="xs" onClick={() => handleEdit(idx)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      )}

      <OverrideRuleDrawer
        rule={editingIdx !== null ? rules[editingIdx] : null}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingIdx(null); }}
        onSave={handleSave}
        onDelete={editingIdx !== null ? handleDelete : undefined}
      />
    </div>
  );
}
```

- [ ] **Step 3: Update builder-shell.tsx**

```tsx
import { OverrideRulesTable } from "./override-rules-table";

// Replace render line
{configTab === "overrides" && <OverrideRulesTable />}
```

- [ ] **Step 4: Commit**

```bash
git add src/features/cohort-builder/components/override-rule-drawer.tsx src/features/cohort-builder/components/override-rules-table.tsx src/features/cohort-builder/components/builder-shell.tsx
git commit -m "feat(cohort-builder): replace override rules dialog with table + right-side sheet"
```

---

## Task 6: Linked Pathways Panel — Functional UI

**Files:**
- Modify: `src/features/cohort-builder/components/linked-pathways-panel.tsx`
- Modify: `src/services/api/programs.ts` (if needed for pathway fetch)

- [ ] **Step 1: Rewrite linked-pathways-panel.tsx**

This panel shows a table of cohorts with their linked pathway (or "Not linked"), and a dropdown to pick a pathway for each cohort.

```tsx
"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Icons } from "@/config/icons";
import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import { fetchPathways } from "@/services/api/pathways";
import { toast } from "sonner";

interface PathwaySummary {
  id: string;
  name: string;
  status: string;
}

const NONE_VALUE = "__none__";

export function LinkedPathwaysPanel() {
  const { program, updateCohort } = useCohortBuilderStore();
  const [pathways, setPathways] = useState<PathwaySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPathways()
      .then((data) => setPathways(data.map((p: any) => ({ id: p.id, name: p.name, status: p.status }))))
      .catch(() => setPathways([]))
      .finally(() => setLoading(false));
  }, []);

  if (!program) return null;

  const cohorts = program.cohorts.slice().sort((a, b) => a.sort_order - b.sort_order);

  const handleLink = async (cohortId: string, pathwayId: string | null) => {
    await updateCohort(cohortId, { pathway_id: pathwayId });
    toast.success(pathwayId ? "Pathway linked" : "Pathway unlinked");
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Linked Pathways</h2>
        <p className="mt-0.5 text-xs text-text-muted">
          Each cohort can link to a care pathway. When patients are assigned to a cohort, they enter the linked pathway.
        </p>
      </div>

      {cohorts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-default py-10 text-center">
          <p className="text-sm text-text-muted">Create cohorts first to link pathways.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cohort</TableHead>
                <TableHead>Linked Pathway</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohorts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-sm font-medium text-text-primary">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={c.pathway_id ?? NONE_VALUE}
                      onValueChange={(v) => handleLink(c.id, v === NONE_VALUE ? null : v)}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-8 w-64 text-xs">
                        <SelectValue placeholder="Select pathway..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>No pathway</SelectItem>
                        {pathways.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                            {p.status === "published" && " ✓"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify pathways API returns list**

Check that `fetchPathways` in `src/services/api/pathways.ts` exists and returns a list. If it doesn't, add it.

- [ ] **Step 3: Commit**

```bash
git add src/features/cohort-builder/components/linked-pathways-panel.tsx
git commit -m "feat(cohort-builder): functional linked pathways panel with per-cohort pathway dropdown"
```

---

## Task 7: Builder Shell Polish — Icons, Sub-tab Design, Toast Wiring

**Files:**
- Modify: `src/features/cohort-builder/components/builder-shell.tsx`

- [ ] **Step 1: Add icons to config sub-tabs and polish header**

```tsx
const CONFIG_TABS = [
  { value: "cohorts", label: "Cohorts", icon: Icons.cohortisation },
  { value: "scoring", label: "Scoring Engine", icon: Icons.compositeScore },
  { value: "overrides", label: "Override Rules", icon: Icons.override },
  { value: "pathways", label: "Linked Pathways", icon: Icons.pathwayBuilder },
] as const;
```

Update TabsTrigger to include icon:
```tsx
<TabsTrigger
  key={tab.value}
  value={tab.value}
  className="gap-1.5 rounded-none px-4 py-2 text-xs font-semibold text-text-muted data-[state=active]:text-brand-primary data-[state=active]:shadow-none data-[state=active]:after:bg-brand-primary"
>
  <tab.icon className="h-3.5 w-3.5" />
  {tab.label}
</TabsTrigger>
```

- [ ] **Step 2: Add toast to publish action**

```tsx
import { toast } from "sonner";

// In the publish button onClick:
onClick={async () => {
  try {
    await publishProgram();
    toast.success(`Published v${program.version + 1}`);
  } catch {
    toast.error("Failed to publish");
  }
}}
```

- [ ] **Step 3: Add icons to mode tabs**

```tsx
const MODE_TABS = [
  { value: "ai", label: "AI Builder", icon: Icons.ai },
  { value: "config", label: "Configuration", icon: Icons.config },
] as const;
```

- [ ] **Step 4: Commit**

```bash
git add src/features/cohort-builder/components/builder-shell.tsx
git commit -m "feat(cohort-builder): polish builder shell with icons, toasts, visual consistency"
```

---

## Task 8: Cohort Detail Drawer — Add Gate Criteria Section + Pathway Link

**Files:**
- Modify: `src/features/cohort-builder/components/cohort-detail-drawer.tsx`

- [ ] **Step 1: Add gate criteria explanation section**

After the Score Range fields and before Criteria, add:

```tsx
<Separator />

{/* Gate Criteria (hard prerequisites) */}
<div className="space-y-1.5">
  <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">
    Entry Gate Criteria
  </span>
  <p className="text-[11px] text-text-placeholder">
    Hard clinical prerequisites that must be met regardless of score. These are evaluated as AND conditions on top of the score range.
  </p>
</div>
```

This makes the existing criteria tree serve as the gate criteria — the criteria on a cohort ARE the hard prerequisites. The label change makes the intent clear.

- [ ] **Step 2: Add toast on save/delete**

```tsx
import { toast } from "sonner";

// In handleSave:
toast.success("Cohort saved");

// In handleDelete:
toast.success("Cohort deleted");
```

- [ ] **Step 3: Commit**

```bash
git add src/features/cohort-builder/components/cohort-detail-drawer.tsx
git commit -m "feat(cohort-builder): add gate criteria labeling and toast feedback to cohort drawer"
```

---

## Task 9: Final Cleanup — Remove Old Components, Verify Build

**Files:**
- Delete (or mark unused): `src/features/cohort-builder/components/cohort-cards.tsx`
- Delete (or mark unused): `src/features/cohort-builder/components/scoring-engine-panel.tsx`
- Delete (or mark unused): `src/features/cohort-builder/components/override-rules-panel.tsx`

- [ ] **Step 1: Remove old card/panel components**

Delete the files that were replaced by tables:
```bash
rm src/features/cohort-builder/components/cohort-cards.tsx
rm src/features/cohort-builder/components/scoring-engine-panel.tsx
rm src/features/cohort-builder/components/override-rules-panel.tsx
```

- [ ] **Step 2: Verify no remaining imports reference deleted files**

```bash
grep -r "cohort-cards\|scoring-engine-panel\|override-rules-panel" src/ --include="*.tsx" --include="*.ts"
```

Fix any remaining imports to point to new table components.

- [ ] **Step 3: Build and verify**

```bash
pnpm --filter @tc/bradesco-care-admin build
```

Expected: clean build with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(cohort-builder): remove replaced card/panel components, clean imports"
```

---

## Verification Checklist

After all tasks:

- [ ] Cohorts tab shows table with columns: Name (color dot), Score Range, Review Cadence, Members, Linked Pathway, Actions (Edit button)
- [ ] "Add Cohort" button in header opens the right-side sheet after creating
- [ ] Scoring tab shows table with columns: Component, Data Source, Weight, Cap, Rules, Actions (Edit button)
- [ ] Weight badge shows green when 100%, red otherwise
- [ ] Override Rules tab shows table with Priority, Rule, Action (colored badge), Actions (Edit button)
- [ ] All edit flows open right-side Sheet (never a centered Dialog)
- [ ] Linked Pathways tab shows cohort-to-pathway mapping table with dropdown
- [ ] All mutations show Sonner toasts (success/error)
- [ ] Publish shows toast on success/error
- [ ] Config sub-tabs have icons
- [ ] Mode tabs (AI/Config) have icons
- [ ] Build passes clean
- [ ] No hardcoded strings for status/action labels — all from config maps
