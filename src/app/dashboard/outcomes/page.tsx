"use client";

import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { useOutcomesStore } from "@/stores/outcomes-store";
import { OutcomesKpiStrip } from "@/features/outcomes/components/outcomes-kpi-strip";
import { OutcomesTable } from "@/features/outcomes/components/outcomes-table";
import { MigrationSummary } from "@/features/outcomes/components/migration-summary";
import { AIQuarterlyInsight } from "@/features/outcomes/components/ai-quarterly-insight";
import { MigrationApprovalTable } from "@/features/outcomes/components/migration-approval-table";

export default function OutcomesPage() {
  const {
    programs,
    selectedProgramId,
    activeTab,
    clinical,
    hedis,
    engagement,
    financial,
    migrationSummary,
    migrationHistory,
    pendingOverrides,
    quarterlyInsight,
    metricsLoading,
    migrationLoading,
    overridesLoading,
    insightLoading,
    loadAll,
    loadMetrics,
    loadMigrations,
    loadOverrides,
    loadInsight,
    setActiveTab,
    setSelectedProgramId,
    handleApprove,
    handleReject,
  } = useOutcomesStore();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (selectedProgramId) {
      loadMetrics();
      loadMigrations();
      loadOverrides();
    }
  }, [selectedProgramId, loadMetrics, loadMigrations, loadOverrides]);

  const tabMetrics = {
    clinical: clinical?.metrics ?? [],
    hedis: hedis?.metrics ?? [],
    engagement: engagement?.metrics ?? [],
    financial: financial?.metrics ?? [],
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <PageHeader title="Outcomes" description="Clinical metrics, HEDIS measures, and ROI" />
        <Select value={selectedProgramId ?? ""} onValueChange={setSelectedProgramId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select program" />
          </SelectTrigger>
          <SelectContent>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList
          variant="line"
          className="w-full justify-start gap-0 rounded-none border-b border-border-default bg-bg-primary px-0"
        >
          {[
            { value: "clinical", label: "Clinical Outcomes" },
            { value: "hedis", label: "HEDIS Measures" },
            { value: "engagement", label: "Engagement" },
            { value: "financial", label: "Financial / ROI" },
            { value: "recohortisation", label: "Re-Cohortisation" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none px-4 py-2.5 text-xs font-semibold text-text-muted data-[state=active]:text-brand-primary data-[state=active]:shadow-none data-[state=active]:after:bg-brand-primary"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab explanations */}
        <div className="py-3">
          {activeTab === "clinical" && (
            <p className="text-xs text-text-muted leading-relaxed">
              Track glycaemic control, complication rates, medication adherence, and care gap closure across the enrolled population. Metrics are computed from patient lab results, diagnoses, and pharmacy claims linked to the selected program.
            </p>
          )}
          {activeTab === "hedis" && (
            <p className="text-xs text-text-muted leading-relaxed">
              Healthcare Effectiveness Data and Information Set measures for diabetes care quality. These standardised metrics track screening completion rates and chronic disease management benchmarks against national targets.
            </p>
          )}
          {activeTab === "engagement" && (
            <p className="text-xs text-text-muted leading-relaxed">
              Monitor patient enrollment, outreach completion, response times, and active participation across care management pathways. High engagement correlates with improved clinical outcomes and cohort progression.
            </p>
          )}
          {activeTab === "financial" && (
            <p className="text-xs text-text-muted leading-relaxed">
              Measure the return on investment of care management interventions through cost avoidance, emergency department reduction, and per-member savings driven by cohort risk improvements.
            </p>
          )}
          {activeTab === "recohortisation" && (
            <p className="text-xs text-text-muted leading-relaxed">
              Review pending cohort override requests and track patient migrations between risk tiers. Migrations reflect scoring engine re-evaluations as patient clinical data changes over time.
            </p>
          )}
        </div>

        {(["clinical", "hedis", "engagement", "financial"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="min-h-0 flex-1 overflow-auto">
            <div className="space-y-4">
              {tab === "clinical" && (
                <AIQuarterlyInsight
                  insight={quarterlyInsight}
                  loading={insightLoading}
                  onRefreshAction={loadInsight}
                />
              )}
              <OutcomesKpiStrip metrics={tabMetrics[tab]} loading={metricsLoading} />
              <OutcomesTable metrics={tabMetrics[tab]} loading={metricsLoading} />
              {tab === "clinical" && (
                <MigrationSummary
                  summary={migrationSummary}
                  history={migrationHistory?.items ?? []}
                  loading={migrationLoading}
                />
              )}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="recohortisation" className="min-h-0 flex-1 overflow-auto">
          <div className="space-y-4">
            <MigrationApprovalTable
              items={pendingOverrides?.items ?? []}
              loading={overridesLoading}
              onApproveAction={handleApprove}
              onRejectAction={handleReject}
            />
            <MigrationSummary
              summary={migrationSummary}
              history={migrationHistory?.items ?? []}
              loading={migrationLoading}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
