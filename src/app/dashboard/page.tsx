"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { useCommandCenterStore } from "@/stores/command-center-store";
import { ActionQueue } from "@/features/command-center/components/action-queue";
import { CohortDistributionChart } from "@/features/command-center/components/cohort-distribution-chart";
import { AIInsightsPanel } from "@/features/command-center/components/ai-insights-panel";
import { UpcomingReviews } from "@/features/command-center/components/upcoming-reviews";

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
    <div className="space-y-6">
      <PageHeader title="Command Center" description="AI-driven population overview" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Total Members"
          value={kpis?.total_members ?? "—"}
          subtitle="Active patients"
        />
        <KpiCard
          label="Avg Risk Score"
          value={kpis?.avg_risk_score ?? "—"}
          subtitle="Across programs"
        />
        <KpiCard
          label="HbA1c <7% Rate"
          value={kpis?.hba1c_control_rate != null ? `${kpis.hba1c_control_rate}%` : "—"}
          subtitle="Glycemic control"
        />
        <KpiCard
          label="Open Care Gaps"
          value={kpis?.open_care_gaps ?? "—"}
          subtitle="Patients needing attention"
        />
        <KpiCard
          label="PDC ≥80%"
          value={kpis?.pdc_above_80_rate != null ? `${kpis.pdc_above_80_rate}%` : "—"}
          subtitle="Medication adherence"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          <ActionQueue
            items={actionQueue?.items ?? []}
            loading={actionQueueLoading}
          />
          <CohortDistributionChart
            programs={programs}
            distributions={distributions}
            loading={distributionsLoading}
          />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <AIInsightsPanel
            insights={insights}
            loading={insightsLoading}
          />
          <UpcomingReviews
            items={upcomingReviews?.items ?? []}
            loading={reviewsLoading}
          />
        </div>
      </div>
    </div>
  );
}
