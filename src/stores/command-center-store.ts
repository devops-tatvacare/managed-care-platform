import { create } from "zustand";
import {
  fetchKPIs,
  fetchActionQueue,
  fetchInsights,
  fetchUpcomingReviews,
} from "@/services/api/command-center";
import { fetchDistribution } from "@/services/api/cohortisation";
import { fetchPrograms } from "@/services/api/programs";
import type { CommandCenterKPIs, ActionQueueResponse, AIInsightsResponse, UpcomingReviewsResponse } from "@/services/types/command-center";
import type { CohortDistribution } from "@/services/types/cohort";
import type { ProgramListItem } from "@/services/types/program";

interface CommandCenterState {
  kpis: CommandCenterKPIs | null;
  kpisLoading: boolean;
  actionQueue: ActionQueueResponse | null;
  actionQueueLoading: boolean;
  insights: AIInsightsResponse | null;
  insightsLoading: boolean;
  upcomingReviews: UpcomingReviewsResponse | null;
  reviewsLoading: boolean;
  programs: ProgramListItem[];
  distributions: Record<string, CohortDistribution[]>;
  distributionsLoading: boolean;
  loadKPIs: () => Promise<void>;
  loadActionQueue: () => Promise<void>;
  loadInsights: () => Promise<void>;
  loadUpcomingReviews: () => Promise<void>;
  loadDistributions: () => Promise<void>;
  loadAll: () => Promise<void>;
  reset: () => void;
}

export const useCommandCenterStore = create<CommandCenterState>((set, get) => ({
  kpis: null,
  kpisLoading: false,
  actionQueue: null,
  actionQueueLoading: false,
  insights: null,
  insightsLoading: false,
  upcomingReviews: null,
  reviewsLoading: false,
  programs: [],
  distributions: {},
  distributionsLoading: false,

  loadKPIs: async () => {
    set({ kpisLoading: true });
    try {
      const kpis = await fetchKPIs();
      set({ kpis, kpisLoading: false });
    } catch {
      set({ kpisLoading: false });
    }
  },

  loadActionQueue: async () => {
    set({ actionQueueLoading: true });
    try {
      const actionQueue = await fetchActionQueue(20);
      set({ actionQueue, actionQueueLoading: false });
    } catch {
      set({ actionQueueLoading: false });
    }
  },

  loadInsights: async () => {
    set({ insightsLoading: true });
    try {
      const insights = await fetchInsights();
      set({ insights, insightsLoading: false });
    } catch {
      set({ insightsLoading: false });
    }
  },

  loadUpcomingReviews: async () => {
    set({ reviewsLoading: true });
    try {
      const upcomingReviews = await fetchUpcomingReviews(15);
      set({ upcomingReviews, reviewsLoading: false });
    } catch {
      set({ reviewsLoading: false });
    }
  },

  loadDistributions: async () => {
    set({ distributionsLoading: true });
    try {
      const programs = await fetchPrograms();
      set({ programs });
      const distributions: Record<string, CohortDistribution[]> = {};
      for (const program of programs) {
        const dist = await fetchDistribution(program.id);
        distributions[program.id] = dist;
      }
      set({ distributions, distributionsLoading: false });
    } catch {
      set({ distributionsLoading: false });
    }
  },

  loadAll: async () => {
    const { loadKPIs, loadActionQueue, loadInsights, loadUpcomingReviews, loadDistributions } = get();
    await Promise.all([
      loadKPIs(),
      loadActionQueue(),
      loadInsights(),
      loadUpcomingReviews(),
      loadDistributions(),
    ]);
  },

  reset: () =>
    set({
      kpis: null, kpisLoading: false,
      actionQueue: null, actionQueueLoading: false,
      insights: null, insightsLoading: false,
      upcomingReviews: null, reviewsLoading: false,
      programs: [], distributions: {}, distributionsLoading: false,
    }),
}));
