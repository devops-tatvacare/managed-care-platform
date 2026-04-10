import { create } from "zustand";
import {
  fetchKPIs,
  fetchInsights,
  fetchUpcomingReviews,
  streamInsights,
} from "@/services/api/command-center";
import { apiRequest } from "@/services/api/client";
import { API_ENDPOINTS } from "@/config/api";
import { fetchDistribution } from "@/services/api/cohortisation";
import { fetchPrograms } from "@/services/api/programs";
import type { CommandCenterKPIs, ActionQueueItem, ActionQueueResponse, AIInsightsResponse, UpcomingReviewsResponse } from "@/services/types/command-center";
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
      const data = await apiRequest<{ items: ActionQueueItem[]; total: number }>({
        method: "GET",
        path: API_ENDPOINTS.actions.list,
        params: { status: "open", limit: 20 },
      });
      set({ actionQueue: data, actionQueueLoading: false });
    } catch {
      set({ actionQueueLoading: false });
    }
  },

  loadInsights: async () => {
    set({ insightsLoading: true, insights: { markdown: "", generated_at: "", is_cached: false } });
    try {
      await streamInsights(
        (chunk) => {
          const current = get().insights;
          set({ insights: { ...current!, markdown: current!.markdown + chunk } });
        },
        (generatedAt) => {
          const current = get().insights;
          set({ insights: { ...current!, generated_at: generatedAt }, insightsLoading: false });
        },
      );
    } catch {
      // Fall back to non-streaming
      try {
        const insights = await fetchInsights();
        set({ insights, insightsLoading: false });
      } catch {
        set({ insightsLoading: false });
      }
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
      await Promise.all(programs.map(async (program) => {
        distributions[program.id] = await fetchDistribution(program.id);
      }));
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
