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
import { getCategoryDef, getBlockType } from "@/config/block-types";
import type { IconName } from "@/config/icons";
import { cn } from "@/lib/cn";

function ConfigBlockList() {
  const blocks = usePathwayBuilderStore((s) => s.blocks);
  const selectedBlockId = usePathwayBuilderStore((s) => s.selectedBlockId);
  const selectBlock = usePathwayBuilderStore((s) => s.selectBlock);

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-border-default bg-bg-primary">
      <div className="border-b border-border-default px-4 py-3">
        <p className="text-xs font-semibold text-text-primary">
          Pathway Blocks ({blocks.length})
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted text-sm px-4 text-center">
            <Icons.pathwayBuilder className="h-8 w-8 mb-2 opacity-20" />
            No blocks yet. Switch to Visual Canvas or AI Builder to add blocks.
          </div>
        ) : (
          <div className="py-1">
            {blocks.map((block) => {
              const catDef = getCategoryDef(block.category as "eligibility" | "action" | "logic" | "escalation" | "schedule");
              const blockDef = getBlockType(block.block_type);
              const IconComp = blockDef ? Icons[blockDef.icon as IconName] : null;
              const isSelected = block.id === selectedBlockId;

              return (
                <button
                  key={block.id}
                  onClick={() => selectBlock(block.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors",
                    isSelected
                      ? "bg-brand-primary-light border-l-[3px] border-brand-primary"
                      : "border-l-[3px] border-transparent hover:bg-bg-hover",
                  )}
                >
                  <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded", catDef?.iconBgClass)}>
                    {IconComp && <IconComp className="h-3 w-3 text-white" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{block.label}</p>
                    <p className="text-[10px] text-text-muted truncate">{blockDef?.description ?? block.block_type}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const MODE_TABS = [
  { value: "ai", label: "AI Builder" },
  { value: "canvas", label: "Visual Canvas" },
  { value: "config", label: "Configuration" },
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
          onValueChange={(v) =>
            setBuilderMode(v as "ai" | "canvas" | "config")
          }
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

        {builderMode === "config" && (
          <div className="flex h-full">
            <ConfigBlockList />
            {selectedBlockId ? (
              <div className="flex-1">
                <ConfigDrawer />
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
                Select a block from the list to configure
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
