"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { buildPath } from "@/config/routes";
import type { UpcomingReviewItem } from "@/services/types/command-center";

interface ReviewsDueProps {
  items: UpcomingReviewItem[];
  loading: boolean;
}

function daysBadgeClasses(days: number): string {
  if (days <= 3) return "bg-status-error-bg text-status-error";
  if (days <= 5) return "bg-status-warning-bg text-status-warning";
  return "bg-bg-hover text-text-muted";
}

export function ReviewsDue({ items, loading }: ReviewsDueProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-primary">
      {/* Header — pinned */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-default px-3.5 py-2.5">
        <span className="text-[11px] font-semibold text-text-primary">Reviews Due</span>
        <span className="text-[9px] text-text-muted">Next 7 days</span>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 px-3.5 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full rounded" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="px-3.5 py-6 text-center text-[11px] text-text-muted">No upcoming reviews</p>
        ) : (
          items.map((item) => (
            <button
              key={`${item.patient_id}-${item.program_id}`}
              type="button"
              className="flex w-full items-center justify-between border-b border-border-subtle px-3.5 py-2 text-left transition-colors hover:bg-bg-hover"
              onClick={() => router.push(buildPath("patientDetail", { id: item.patient_id }))}
            >
              <span className="text-[10px] font-medium text-text-primary">{item.patient_name}</span>
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-px text-[9px] font-semibold",
                  daysBadgeClasses(item.days_until_due),
                )}
              >
                {item.days_until_due}d
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
