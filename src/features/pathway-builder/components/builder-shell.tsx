"use client";

import { usePathwayBuilderStore } from "@/stores/pathway-builder-store";
import { Icons } from "@/config/icons";
import { StatusBadge } from "@/components/shared/status-badge";
import { PATHWAY_STATUS } from "@/config/status";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AIBuilder } from "./ai-builder";
import { ComponentLibrary } from "./component-library";
import { VisualCanvas } from "./visual-canvas";
import { ConfigDrawer } from "./config-drawer";

const MODE_TABS = [
  { value: "ai", label: "AI Builder" },
  { value: "canvas", label: "Visual Canvas" },
] as const;

export function BuilderShell() {
  const {
    selectedPathway,
    builderMode,
    setBuilderMode,
    selectedBlockId,
    publishPathway,
  } = usePathwayBuilderStore();

  if (!selectedPathway) return null;

  const statusConfig =
    PATHWAY_STATUS[selectedPathway.status] ?? PATHWAY_STATUS.draft;

  return (
    <>
      {/* Top Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-default bg-bg-primary px-4 py-2">
        {/* Left: pathway name + status */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-text-primary">
            {selectedPathway.name}
          </span>
          <StatusBadge config={statusConfig} />
        </div>

        {/* Center: mode tabs */}
        <Tabs
          value={builderMode}
          onValueChange={(v) => setBuilderMode(v as "ai" | "canvas")}
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
            <Icons.preview className="mr-1.5 h-3.5 w-3.5" />
            Preview
          </Button>
          <Button variant="outline" size="sm">
            <Icons.saveDraft className="mr-1.5 h-3.5 w-3.5" />
            Save Draft
          </Button>
          <Button size="sm" onClick={() => publishPathway()}>
            <Icons.publish className="mr-1.5 h-3.5 w-3.5" />
            Publish &amp; Rollout
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {builderMode === "ai" && <AIBuilder />}

        {builderMode === "canvas" && (
          <div className="flex h-full">
            <ComponentLibrary />
            <div className="flex-1">
              <VisualCanvas />
            </div>
            {selectedBlockId && <ConfigDrawer />}
          </div>
        )}
      </div>
    </>
  );
}
