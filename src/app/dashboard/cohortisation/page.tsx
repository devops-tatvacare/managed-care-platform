"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/cn";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { CRSConfigPanel } from "@/features/cohortisation/components/crs-config-panel";
import { TierThresholdPanel } from "@/features/cohortisation/components/tier-threshold-panel";
import { TierDistributionChart } from "@/features/cohortisation/components/tier-distribution-chart";
import { AssignmentLog } from "@/features/cohortisation/components/assignment-log";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CohortisationPage() {
  const {
    loadConfig,
    loadDistribution,
    loadAssignments,
    recalculate,
    recalculating,
    lastRecalcResult,
  } = useCohortisationStore();
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    loadConfig();
    loadDistribution();
    loadAssignments();
  }, [loadConfig, loadDistribution, loadAssignments]);

  const handleRecalculate = async () => {
    const result = await recalculate();
    if (result) {
      setShowResult(true);
      setTimeout(() => setShowResult(false), 5000);
    }
  };

  return (
    <div className={cn("space-y-6")}>
      <div className={cn("flex items-center justify-between")}>
        <PageHeader
          title="Cohortisation"
          description="CRS formula, tier thresholds, and population scoring"
        />
        <div className={cn("flex items-center gap-3")}>
          {showResult && lastRecalcResult && (
            <span className={cn("text-sm text-muted-foreground")}>
              {lastRecalcResult.processed} scored, {lastRecalcResult.tier_changes} tier changes
            </span>
          )}
          <Button onClick={handleRecalculate} disabled={recalculating}>
            <RefreshCw
              className={cn("mr-1.5 h-4 w-4", recalculating && "animate-spin")}
            />
            {recalculating ? "Recalculating..." : "Recalculate All"}
          </Button>
        </div>
      </div>

      <TierDistributionChart />

      <Tabs defaultValue="crs-formula">
        <TabsList>
          <TabsTrigger value="crs-formula">CRS Formula</TabsTrigger>
          <TabsTrigger value="tier-thresholds">Tier Thresholds</TabsTrigger>
          <TabsTrigger value="assignments">Assignment Log</TabsTrigger>
        </TabsList>
        <TabsContent value="crs-formula" className={cn("mt-4")}>
          <CRSConfigPanel />
        </TabsContent>
        <TabsContent value="tier-thresholds" className={cn("mt-4")}>
          <TierThresholdPanel />
        </TabsContent>
        <TabsContent value="assignments" className={cn("mt-4")}>
          <AssignmentLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
