"use client";

import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import type { OrchestrationStats as Stats } from "@/services/types/communications";

interface OrchestrationStatsProps {
  stats: Stats | null;
  loading: boolean;
  activeFilter?: string;
  onFilterAction?: (status: string) => void;
}

const CELLS = [
  { key: "total_sequences" as const, label: "Total", icon: Icons.outreach, color: "" },
  { key: "active" as const, label: "Active", icon: Icons.active, color: "text-indigo-600 dark:text-indigo-400", filter: "pending" },
  { key: "completed" as const, label: "Completed", icon: Icons.completed, color: "text-green-600 dark:text-green-400", filter: "success" },
  { key: "failed" as const, label: "Failed", icon: Icons.warning, color: "text-red-600 dark:text-red-400", filter: "failed" },
];

export function OrchestrationStats({ stats, loading, activeFilter, onFilterAction }: OrchestrationStatsProps) {
  return (
    <div className="flex shrink-0 gap-px overflow-hidden rounded-xl bg-border-default">
      {CELLS.map((cell) => {
        const value = stats?.[cell.key] ?? 0;
        const isActive = activeFilter && cell.filter === activeFilter;
        const Icon = cell.icon;

        return (
          <button
            key={cell.key}
            type="button"
            onClick={() => cell.filter && onFilterAction?.(cell.filter)}
            className={cn(
              "flex flex-1 items-center gap-2.5 bg-bg-primary px-3.5 py-2.5 text-left transition-colors",
              cell.filter ? "cursor-pointer hover:bg-bg-hover" : "cursor-default",
              isActive && "bg-brand-primary-light",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", cell.color || "text-text-muted")} />
            <div>
              {loading ? (
                <Skeleton className="h-5 w-10" />
              ) : (
                <span className={cn("text-lg font-bold tabular-nums", cell.color || "text-text-primary")}>
                  {value}
                </span>
              )}
              <div className="text-[9px] font-medium uppercase tracking-[0.06em] text-text-muted">
                {cell.label}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
