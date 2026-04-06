"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathwayBuilderStore } from "@/stores/pathway-builder-store";
import { getBlockType, getCategoryDef } from "@/config/block-types";
import { Icons, type IconName } from "@/config/icons";
import { Button } from "@/components/ui/button";
import { BlockConfigForm } from "./block-config-form";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConfigDrawer() {
  const selectedBlockId = usePathwayBuilderStore((s) => s.selectedBlockId);
  const blocks = usePathwayBuilderStore((s) => s.blocks);
  const updateBlock = usePathwayBuilderStore((s) => s.updateBlock);
  const deleteBlock = usePathwayBuilderStore((s) => s.deleteBlock);
  const selectBlock = usePathwayBuilderStore((s) => s.selectBlock);
  const builderLoading = usePathwayBuilderStore((s) => s.builderLoading);

  const block = blocks.find((b) => b.id === selectedBlockId) ?? null;
  const blockType = block ? getBlockType(block.block_type) : undefined;
  const categoryDef = blockType ? getCategoryDef(blockType.category) : undefined;

  // Local config state, driven by onChange from the form
  const [pendingConfig, setPendingConfig] = useState<Record<string, unknown>>(
    block?.config ?? {}
  );

  // Reset pending config when block selection changes
  useEffect(() => {
    setPendingConfig(block?.config ?? {});
  }, [block?.id, block?.config]);

  const handleChange = useCallback((config: Record<string, unknown>) => {
    setPendingConfig(config);
  }, []);

  const handleSave = useCallback(() => {
    if (!block) return;
    updateBlock(block.id, { config: pendingConfig });
  }, [block, pendingConfig, updateBlock]);

  const handleDelete = useCallback(() => {
    if (!block) return;
    deleteBlock(block.id);
  }, [block, deleteBlock]);

  // Don't render when nothing is selected
  if (!selectedBlockId || !block) return null;

  const IconComponent = blockType
    ? Icons[blockType.icon as IconName]
    : Icons.settings;

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l bg-background">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        {categoryDef && (
          <div
            className={cn(
              "flex size-7 items-center justify-center rounded",
              categoryDef.iconBgClass
            )}
          >
            <IconComponent className="size-4 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {block.label}
          </p>
          {blockType && (
            <p className="text-xs text-muted-foreground truncate">
              {blockType.description}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => selectBlock(null)}
        >
          <Icons.close />
        </Button>
      </div>

      {/* ── Body (scrollable) ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <BlockConfigForm
          configFields={blockType?.configFields ?? []}
          initialConfig={block.config}
          onChange={handleChange}
        />
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-t px-4 py-3">
        <Button
          size="sm"
          className="flex-1"
          disabled={builderLoading}
          onClick={handleSave}
        >
          {builderLoading ? (
            <Icons.spinner className="size-4 animate-spin" />
          ) : (
            "Save Block"
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={builderLoading}
          onClick={handleDelete}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
