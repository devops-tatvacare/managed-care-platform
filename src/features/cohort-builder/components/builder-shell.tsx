"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import { Icons } from "@/config/icons";
import { StatusBadge } from "@/components/shared/status-badge";
import { PATHWAY_STATUS } from "@/config/status";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AIBuilder } from "./ai-builder";
import { CohortTable } from "./cohort-table";
import { ScoringTable } from "./scoring-table";
import { OverrideRulesTable } from "./override-rules-table";
import { LinkedPathwaysPanel } from "./linked-pathways-panel";

const MODE_TABS = [
  { value: "ai", label: "AI Builder", icon: Icons.ai },
  { value: "config", label: "Configuration", icon: Icons.config },
];

const CONFIG_TABS = [
  { value: "cohorts", label: "Cohorts", icon: Icons.cohortisation },
  { value: "scoring", label: "Scoring Engine", icon: Icons.compositeScore },
  { value: "overrides", label: "Override Rules", icon: Icons.override },
  { value: "pathways", label: "Linked Pathways", icon: Icons.pathwayBuilder },
];

export function BuilderShell() {
  const {
    program,
    programLoading,
    builderMode,
    setBuilderMode,
    saveDraft,
    publishProgram,
    saving,
    publishing,
    isDirty,
  } = useCohortBuilderStore();

  const [configTab, setConfigTab] = useState<string>("cohorts");

  if (programLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Icons.spinner className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!program) return null;

  const statusConfig = PATHWAY_STATUS[program.status] ?? PATHWAY_STATUS.draft;

  return (
    <>
      {/* Top Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-default bg-bg-primary px-4 py-2">
        {/* Left: program name + status */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-text-primary">
            {program.name}
          </span>
          <StatusBadge config={statusConfig} />
        </div>

        {/* Center: mode tabs */}
        <Tabs
          value={builderMode}
          onValueChange={(v) => setBuilderMode(v as "ai" | "config")}
          className="flex-col gap-0"
        >
          <TabsList
            variant="line"
            className="gap-0 border-none bg-transparent"
          >
            {MODE_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1.5 rounded-none px-4 py-2 text-xs font-semibold text-text-muted data-[state=active]:text-brand-primary data-[state=active]:shadow-none data-[state=active]:after:bg-brand-primary"
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={saving || !isDirty}
            onClick={async () => {
              try {
                await saveDraft();
                toast.success("Draft saved");
              } catch {
                toast.error("Failed to save draft");
              }
            }}
          >
            {saving ? (
              <Icons.spinner className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icons.saveDraft className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save Draft
          </Button>
          <Button
            size="sm"
            disabled={publishing || !isDirty}
            onClick={async () => {
              try {
                await publishProgram();
                toast.success("Program published");
              } catch {
                toast.error("Failed to publish");
              }
            }}
          >
            {publishing ? (
              <Icons.spinner className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icons.publish className="mr-1.5 h-3.5 w-3.5" />
            )}
            Publish
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex h-0 flex-1 flex-col overflow-hidden">
        {builderMode === "ai" && <AIBuilder />}

        {builderMode === "config" && (
          <>
            {/* Config sub-tabs */}
            <div className="shrink-0 border-b border-border-default bg-bg-primary px-4">
              <Tabs
                value={configTab}
                onValueChange={setConfigTab}
                className="flex-col gap-0"
              >
                <TabsList
                  variant="line"
                  className="gap-0 border-none bg-transparent"
                >
                  {CONFIG_TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="gap-1.5 rounded-none px-4 py-2 text-xs font-semibold text-text-muted data-[state=active]:text-brand-primary data-[state=active]:shadow-none data-[state=active]:after:bg-brand-primary"
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Config tab content */}
            <div className="flex-1 overflow-y-auto p-6">
              {configTab === "cohorts" && <CohortTable />}
              {configTab === "scoring" && <ScoringTable />}
              {configTab === "overrides" && <OverrideRulesTable />}
              {configTab === "pathways" && <LinkedPathwaysPanel />}
            </div>
          </>
        )}
      </div>
    </>
  );
}
