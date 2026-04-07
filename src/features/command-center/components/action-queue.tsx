"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { buildPath } from "@/config/routes";
import type { ActionQueueItem } from "@/services/types/command-center";

const PRIORITY_BORDER: Record<string, string> = {
  high: "border-l-status-error",
  medium: "border-l-status-warning",
  low: "border-l-border-default",
};

interface ActionQueueProps {
  items: ActionQueueItem[];
  loading: boolean;
}

export function ActionQueue({ items, loading }: ActionQueueProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-primary">
      {/* Header — pinned */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-default px-3.5 py-2.5">
        <span className="text-[11px] font-semibold text-text-primary">Action Queue</span>
        {!loading && (
          <span className="rounded-full bg-brand-primary-light px-1.5 py-px text-[9px] font-semibold text-brand-primary">
            {items.length}
          </span>
        )}
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 px-3.5 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="px-3.5 py-6 text-center text-[11px] text-text-muted">No pending actions</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-between border-b border-border-subtle border-l-[3px] px-3.5 py-2",
                PRIORITY_BORDER[item.priority],
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium text-text-primary">{item.title}</div>
                <div className="mt-px text-[9px] text-text-muted">{item.description}</div>
              </div>
              <button
                type="button"
                className="ml-2 shrink-0 rounded-md bg-brand-primary-light px-2 py-0.5 text-[9px] font-medium text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
                onClick={() => router.push(buildPath("patientDetail", { id: item.patient_id }))}
              >
                View →
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
