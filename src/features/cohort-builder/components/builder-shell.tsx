"use client";

import { useState } from "react";
import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import { Icons } from "@/config/icons";
import { StatusBadge } from "@/components/shared/status-badge";
import { PATHWAY_STATUS } from "@/config/status";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const MODE_TABS = [
  { value: "ai", label: "AI Builder" },
  { value: "config", label: "Configuration" },
] as const;

const CONFIG_TABS = [
  { value: "cohorts", label: "Cohorts" },
  { value: "scoring", label: "Scoring Engine" },
  { value: "overrides", label: "Override Rules" },
  { value: "pathways", label: "Linked Pathways" },
] as const;

export function BuilderShell() {
  const {
    program,
    programLoading,
    builderMode,
    setBuilderMode,
    publishProgram,
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
                className="rounded-none px-4 py-2 text-xs font-semibold text-text-muted data-[state=active]:text-brand-primary data-[state=active]:shadow-none data-[state=active]:after:bg-brand-primary"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Icons.saveDraft className="mr-1.5 h-3.5 w-3.5" />
            Save Draft
          </Button>
          <Button size="sm" onClick={() => publishProgram()}>
            <Icons.publish className="mr-1.5 h-3.5 w-3.5" />
            Publish v{program.version + 1}
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex h-0 flex-1 flex-col overflow-hidden">
        {builderMode === "ai" && (
          <div className="flex h-full items-center justify-center text-sm text-text-muted">
            AI Builder — coming in Task 5
          </div>
        )}

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
                      className="rounded-none px-4 py-2 text-xs font-semibold text-text-muted data-[state=active]:text-brand-primary data-[state=active]:shadow-none data-[state=active]:after:bg-brand-primary"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Config tab content */}
            <div className="flex-1 overflow-y-auto p-6">
              {configTab === "cohorts" && (
                <div className="text-sm text-text-muted">Cohort cards — coming in Task 6</div>
              )}
              {configTab === "scoring" && (
                <div className="text-sm text-text-muted">Scoring engine — coming in Task 8</div>
              )}
              {configTab === "overrides" && (
                <div className="text-sm text-text-muted">Override rules — coming in Task 9</div>
              )}
              {configTab === "pathways" && (
                <div className="text-sm text-text-muted">Linked pathways — coming in Task 9</div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
