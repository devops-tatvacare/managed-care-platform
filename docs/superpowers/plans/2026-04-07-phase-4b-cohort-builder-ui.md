# Phase 4B: Cohort Builder UI — Population Dashboard, Builder Shell, AI Builder, Criteria Editor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete frontend for the generic cohort system. Two pages: Population Dashboard (business view) and Cohort Builder (architect workspace with AI Builder + Configuration modes). Reusable criteria editor component. All backed by the Phase 4A backend APIs.

**Architecture:** Population Dashboard at `/dashboard/cohortisation` shows cross-program KPIs, program cards with distribution bars, and a filterable risk pool table. Cohort Builder at `/dashboard/cohortisation/builder/[id]` mirrors the pathway builder DNA — top bar with mode toggle (AI Builder | Configuration), AI chat with templates/history, and 4 configuration tabs (Cohorts, Scoring Engine, Override Rules, Linked Pathways). Two new stores: `cohortisation-store` (reworked for programs/dashboard) and `cohort-builder-store` (builder state + AI chat).

**Tech Stack:** Next.js 15, Tailwind 4, shadcn/ui, Zustand, Recharts. No new dependencies.

**Spec reference:** `docs/superpowers/specs/2026-04-07-cohort-system-redesign.md` — Section 4 (Frontend Architecture)

**Depends on:** Phase 4A backend must be complete. All `/api/programs/*` and `/api/cohortisation/*` endpoints must be available.

**Critical rules (apply to every task):**
- NO emojis — Lucide icons only
- NO custom UI components — shadcn/ui only
- NO hardcoded paths/colors/labels — config registries only
- `cn()` for ALL class composition — no template literal concatenation
- Tabs use `variant="line"` with the exact same className as patient-tabs and cohortisation page
- Follow existing patterns exactly (stores, API client, router registry)
- AI Builder mirrors pathway AI builder DNA exactly (templates, chat, history sidebar, accept flow)

**Existing patterns to follow:**
- Store: `src/stores/pathway-builder-store.ts` — state shape, actions, AI chat pattern
- AI Builder: `src/features/pathway-builder/components/ai-builder.tsx` — template prompts, chat UI, history sidebar
- Builder Shell: `src/features/pathway-builder/components/builder-shell.tsx` — top bar, mode toggle, action buttons
- API service: `src/services/api/pathways.ts` — apiRequest pattern
- Types: `src/services/types/pathway.ts` — interface pattern
- Routes: `src/config/routes.ts` — route registry pattern
- API endpoints: `src/config/api.ts` — endpoint registry pattern

---

## Task 1: Frontend Types & API Services

**Files:**
- Create: `src/services/types/program.ts`
- Rewrite: `src/services/types/cohort.ts`
- Create: `src/services/api/programs.ts`
- Rewrite: `src/services/api/cohortisation.ts`
- Modify: `src/config/api.ts`
- Modify: `src/config/routes.ts`

- [ ] **Step 1: Create `src/services/types/program.ts`**

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
}

export interface ScoringEngineSummary {
  id: string;
  components: ScoringComponentConfig[];
  tiebreaker_rules: TiebreakerRule[];
  aggregation_method: string;
}

