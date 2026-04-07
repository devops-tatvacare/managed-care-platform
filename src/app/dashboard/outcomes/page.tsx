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
        <TabsList className="w-full justify-start border-b bg-transparent px-0">
          <TabsTrigger value="clinical" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-primary">
            Clinical Outcomes
          </TabsTrigger>
          <TabsTrigger value="hedis" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-primary">
            HEDIS Measures
          </TabsTrigger>
          <TabsTrigger value="engagement" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-primary">
            Engagement
          </TabsTrigger>
          <TabsTrigger value="financial" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-primary">
            Financial / ROI
          </TabsTrigger>
          <TabsTrigger value="recohortisation" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-primary">
            Re-Cohortisation
          </TabsTrigger>
        </TabsList>

        {(["clinical", "hedis", "engagement", "financial"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="min-h-0 flex-1 overflow-auto">
            <div className="space-y-4 py-3">
              <OutcomesKpiStrip metrics={tabMetrics[tab]} loading={metricsLoading} />
              <OutcomesTable metrics={tabMetrics[tab]} loading={metricsLoading} />
              {tab === "clinical" && (
                <>
                  <MigrationSummary
                    summary={migrationSummary}
                    history={migrationHistory?.items ?? []}
                    loading={migrationLoading}
                  />
                  <AIQuarterlyInsight
                    insight={quarterlyInsight}
                    loading={insightLoading}
                    onRefreshAction={loadInsight}
                  />
                </>
              )}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="recohortisation" className="min-h-0 flex-1 overflow-auto">
          <div className="space-y-4 py-3">
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
