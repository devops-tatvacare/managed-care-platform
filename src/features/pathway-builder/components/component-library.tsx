"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Icons, type IconName } from "@/config/icons";
import {
  BLOCK_CATEGORIES,
  getBlocksByCategory,
  type BlockTypeDefinition,
  type CategoryDefinition,
} from "@/config/block-types";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------
// BlockCard
// ---------------------------------------------------------------------------

function BlockCard({
  block,
  category,
}: {
  block: BlockTypeDefinition;
  category: CategoryDefinition;
}) {
  const IconComponent = Icons[block.icon as IconName];

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        block_type: block.type,
        category: block.category,
        label: block.label,
      }),
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "flex items-center gap-2 rounded-md border p-2 cursor-grab active:cursor-grabbing transition-colors hover:shadow-sm",
        category.bgClass,
        category.borderClass,
      )}
    >
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded",
          category.iconBgClass,
        )}
      >
        {IconComponent && (
          <IconComponent className="h-3 w-3 text-white" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-text-primary truncate">
          {block.label}
        </p>
        <p className="text-[10px] text-text-muted truncate">
          {block.description}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComponentLibrary
// ---------------------------------------------------------------------------

export function ComponentLibrary() {
  const [search, setSearch] = useState("");

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-border-default bg-bg-primary">
      {/* Search */}
      <div className="border-b border-border-default p-3">
        <div className="relative">
          <Icons.search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-placeholder" />
          <Input
            placeholder="Search blocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Block categories */}
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {BLOCK_CATEGORIES.map((cat) => {
          const q = search.toLowerCase();
          const blocks = getBlocksByCategory(cat.key).filter(
            (b) =>
              !q ||
              b.label.toLowerCase().includes(q) ||
              b.description.toLowerCase().includes(q),
          );
          if (blocks.length === 0) return null;

          return (
            <div key={cat.key}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {cat.label}
              </p>
              <div className="space-y-1">
                {blocks.map((block) => (
                  <BlockCard
                    key={block.type}
                    block={block}
                    category={cat}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