export interface ScoringComponentConfig {
  name: string;
  label?: string;
  data_source: string;
  weight: number;
  cap: number;
  field?: string;
  scoring_table: Array<{ criterion: string; points: number; [key: string]: unknown }>;
  bonus_table?: Array<{ criterion: string; points: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface TiebreakerRule {
  priority: number;
  rule: string;
  action: string;
  condition: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProgramListItem {
  id: string;
  name: string;
  slug: string;
  condition: string | null;
  status: string;
  version: number;
  cohort_count: number;
  has_scoring_engine: boolean;
}

export interface ProgramDetail {
  id: string;
  name: string;
  slug: string;
  condition: string | null;
  description: string | null;
  status: string;
  version: number;
  published_at: string | null;
  cohorts: CohortSummary[];
  scoring_engine: ScoringEngineSummary | null;
}

export interface ProgramCreate {
  name: string;
  slug?: string;
  condition?: string;
  description?: string;
}

export interface ProgramUpdate {
  name?: string;
  slug?: string;
  condition?: string;
  description?: string;
  status?: string;
}

export interface ProgramVersion {
  id: string;
  version: number;
  published_at: string;
  snapshot: Record<string, unknown>;
}

export interface CohortCreate {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  sort_order?: number;
  review_cadence_days?: number;
  score_range_min?: number;
  score_range_max?: number;
}

export interface CohortUpdate {
  name?: string;
  slug?: string;
  description?: string;
  color?: string;
  sort_order?: number;
  review_cadence_days?: number;
  score_range_min?: number;
  score_range_max?: number;
}

export interface CriteriaNode {
  group_operator?: string;
  rule_type?: string;
  config?: Record<string, unknown>;
  children?: CriteriaNode[];
}

export interface ScoringEngineUpsert {
  components: ScoringComponentConfig[];
  tiebreaker_rules?: TiebreakerRule[];
  aggregation_method?: string;
}
```

- [ ] **Step 2: Rewrite `src/services/types/cohort.ts`**

```typescript
export interface DashboardStats {
  total_patients: number;
  assigned: number;
  unassigned: number;
  pending_rescore: number;
  active_programs: number;
}

export interface CohortDistribution {
  cohort_id: string;
  cohort_name: string;
  cohort_color: string;
  count: number;
}

export interface AssignmentRecord {
  id: string;
  patient_id: string;
  patient_name: string;
  program_id: string;
  cohort_id: string;
  cohort_name: string;
  cohort_color: string;
  score: number | null;
  score_breakdown: Record<string, { raw: number; weighted: number }> | null;
  assignment_type: string;
  reason: string | null;
  previous_cohort_id: string | null;
  assigned_at: string;
  review_due_at: string | null;
}

export interface AssignmentListResponse {
  items: AssignmentRecord[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface RecalculateResponse {
  events_created: number;
}
```

- [ ] **Step 3: Create `src/services/api/programs.ts`**

Follow the exact pattern from `src/services/api/pathways.ts`. All functions use `apiRequest` from `./client`.

```typescript
import { API_ENDPOINTS } from "@/config/api";
import { apiRequest } from "./client";
import type {
  ProgramListItem,
  ProgramDetail,
  ProgramCreate,
  ProgramUpdate,
  ProgramVersion,
  CohortSummary,
  CohortCreate,
  CohortUpdate,
  CriteriaNode,
  ScoringEngineSummary,
  ScoringEngineUpsert,
} from "../types/program";

// Programs
export const fetchPrograms = () =>
  apiRequest<ProgramListItem[]>({ method: "GET", path: API_ENDPOINTS.programs.list });

export const fetchProgram = (id: string) =>
  apiRequest<ProgramDetail>({ method: "GET", path: API_ENDPOINTS.programs.detail(id) });

export const createProgram = (data: ProgramCreate) =>
  apiRequest<ProgramDetail>({ method: "POST", path: API_ENDPOINTS.programs.list, body: data });

export const updateProgram = (id: string, data: ProgramUpdate) =>
  apiRequest<ProgramDetail>({ method: "PATCH", path: API_ENDPOINTS.programs.detail(id), body: data });

export const publishProgram = (id: string) =>
  apiRequest<ProgramVersion>({ method: "POST", path: API_ENDPOINTS.programs.publish(id) });

// Cohorts
export const fetchCohorts = (programId: string) =>
  apiRequest<CohortSummary[]>({ method: "GET", path: API_ENDPOINTS.programs.cohorts(programId) });

export const createCohort = (programId: string, data: CohortCreate) =>
  apiRequest<CohortSummary>({ method: "POST", path: API_ENDPOINTS.programs.cohorts(programId), body: data });

export const updateCohort = (programId: string, cohortId: string, data: CohortUpdate) =>
  apiRequest<CohortSummary>({ method: "PATCH", path: API_ENDPOINTS.programs.cohort(programId, cohortId), body: data });

export const deleteCohort = (programId: string, cohortId: string) =>
  apiRequest<void>({ method: "DELETE", path: API_ENDPOINTS.programs.cohort(programId, cohortId) });

export const replaceCriteria = (programId: string, cohortId: string, criteria: CriteriaNode[]) =>
  apiRequest<{ count: number }>({ method: "PUT", path: API_ENDPOINTS.programs.criteria(programId, cohortId), body: criteria });

// Scoring Engine
export const fetchEngine = (programId: string) =>
  apiRequest<ScoringEngineSummary>({ method: "GET", path: API_ENDPOINTS.programs.engine(programId) });

export const upsertEngine = (programId: string, data: ScoringEngineUpsert) =>
  apiRequest<ScoringEngineSummary>({ method: "PUT", path: API_ENDPOINTS.programs.engine(programId), body: data });
```

- [ ] **Step 4: Rewrite `src/services/api/cohortisation.ts`**

```typescript
import { API_ENDPOINTS } from "@/config/api";
import { apiRequest } from "./client";
import type {
  AssignmentListResponse,
  CohortDistribution,
  DashboardStats,
  RecalculateResponse,
} from "../types/cohort";

export const fetchDashboard = () =>
  apiRequest<DashboardStats>({ method: "GET", path: API_ENDPOINTS.cohortisation.dashboard });

export const recalculateAll = (patientIds?: string[]) =>
  apiRequest<RecalculateResponse>({
    method: "POST",
    path: API_ENDPOINTS.cohortisation.recalculate,
    body: patientIds ? { patient_ids: patientIds } : {},
  });

export const fetchAssignments = (params?: {
  page?: number;
  page_size?: number;
  program_id?: string;
  cohort_id?: string;
}) =>
  apiRequest<AssignmentListResponse>({
    method: "GET",
    path: API_ENDPOINTS.cohortisation.assignments,
    params,
  });

export const fetchDistribution = (programId: string) =>
  apiRequest<CohortDistribution[]>({
    method: "GET",
    path: API_ENDPOINTS.cohortisation.distribution(programId),
  });
```

- [ ] **Step 5: Update `src/config/api.ts`**

Add programs endpoints and update cohortisation endpoints:

```typescript
  programs: {
    list: "/api/programs",
    detail: (id: string) => `/api/programs/${id}`,
    publish: (id: string) => `/api/programs/${id}/publish`,
    cohorts: (id: string) => `/api/programs/${id}/cohorts`,
    cohort: (id: string, cid: string) => `/api/programs/${id}/cohorts/${cid}`,
    criteria: (id: string, cid: string) => `/api/programs/${id}/cohorts/${cid}/criteria`,
    engine: (id: string) => `/api/programs/${id}/engine`,
  },
  cohortisation: {
    dashboard: "/api/cohortisation/dashboard",
    recalculate: "/api/cohortisation/recalculate",
    assignments: "/api/cohortisation/assignments",
    distribution: (programId: string) => `/api/cohortisation/distribution/${programId}`,
  },
```

- [ ] **Step 6: Update `src/config/routes.ts`**

Add cohort builder routes:

```typescript
  cohortBuilder: {
    path: "/dashboard/cohortisation/builder",
    label: "Cohort Builder",
    icon: Icons.cohortisation,
    group: "config" as const,
    showInSidebar: false,
  },
  cohortBuilderEditor: {
    path: "/dashboard/cohortisation/builder/[id]",
    label: "Edit Program",
    icon: Icons.cohortisation,
    group: "config" as const,
    showInSidebar: false,
  },
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(cohort-ui): types, API services, route + endpoint registries"
```

---

## Task 2: Cohortisation Store (Rework) + Cohort Builder Store (New)

**Files:**
- Rewrite: `src/stores/cohortisation-store.ts`
- Create: `src/stores/cohort-builder-store.ts`

- [ ] **Step 1: Rewrite `src/stores/cohortisation-store.ts`**

This store powers the Population Dashboard. It manages programs list, dashboard stats, and assignment queries.

```typescript
import { create } from "zustand";
import { fetchDashboard, recalculateAll, fetchAssignments, fetchDistribution } from "@/services/api/cohortisation";
import { fetchPrograms } from "@/services/api/programs";
import type { ProgramListItem } from "@/services/types/program";
import type { AssignmentRecord, CohortDistribution, DashboardStats, RecalculateResponse } from "@/services/types/cohort";

interface CohortisationStore {
  // Dashboard
  stats: DashboardStats | null;
  statsLoading: boolean;

  // Programs
  programs: ProgramListItem[];
  programsLoading: boolean;

  // Distribution (per-program, keyed by program ID)
  distributions: Record<string, CohortDistribution[]>;

  // Assignments
  assignments: AssignmentRecord[];
  assignmentsTotal: number;
  assignmentsPage: number;
  assignmentsPages: number;
  assignmentsLoading: boolean;

  // Recalculation
  recalculating: boolean;
  lastRecalcResult: RecalculateResponse | null;

  // Actions
  loadDashboard: () => Promise<void>;
  loadPrograms: () => Promise<void>;
  loadDistribution: (programId: string) => Promise<void>;
  loadAssignments: (params?: { page?: number; program_id?: string; cohort_id?: string }) => Promise<void>;
  recalculate: (patientIds?: string[]) => Promise<RecalculateResponse | null>;
  reset: () => void;
}

export const useCohortisationStore = create<CohortisationStore>((set, get) => ({
  stats: null,
  statsLoading: false,
  programs: [],
  programsLoading: false,
  distributions: {},
  assignments: [],
  assignmentsTotal: 0,
  assignmentsPage: 1,
  assignmentsPages: 1,
  assignmentsLoading: false,
  recalculating: false,
  lastRecalcResult: null,

  loadDashboard: async () => {
    set({ statsLoading: true });
    try {
      const stats = await fetchDashboard();
      set({ stats, statsLoading: false });
    } catch {
      set({ statsLoading: false });
    }
  },

  loadPrograms: async () => {
    set({ programsLoading: true });
    try {
      const programs = await fetchPrograms();
      set({ programs, programsLoading: false });
    } catch {
      set({ programsLoading: false });
    }
  },

  loadDistribution: async (programId: string) => {
    try {
      const dist = await fetchDistribution(programId);
      set((s) => ({ distributions: { ...s.distributions, [programId]: dist } }));
    } catch {
      // silent
    }
  },

  loadAssignments: async (params) => {
    set({ assignmentsLoading: true });
    try {
      const result = await fetchAssignments({ page: params?.page ?? 1, page_size: 20, ...params });
      set({
        assignments: result.items,
        assignmentsTotal: result.total,
        assignmentsPage: result.page,
        assignmentsPages: result.pages,
        assignmentsLoading: false,
      });
    } catch {
      set({ assignmentsLoading: false });
    }
  },

  recalculate: async (patientIds) => {
    set({ recalculating: true });
    try {
      const result = await recalculateAll(patientIds);
      set({ recalculating: false, lastRecalcResult: result });
      await get().loadDashboard();
      await get().loadPrograms();
      return result;
    } catch {
      set({ recalculating: false });
      return null;
    }
  },

  reset: () => set({
    stats: null, statsLoading: false,
    programs: [], programsLoading: false,
    distributions: {},
    assignments: [], assignmentsTotal: 0, assignmentsPage: 1, assignmentsPages: 1, assignmentsLoading: false,
    recalculating: false, lastRecalcResult: null,
  }),
}));
```

- [ ] **Step 2: Create `src/stores/cohort-builder-store.ts`**

Mirrors the pathway-builder-store pattern. Has program detail, builder mode, AI chat, cohort editing state.

```typescript
import { create } from "zustand";
import * as programsApi from "@/services/api/programs";
import type {
  ProgramDetail,
  CohortSummary,
  CohortCreate,
  CohortUpdate,
  CriteriaNode,
  ScoringEngineSummary,
  ScoringEngineUpsert,
  ProgramVersion,
} from "@/services/types/program";

type BuilderMode = "ai" | "config";

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

interface CohortBuilderStore {
  // Program
  program: ProgramDetail | null;
  programLoading: boolean;
  error: string | null;

  // Builder mode
  builderMode: BuilderMode;

  // AI Chat
  chatMessages: ChatMessage[];
  chatLoading: boolean;

  // Editing state
  selectedCohortId: string | null;
  isDirty: boolean;

  // Actions — Program
  loadProgram: (id: string) => Promise<void>;
  updateProgramMeta: (data: { name?: string; description?: string; condition?: string }) => Promise<void>;
  publishProgram: () => Promise<ProgramVersion | null>;

  // Actions — Cohorts
  createCohort: (data: CohortCreate) => Promise<CohortSummary | null>;
  updateCohort: (cohortId: string, data: CohortUpdate) => Promise<void>;
  deleteCohort: (cohortId: string) => Promise<void>;
  selectCohort: (cohortId: string | null) => void;
  saveCriteria: (cohortId: string, criteria: CriteriaNode[]) => Promise<void>;

  // Actions — Scoring Engine
  saveEngine: (data: ScoringEngineUpsert) => Promise<void>;

  // Actions — Builder
  setBuilderMode: (mode: BuilderMode) => void;
  sendChatMessage: (text: string) => Promise<void>;
  clearChat: () => void;

  // Reset
  reset: () => void;
}

export const useCohortBuilderStore = create<CohortBuilderStore>((set, get) => ({
  program: null,
  programLoading: false,
  error: null,
  builderMode: "config",
  chatMessages: [{ role: "ai", content: "Describe the cohort program you want to create. I'll generate the cohorts, scoring engine, and criteria for you." }],
  chatLoading: false,
  selectedCohortId: null,
  isDirty: false,

  loadProgram: async (id) => {
    set({ programLoading: true, error: null });
    try {
      const program = await programsApi.fetchProgram(id);
      set({ program, programLoading: false });
    } catch {
      set({ error: "Failed to load program", programLoading: false });
    }
  },

  updateProgramMeta: async (data) => {
    const { program } = get();
    if (!program) return;
    try {
      const updated = await programsApi.updateProgram(program.id, data);
      set({ program: updated });
    } catch {
      set({ error: "Failed to update program" });
    }
  },

  publishProgram: async () => {
    const { program } = get();
    if (!program) return null;
    try {
      const version = await programsApi.publishProgram(program.id);
      await get().loadProgram(program.id);
      return version;
    } catch {
      set({ error: "Failed to publish" });
      return null;
    }
  },

  createCohort: async (data) => {
    const { program } = get();
    if (!program) return null;
    try {
      const cohort = await programsApi.createCohort(program.id, data);
      await get().loadProgram(program.id);
      return cohort;
    } catch {
      return null;
    }
  },

  updateCohort: async (cohortId, data) => {
    const { program } = get();
    if (!program) return;
    await programsApi.updateCohort(program.id, cohortId, data);
    await get().loadProgram(program.id);
  },

  deleteCohort: async (cohortId) => {
    const { program } = get();
    if (!program) return;
    await programsApi.deleteCohort(program.id, cohortId);
    await get().loadProgram(program.id);
    set({ selectedCohortId: null });
  },

  selectCohort: (cohortId) => set({ selectedCohortId: cohortId }),

  saveCriteria: async (cohortId, criteria) => {
    const { program } = get();
    if (!program) return;
    await programsApi.replaceCriteria(program.id, cohortId, criteria);
    await get().loadProgram(program.id);
  },

  saveEngine: async (data) => {
    const { program } = get();
    if (!program) return;
    await programsApi.upsertEngine(program.id, data);
    await get().loadProgram(program.id);
  },

  setBuilderMode: (mode) => set({ builderMode: mode }),

  sendChatMessage: async (text) => {
    set((s) => ({
      chatMessages: [...s.chatMessages, { role: "user", content: text }],
      chatLoading: true,
    }));
    // AI endpoint will be wired in Phase 4C or later — for now, stub response
    setTimeout(() => {
      set((s) => ({
        chatMessages: [...s.chatMessages, { role: "ai", content: "AI cohort generation will be available soon. For now, use the Configuration tab to set up your program manually." }],
        chatLoading: false,
      }));
    }, 500);
  },

  clearChat: () => set({
    chatMessages: [{ role: "ai", content: "Describe the cohort program you want to create. I'll generate the cohorts, scoring engine, and criteria for you." }],
    chatLoading: false,
  }),

  reset: () => set({
    program: null, programLoading: false, error: null,
    builderMode: "config",
    chatMessages: [{ role: "ai", content: "Describe the cohort program you want to create. I'll generate the cohorts, scoring engine, and criteria for you." }],
    chatLoading: false, selectedCohortId: null, isDirty: false,
  }),
}));
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(stores): reworked cohortisation store + new cohort builder store"
```

---

## Task 3: Population Dashboard Page

**Files:**
- Rewrite: `src/app/dashboard/cohortisation/page.tsx`
- Create: `src/features/cohortisation/components/population-dashboard.tsx`
- Create: `src/features/cohortisation/components/program-card.tsx`
- Create: `src/features/cohortisation/components/risk-pool-table.tsx`

The population dashboard shows: KPI strip (Total members, Active programs, Unassigned, Pending re-score), program cards grid with cohort distribution bars, and a risk pool member table.

- [ ] **Step 1: Create `src/features/cohortisation/components/program-card.tsx`**

A card showing program name, status badge, cohort count, member count, stacked horizontal bar of cohort distribution (each segment colored by cohort color). Click navigates to builder.

Use: Card, Badge from shadcn. `useRouter` from `next/navigation` for click navigation. `buildPath("cohortBuilderEditor", { id })` from routes.ts.

The distribution bar is a flex container where each child's `flex` style is set to the cohort's member count. Colors come from the cohort's `color` field via inline `style={{ backgroundColor: cohort.color }}`.

- [ ] **Step 2: Create `src/features/cohortisation/components/risk-pool-table.tsx`**

Filterable member table using shadcn Table. Columns: Patient, Program, Cohort (colored badge), Score, Assigned, Review Due.

Filter row with Select dropdowns for Program and Cohort, and an Input for search. Reads from `useCohortisationStore().assignments`.

Pagination: Previous/Next buttons, page info. Calls `loadAssignments({ page, program_id, cohort_id })`.

- [ ] **Step 3: Create `src/features/cohortisation/components/population-dashboard.tsx`**

Composes the full page: KPI strip (4 KpiCard components), program cards grid, "+ Create Program" card (dashed border, click opens simple Dialog with name/condition/description fields that calls `createProgram` from programs API), and risk pool table.

- [ ] **Step 4: Rewrite `src/app/dashboard/cohortisation/page.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { PopulationDashboard } from "@/features/cohortisation/components/population-dashboard";

export default function CohortisationPage() {
  const { loadDashboard, loadPrograms, loadAssignments } = useCohortisationStore();

  useEffect(() => {
    loadDashboard();
    loadPrograms();
    loadAssignments();
  }, [loadDashboard, loadPrograms, loadAssignments]);

  return <PopulationDashboard />;
}
```

- [ ] **Step 5: Remove old cohortisation components that are no longer used**

Delete these files (replaced by the new system):
- `src/features/cohortisation/components/crs-config-panel.tsx`
- `src/features/cohortisation/components/tier-threshold-panel.tsx`
- `src/features/cohortisation/components/tier-distribution-chart.tsx`
- `src/features/cohortisation/components/assignment-log.tsx`

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(dashboard): population dashboard with program cards, KPIs, risk pool table"
```

---

## Task 4: Cohort Builder Shell + Pages

**Files:**
- Create: `src/app/dashboard/cohortisation/builder/page.tsx`
- Create: `src/app/dashboard/cohortisation/builder/[id]/page.tsx`
- Create: `src/features/cohort-builder/components/builder-shell.tsx`

- [ ] **Step 1: Create `src/app/dashboard/cohortisation/builder/page.tsx`**

Program list page. Shows all programs as a grid of cards with a "Create Program" card. Uses `useCohortisationStore().programs`. Each card links to `/dashboard/cohortisation/builder/[id]`.

This is a simple list page — similar to `src/app/dashboard/pathways/page.tsx`. Use PageHeader + program cards.

- [ ] **Step 2: Create `src/features/cohort-builder/components/builder-shell.tsx`**

Mirrors `src/features/pathway-builder/components/builder-shell.tsx` exactly:

- Top bar: Program name + status badge | Mode tabs (AI Builder | Configuration) using `variant="line"` TabsList | Action buttons (Save Draft, Publish v{N})
- Content area: switches between AI Builder and Configuration mode
- Configuration mode has 4 tabs: Cohorts, Scoring Engine, Override Rules, Linked Pathways

Read the pathway `builder-shell.tsx` for the exact className patterns. The tab styling must match:
```
className="rounded-none px-4 py-2 text-xs font-semibold text-text-muted data-[state=active]:text-brand-primary data-[state=active]:shadow-none data-[state=active]:after:bg-brand-primary"
```

- [ ] **Step 3: Create `src/app/dashboard/cohortisation/builder/[id]/page.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import { BuilderShell } from "@/features/cohort-builder/components/builder-shell";

export default function CohortBuilderPage() {
  const params = useParams();
  const id = params.id as string;
  const { loadProgram, reset } = useCohortBuilderStore();

  useEffect(() => {
    loadProgram(id);
    return () => reset();
  }, [id, loadProgram, reset]);

  return <BuilderShell />;
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(builder): cohort builder shell with mode toggle, program list page"
```

---

## Task 5: AI Builder Mode

**Files:**
- Create: `src/features/cohort-builder/components/ai-builder.tsx`

- [ ] **Step 1: Create the AI Builder component**

Mirror `src/features/pathway-builder/components/ai-builder.tsx` exactly. Same layout: left chat panel with toolbar (History + New Chat buttons), message list with markdown rendering, input area with textarea + send button. Right panel shows generated output (stubbed for now).

Template prompts for cohorts:

```typescript
const TEMPLATE_PROMPTS = [
  {
    label: "Diabetes 5-Tier Program",
    prompt: "Design a comprehensive diabetes care program with 5 risk tiers...",
  },
  {
    label: "Heart Failure 3-Tier Program",
    prompt: "Create a heart failure management program with 3 tiers...",
  },
  {
    label: "Simple Age-Based Cohort",
    prompt: "Create a simple cohort for members aged 40-75 with BMI >= 30...",
  },
  {
    label: "Medication Adherence Cohort",
    prompt: "Build a cohort targeting members with PDC < 80% on any chronic medication...",
  },
];
```

Use the exact same CSS patterns: flex layout, border-r, overflow-y-auto, text sizing, icon usage from the pathway AI builder. Read the existing file carefully and replicate the structure using `useCohortBuilderStore` instead of `usePathwayBuilderStore`.

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat(builder): AI builder mode with template prompts and chat UI"
```

---

## Task 6: Configuration Mode — Cohort Cards Tab

**Files:**
- Create: `src/features/cohort-builder/components/cohort-cards.tsx`
- Create: `src/features/cohort-builder/components/cohort-detail-drawer.tsx`

- [ ] **Step 1: Create `src/features/cohort-builder/components/cohort-cards.tsx`**

Grid of cohort cards within the program. Each card shows: color dot, name, criteria summary, member count, score range, review cadence, linked pathway count. "Edit" button opens the detail drawer. "+ Add Cohort" card with dashed border.

Use: Card, Badge, Button from shadcn. Data from `useCohortBuilderStore().program.cohorts`.

- [ ] **Step 2: Create `src/features/cohort-builder/components/cohort-detail-drawer.tsx`**

Sheet/Drawer that opens when editing a cohort. Contains:
- Header: Cohort name (editable Input), color picker (simple hex Input or predefined color swatches), description (Textarea)
- Metadata: sort order (Input number), review cadence (Select: Weekly/Monthly/Quarterly/6-month/Annual), score range min/max (two Inputs)
- Criteria section: placeholder for criteria editor (Task 7) — for now just show "Criteria editor coming in next task"
- Footer: Save + Delete buttons

Uses Sheet from shadcn. Opens when `selectedCohortId` is set in the store.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(builder): cohort cards grid + detail drawer"
```

---

## Task 7: Criteria Editor Component (Reusable)

**Files:**
- Create: `src/config/rule-types.ts`
- Create: `src/features/cohort-builder/components/criteria-editor.tsx`
- Create: `src/features/cohort-builder/components/criteria-rule-form.tsx`
- Modify: `src/features/cohort-builder/components/cohort-detail-drawer.tsx` — integrate criteria editor

- [ ] **Step 1: Create `src/config/rule-types.ts`**

Registry of criteria rule types (mirrors backend evaluators):

```typescript
import type { LucideIcon } from "lucide-react";
import { Icons } from "@/config/icons";

export interface RuleTypeDefinition {
  type: string;
  label: string;
  icon: LucideIcon;
  description: string;
  defaultConfig: Record<string, unknown>;
}

export const RULE_TYPES: RuleTypeDefinition[] = [
  {
    type: "diagnosis",
    label: "Diagnosis Code",
    icon: Icons.diagnosis,
    description: "Match ICD-10 codes by prefix or exact match",
    defaultConfig: { icd10_codes: [], match_type: "prefix", include: true },
  },
  {
    type: "lab",
    label: "Lab Threshold",
    icon: Icons.lab,
    description: "Check lab value against a threshold",
    defaultConfig: { test_type: "", operator: "gte", value: 0 },
  },
  {
    type: "demographics",
    label: "Demographics",
    icon: Icons.demographics,
    description: "Age, BMI, gender criteria",
    defaultConfig: { bmi_threshold: null, bmi_operator: "gte" },
  },
  {
    type: "pharmacy",
    label: "Pharmacy / Adherence",
    icon: Icons.pharmacy,
    description: "PDC threshold check",
    defaultConfig: { pdc_threshold: 0.8, pdc_operator: "gte" },
  },
  {
    type: "utilisation",
    label: "Utilisation Event",
    icon: Icons.utilisation,
    description: "ER visits, hospitalisations, DKA",
    defaultConfig: { event_type: "er_visit", count_threshold: 1 },
  },
  {
    type: "sdoh",
    label: "SDOH Flag",
    icon: Icons.sdoh,
    description: "Social determinants of health",
    defaultConfig: { domain: null, count_threshold: 1 },
  },
  {
    type: "exclusion",
    label: "Exclusion Rule",
    icon: Icons.exclusion,
    description: "Exclude patients matching these codes",
    defaultConfig: { icd10_codes: [] },
  },
];

export function getRuleType(type: string): RuleTypeDefinition | undefined {
  return RULE_TYPES.find((r) => r.type === type);
}
```

Check that `Icons.diagnosis`, `Icons.lab`, etc. exist in `src/config/icons.ts`. If not, map to appropriate Lucide icons. Read icons.ts first.

- [ ] **Step 2: Create `src/features/cohort-builder/components/criteria-editor.tsx`**

AND/OR tree builder. Shows the criteria tree as nested groups with toggle between AND/OR. Each group can contain leaf rules or nested groups.

Layout:
- Root group (implicitly AND)
- Each group: AND/OR toggle (Switch or small ButtonGroup), list of children, "+ Add Rule" and "+ Add Group" buttons
- Each leaf rule: type selector (Select from RULE_TYPES), config summary, delete button
- Clicking a leaf rule expands inline to show `criteria-rule-form.tsx`

This is a recursive component. Props: `criteria: CriteriaNode[]`, `onChange: (criteria: CriteriaNode[]) => void`.

Use: Card, Button, Select, Switch, Separator from shadcn.

- [ ] **Step 3: Create `src/features/cohort-builder/components/criteria-rule-form.tsx`**

Per-rule-type config form. Takes `ruleType: string` and `config: Record<string, unknown>`, renders appropriate fields.

For now, implement forms for the 3 most common types:
- **diagnosis**: Input for comma-separated ICD-10 codes, Select for match_type (prefix/exact), Checkbox for include/exclude
- **lab**: Select for test_type (HbA1c, eGFR, BMI, etc.), Select for operator (>=, <=, >, <, =, between), Input for value
- **demographics**: Input for BMI threshold, Select for operator

Other types: show a JSON textarea as fallback (user can edit raw config).

- [ ] **Step 4: Integrate criteria editor into cohort-detail-drawer.tsx**

Replace the "Criteria editor coming" placeholder with `<CriteriaEditor criteria={...} onChange={...} />`. Wire save to `saveCriteria(cohortId, criteria)` in the store.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(criteria): reusable AND/OR criteria tree editor with rule type registry"
```

---

## Task 8: Configuration Mode — Scoring Engine Tab

**Files:**
- Create: `src/features/cohort-builder/components/scoring-engine-panel.tsx`
- Create: `src/features/cohort-builder/components/scoring-component-drawer.tsx`

- [ ] **Step 1: Create `src/features/cohort-builder/components/scoring-engine-panel.tsx`**

Card-based scoring component builder. Each component is a card showing: name, data source label, weight bar (visual), rule count. Click opens the scoring component drawer. "+ Add Component" card. Weight total indicator (Badge showing sum, green if 100%, red otherwise). Save button.

If no scoring engine exists for the program, show an empty state with "Enable Scoring Engine" button that creates a default engine with zero components.

Data from `useCohortBuilderStore().program.scoring_engine`.

- [ ] **Step 2: Create `src/features/cohort-builder/components/scoring-component-drawer.tsx`**

Sheet that opens when editing a scoring component. Contains:
- Header: Component name (Input), data source (Select from: lab_range, diagnosis_match, pharmacy_adherence, utilisation, sdoh), weight (Slider 0-100), cap (Input number)
- Scoring table: shadcn Table showing criterion + points for each row. Each row is editable inline.
- Bonus table (optional): same format
- Footer: Save + Remove buttons

When the user saves, the drawer closes and the engine panel calls `saveEngine()` with all components.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(builder): scoring engine panel with component cards + detail drawer"
```

---

## Task 9: Configuration Mode — Override Rules + Linked Pathways Tabs

**Files:**
- Create: `src/features/cohort-builder/components/override-rules-panel.tsx`
- Create: `src/features/cohort-builder/components/linked-pathways-panel.tsx`

- [ ] **Step 1: Create `src/features/cohort-builder/components/override-rules-panel.tsx`**

Tiebreaker rules table. Columns: Priority (drag handle or number input), Rule (text), Condition (summary), Action (badge). "+ Add Rule" button at bottom. Each row has edit/delete buttons.

Editing a rule opens an inline form or small dialog with: priority (number), rule name (text), condition type (select), condition params, action type (select), action params.

Data from `useCohortBuilderStore().program.scoring_engine.tiebreaker_rules`.

- [ ] **Step 2: Create `src/features/cohort-builder/components/linked-pathways-panel.tsx`**

Read-only list of pathways that reference this program's cohorts. For each pathway: name, status badge, which cohort(s) it targets, pinned version.

For now, this can be a simple EmptyState with "No pathways linked yet" since pathway integration is Phase 4C. The component structure should be ready for when pathways start referencing cohorts.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(builder): override rules panel + linked pathways panel"
```

---

## Task 10: Integration — Wire Everything Together + Verify

- [ ] **Step 1: Ensure all imports resolve**

Run TypeScript check:
```bash
npx tsc --noEmit
```

Fix any import errors.

- [ ] **Step 2: Ensure Next.js builds**

```bash
npx next build 2>&1 | tail -20
```

Fix any build errors.

- [ ] **Step 3: Start both backend and frontend, verify full flow**

```bash
# Backend (ensure Phase 4A is running)
cd backend && source .venv/bin/activate && python -m uvicorn app.main:app --port 8000 &

# Frontend
pnpm dev
```

Navigate through:
1. `/dashboard/cohortisation` — Population Dashboard loads with KPIs, program cards, risk pool table
2. Click "Diabetes Care" program card → navigates to `/dashboard/cohortisation/builder/{id}`
3. Builder shell shows with AI Builder | Configuration tabs
4. Configuration tab → Cohorts tab shows 5 cohort cards
5. Click "Edit" on a cohort → drawer opens with criteria editor
6. Scoring Engine tab shows 5 component cards with weight bars
7. Override Rules tab shows 4 tiebreaker rules
8. Switch to AI Builder tab → chat UI with template prompts

- [ ] **Step 4: Fix any issues found during testing**

- [ ] **Step 5: Final commit**

```bash
git add -A && git commit -m "feat(phase-4b): complete — cohort builder UI with population dashboard, AI builder, criteria editor"
```
