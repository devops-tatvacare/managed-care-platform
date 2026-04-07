import { create } from "zustand";
import {
  fetchClinicalMetrics,
  fetchHedisMetrics,
  fetchEngagementMetrics,
  fetchFinancialMetrics,
  fetchMigrationSummary,
  fetchMigrationHistory,
  fetchPendingOverrides,
  approveOverride,
  rejectOverride,
  fetchQuarterlyInsight,
} from "@/services/api/outcomes";
import { fetchPrograms } from "@/services/api/programs";
import type {
  MetricCategoryResponse,
  MigrationHistoryResponse,
  MigrationSummaryResponse,
  PendingOverridesResponse,
  QuarterlyInsightResponse,
} from "@/services/types/outcomes";
import type { ProgramListItem } from "@/services/types/program";

type TabKey = "clinical" | "hedis" | "engagement" | "financial" | "recohortisation";

interface OutcomesState {
  programs: ProgramListItem[];
  selectedProgramId: string | null;
  selectedCohortId: string | null;
  activeTab: TabKey;
  clinical: MetricCategoryResponse | null;
  hedis: MetricCategoryResponse | null;
  engagement: MetricCategoryResponse | null;
  financial: MetricCategoryResponse | null;
  migrationSummary: MigrationSummaryResponse | null;
  migrationHistory: MigrationHistoryResponse | null;
  pendingOverrides: PendingOverridesResponse | null;
  quarterlyInsight: QuarterlyInsightResponse | null;
  metricsLoading: boolean;
  migrationLoading: boolean;
  overridesLoading: boolean;
  insightLoading: boolean;
  loadPrograms: () => Promise<void>;
  setActiveTab: (tab: TabKey) => void;
  setSelectedProgramId: (id: string) => void;
  setSelectedCohortId: (id: string | null) => void;
  loadMetrics: () => Promise<void>;
  loadMigrations: (page?: number) => Promise<void>;
  loadOverrides: () => Promise<void>;
  loadInsight: () => Promise<void>;
  handleApprove: (assignmentId: string) => Promise<void>;
  handleReject: (assignmentId: string) => Promise<void>;
  loadAll: () => Promise<void>;
  reset: () => void;
}

export const useOutcomesStore = create<OutcomesState>((set, get) => ({
  programs: [],
  selectedProgramId: null,
  selectedCohortId: null,
  activeTab: "clinical",
  clinical: null,
  hedis: null,
  engagement: null,
  financial: null,
  migrationSummary: null,
  migrationHistory: null,
  pendingOverrides: null,
  quarterlyInsight: null,
  metricsLoading: false,
  migrationLoading: false,
  overridesLoading: false,
  insightLoading: false,

  loadPrograms: async () => {
    try {
      const programs = await fetchPrograms();
      set({ programs });
      if (programs.length > 0 && !get().selectedProgramId) {
        set({ selectedProgramId: programs[0].id });
      }
    } catch {
      // silent
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedProgramId: (id) => set({ selectedProgramId: id }),
  setSelectedCohortId: (id) => set({ selectedCohortId: id }),

  loadMetrics: async () => {
    const { selectedProgramId, selectedCohortId } = get();
    if (!selectedProgramId) return;

    set({ metricsLoading: true });
    const params = { program_id: selectedProgramId, cohort_id: selectedCohortId ?? undefined };

    try {
      const [clinical, hedis, engagement, financial] = await Promise.all([
        fetchClinicalMetrics(params),
        fetchHedisMetrics(params),
        fetchEngagementMetrics(params),
        fetchFinancialMetrics(params),
      ]);
      set({ clinical, hedis, engagement, financial, metricsLoading: false });
    } catch {
      set({ metricsLoading: false });
    }
  },

  loadMigrations: async (page = 1) => {
    const { selectedProgramId } = get();
    if (!selectedProgramId) return;

    set({ migrationLoading: true });
    try {
      const [summary, history] = await Promise.all([
        fetchMigrationSummary(selectedProgramId),
        fetchMigrationHistory(selectedProgramId, page),
      ]);
      set({ migrationSummary: summary, migrationHistory: history, migrationLoading: false });
    } catch {
      set({ migrationLoading: false });
    }
  },

  loadOverrides: async () => {
    const { selectedProgramId } = get();
    if (!selectedProgramId) return;

    set({ overridesLoading: true });
    try {
      const pendingOverrides = await fetchPendingOverrides(selectedProgramId);
      set({ pendingOverrides, overridesLoading: false });
    } catch {
      set({ overridesLoading: false });
    }
  },

  loadInsight: async () => {
    const { selectedProgramId } = get();
    if (!selectedProgramId) return;

    set({ insightLoading: true });
    try {
      const quarterlyInsight = await fetchQuarterlyInsight(selectedProgramId);
      set({ quarterlyInsight, insightLoading: false });
    } catch {
      set({ insightLoading: false });
    }
  },

  handleApprove: async (assignmentId) => {
    try {
      await approveOverride(assignmentId);
      await get().loadOverrides();
    } catch {
      // silent
    }
  },

  handleReject: async (assignmentId) => {
    try {
      await rejectOverride(assignmentId);
      await get().loadOverrides();
    } catch {
      // silent
    }
  },

  loadAll: async () => {
    await get().loadPrograms();
    await Promise.all([
      get().loadMetrics(),
      get().loadMigrations(),
      get().loadOverrides(),
    ]);
  },

  reset: () => set({
    programs: [], selectedProgramId: null, selectedCohortId: null, activeTab: "clinical",
    clinical: null, hedis: null, engagement: null, financial: null,
    migrationSummary: null, migrationHistory: null, pendingOverrides: null, quarterlyInsight: null,
    metricsLoading: false, migrationLoading: false, overridesLoading: false, insightLoading: false,
  }),
}));
