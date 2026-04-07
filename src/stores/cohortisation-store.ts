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
