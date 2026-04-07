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
        "rounded-lg border-2 bg-bg-primary shadow-md min-w-[220px] max-w-[280px] transition-all",
        selected
          ? "border-brand-primary ring-2 ring-brand-primary/20"
          : "border-border-default hover:shadow-lg",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-brand-primary !w-3 !h-1.5 !rounded-full !border-0 !-top-1"
      />

      {/* Category bar */}
      <div className={cn("flex items-center gap-2 rounded-t-md px-3 py-1.5", catDef?.bgClass)}>
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
            "text-[10px] font-semibold uppercase tracking-wider",
            catDef?.colorClass,
          )}
        >
          {catDef?.label}
        </span>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        <p className="text-sm font-semibold text-text-primary">{d.label}</p>
        {blockDef && (
          <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
            {blockDef.description}
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-brand-primary !w-3 !h-1.5 !rounded-full !border-0 !-bottom-1"
      />
    </div>
  );
}

export const PathwayBlockNode = memo(PathwayBlockNodeInner);
