"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getBlockType, getCategoryDef, type BlockCategory } from "@/config/block-types";
import { Icons, type IconName } from "@/config/icons";
import { cn } from "@/lib/cn";

interface BlockNodeData {
  label: string;
  block_type: string;
  category: string;
  selected?: boolean;
  [key: string]: unknown;
}

function PathwayBlockNodeInner({ data, selected }: NodeProps) {
  const d = data as BlockNodeData;
  const blockDef = getBlockType(d.block_type);
  const catDef = getCategoryDef(d.category as BlockCategory);
  const IconComp = blockDef ? Icons[blockDef.icon as IconName] : null;

  return (
    <div
      className={cn(
        "rounded-lg border-2 bg-bg-primary shadow-sm min-w-[180px] max-w-[220px] transition-all",
        selected
          ? "border-brand-primary ring-2 ring-brand-primary/20"
          : "border-border-default",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-border-default !w-3 !h-1.5 !rounded-sm !border-0 !-top-1"
      />

      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {catDef && (
            <div
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded",
                catDef.iconBgClass,
              )}
            >
              {IconComp && <IconComp className="h-3 w-3 text-white" />}
            </div>
          )}
          <span
            className={cn(
              "text-[10px] font-medium uppercase tracking-wider",
              catDef?.colorClass,
            )}
          >
            {catDef?.label}
          </span>
        </div>
        <p className="text-xs font-semibold text-text-primary truncate">
          {d.label}
        </p>
        {blockDef && (
          <p className="text-[10px] text-text-muted mt-0.5 truncate">
            {blockDef.description}
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-border-default !w-3 !h-1.5 !rounded-sm !border-0 !-bottom-1"
      />
    </div>
  );
}

export const PathwayBlockNode = memo(PathwayBlockNodeInner);
