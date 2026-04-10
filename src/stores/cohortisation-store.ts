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
  programsError: string | null;

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

  // Real-time batch
  batchActive: boolean;
  batchTotal: number;
  batchProcessed: number;
  batchFailed: number;

  // Actions
  loadDashboard: () => Promise<void>;
  loadPrograms: () => Promise<void>;
  loadDistribution: (programId: string) => Promise<void>;
  loadAssignments: (params?: { page?: number; program_id?: string; cohort_id?: string; min_score?: number }) => Promise<void>;
  recalculate: (patientIds?: string[], scope?: "all" | "unassigned") => Promise<RecalculateResponse | null>;
  reset: () => void;

  // Real-time actions
  onBatchStarted: (total: number) => void;
  onItemProcessed: (entityId: string, data: Record<string, unknown>) => void;
  onItemsFlushed: (items: { entityId: string; data: Record<string, unknown> }[], failedCount: number) => void;
  onItemFailed: (entityId: string) => void;
  onBatchComplete: () => void;
}

function _buildRecord(entityId: string, data: Record<string, unknown>): AssignmentRecord {
  return {
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
    previous_cohort_name: null,
    pdc_worst: null,
    assigned_at: (data.assigned_at as string) ?? new Date().toISOString(),
    review_due_at: (data.review_due_at as string) ?? null,
  };
}

function _upsertAssignment(assignments: AssignmentRecord[], entityId: string, record: AssignmentRecord): AssignmentRecord[] {
  const idx = assignments.findIndex((a) => a.patient_id === entityId);
  if (idx >= 0) {
    const copy = [...assignments];
    copy[idx] = record;
    return copy;
  }
  return [record, ...assignments];
}

export const useCohortisationStore = create<CohortisationStore>((set, get) => ({
  stats: null,
  statsLoading: false,
  programs: [],
  programsLoading: false,
  programsError: null,
  distributions: {},
  assignments: [],
  assignmentsTotal: 0,
  assignmentsPage: 1,
  assignmentsPages: 1,
  assignmentsLoading: false,
  recalculating: false,
  lastRecalcResult: null,
  batchActive: false,
  batchTotal: 0,
  batchProcessed: 0,
  batchFailed: 0,

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
    set({ programsLoading: true, programsError: null });
    try {
      const programs = await fetchPrograms();
      set({ programs, programsLoading: false, programsError: null });
    } catch {
      set({ programsLoading: false, programsError: "Failed to load programs" });
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

  reset: () => set({
    stats: null, statsLoading: false,
    programs: [], programsLoading: false, programsError: null,
    distributions: {},
    assignments: [], assignmentsTotal: 0, assignmentsPage: 1, assignmentsPages: 1, assignmentsLoading: false,
    recalculating: false, lastRecalcResult: null,
    batchActive: false, batchTotal: 0, batchProcessed: 0, batchFailed: 0,
  }),

  onBatchStarted: (total: number) => {
    set({ batchActive: true, batchTotal: total, batchProcessed: 0, batchFailed: 0 });
  },

  onItemProcessed: (entityId: string, data: Record<string, unknown>) => {
    // Single-item update (used outside batch flush)
    set((s) => {
      const record = _buildRecord(entityId, data);
      const assignments = _upsertAssignment(s.assignments, entityId, record);
      const stats = s.stats
        ? { ...s.stats, assigned: s.stats.assigned + 1, unassigned: Math.max(0, s.stats.unassigned - 1) }
        : s.stats;
      return { batchProcessed: s.batchProcessed + 1, stats, assignments };
    });
  },

  onItemsFlushed: (items, failedCount) => {
    // Batch update — single set() for all items in the flush window
    set((s) => {
      let assignments = s.assignments;
      for (const { entityId, data } of items) {
        const record = _buildRecord(entityId, data);
        assignments = _upsertAssignment(assignments, entityId, record);
      }
      const totalNew = items.length;
      const stats = s.stats
        ? {
            ...s.stats,
            assigned: s.stats.assigned + totalNew,
            unassigned: Math.max(0, s.stats.unassigned - totalNew),
          }
        : s.stats;
      return {
        batchProcessed: s.batchProcessed + totalNew,
        batchFailed: s.batchFailed + failedCount,
        stats,
        assignments,
      };
    });
  },

  onItemFailed: (_entityId: string) => {
    set((s) => ({ batchFailed: s.batchFailed + 1 }));
  },

  onBatchComplete: () => {
    set({ batchActive: false });
  },
}));
