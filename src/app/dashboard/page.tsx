"use client";

import { useEffect } from "react";
import { useCommandCenterStore } from "@/stores/command-center-store";
import { KpiStrip } from "@/features/command-center/components/kpi-strip";
import { ActionQueue } from "@/features/command-center/components/action-queue";
import { AIInsightsPanel } from "@/features/command-center/components/ai-insights-panel";
import { CohortDistribution } from "@/features/command-center/components/cohort-distribution";
import { ReviewsDue } from "@/features/command-center/components/reviews-due";

export default function CommandCenterPage() {
  const {
    kpis, kpisLoading,
    actionQueue, actionQueueLoading,
    insights, insightsLoading,
    upcomingReviews, reviewsLoading,
    programs, distributions, distributionsLoading,
    loadAll,
  } = useCommandCenterStore();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      {/* KPI Strip */}
      <KpiStrip kpis={kpis} loading={kpisLoading} />

      {/* 2×2 Grid */}
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
        <ActionQueue items={actionQueue?.items ?? []} loading={actionQueueLoading} />
        <AIInsightsPanel insights={insights} loading={insightsLoading} />
        <CohortDistribution programs={programs} distributions={distributions} loading={distributionsLoading} />
        <ReviewsDue items={upcomingReviews?.items ?? []} loading={reviewsLoading} />
      </div>
    </div>
  );
}
