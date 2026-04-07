import { create } from "zustand";
import {
  fetchCRSConfig,
  updateCRSConfig,
  recalculateAll,
  fetchAssignments,
  fetchTierDistribution,
} from "@/services/api/cohortisation";
import type {
  AssignmentRecord,
  CRSComponent,
  CRSConfigResponse,
  RecalculateResponse,
  TierDistributionItem,
  TierThreshold,
  TiebreakerRule,
} from "@/services/types/cohort";

interface CohortisationStore {
  // CRS Config
  config: CRSConfigResponse | null;
  configLoading: boolean;
  configError: string | null;

  // Assignments
  assignments: AssignmentRecord[];
  assignmentsTotal: number;
  assignmentsPage: number;
  assignmentsPages: number;
  assignmentsLoading: boolean;

  // Distribution
  distribution: TierDistributionItem[];
  distributionTotal: number;
  distributionLoading: boolean;

  // Recalculation
  recalculating: boolean;
  lastRecalcResult: RecalculateResponse | null;

  // Actions
  loadConfig: () => Promise<void>;
  saveConfig: (data: {
    components?: CRSComponent[];
    tier_thresholds?: TierThreshold[];
    tiebreaker_rules?: TiebreakerRule[];
  }) => Promise<void>;
  loadAssignments: (page?: number) => Promise<void>;
  loadDistribution: () => Promise<void>;
  recalculate: (patientIds?: string[]) => Promise<RecalculateResponse | null>;
  reset: () => void;
}

export const useCohortisationStore = create<CohortisationStore>((set, get) => ({
  config: null,
  configLoading: false,
  configError: null,

  assignments: [],
  assignmentsTotal: 0,
  assignmentsPage: 1,
  assignmentsPages: 1,
  assignmentsLoading: false,

  distribution: [],
  distributionTotal: 0,
  distributionLoading: false,

  recalculating: false,
  lastRecalcResult: null,

  loadConfig: async () => {
    set({ configLoading: true, configError: null });
    try {
      const config = await fetchCRSConfig();
      set({ config, configLoading: false });
    } catch {
      set({ configError: "Failed to load CRS config", configLoading: false });
    }
  },

  saveConfig: async (data) => {
    set({ configLoading: true, configError: null });
    try {
      const config = await updateCRSConfig(data);
      set({ config, configLoading: false });
    } catch {
      set({ configError: "Failed to save CRS config", configLoading: false });
    }
  },

  loadAssignments: async (page = 1) => {
    set({ assignmentsLoading: true });
    try {
      const result = await fetchAssignments({ page, page_size: 20 });
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

  loadDistribution: async () => {
    set({ distributionLoading: true });
    try {
      const result = await fetchTierDistribution();
      set({
        distribution: result.distribution,
        distributionTotal: result.total,
        distributionLoading: false,
      });
    } catch {
      set({ distributionLoading: false });
    }
  },

  recalculate: async (patientIds) => {
    set({ recalculating: true });
    try {
      const result = await recalculateAll(patientIds);
      set({ recalculating: false, lastRecalcResult: result });
      // Reload distribution and assignments after recalculation
      const store = get();
      await store.loadDistribution();
      await store.loadAssignments(1);
      return result;
    } catch {
      set({ recalculating: false });
      return null;
    }
  },

  reset: () => {
    set({
      config: null,
      configLoading: false,
      configError: null,
      assignments: [],
      assignmentsTotal: 0,
      assignmentsPage: 1,
      assignmentsPages: 1,
      assignmentsLoading: false,
      distribution: [],
      distributionTotal: 0,
      distributionLoading: false,
      recalculating: false,
      lastRecalcResult: null,
    });
  },
}));
