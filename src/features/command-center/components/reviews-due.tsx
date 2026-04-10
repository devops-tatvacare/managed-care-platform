"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { buildPath } from "@/config/routes";
import type { UpcomingReviewItem } from "@/services/types/command-center";

interface ReviewsDueProps {
  items: UpcomingReviewItem[];
  loading: boolean;
}

function urgencyStyle(days: number): { badge: string; text: string } {
  if (days <= 1) return { badge: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300", text: "text-red-600 dark:text-red-400" };
  if (days <= 3) return { badge: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-300", text: "text-orange-600 dark:text-orange-400" };
  if (days <= 5) return { badge: "border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300", text: "text-yellow-700 dark:text-yellow-400" };
  return { badge: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400", text: "text-text-muted" };
}

export function ReviewsDue({ items, loading }: ReviewsDueProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-primary shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-border-default px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Icons.review className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
          <span className="text-[11px] font-semibold text-text-primary">Reviews Due</span>
        </div>
        <span className="text-[9px] text-text-muted">Next 7 days</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 px-3.5 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full items-center justify-center py-8">
            <div className="space-y-1.5 text-center">
              <Icons.completed className="mx-auto h-5 w-5 text-green-500 dark:text-green-400" />
              <p className="text-[11px] text-text-muted">No upcoming reviews</p>
            </div>
          </div>
        ) : (
          items.map((item) => {
            const urg = urgencyStyle(item.days_until_due);
            return (
              <button
                key={`${item.patient_id}-${item.program_id}`}
                type="button"
                className="flex w-full items-center gap-2.5 border-b border-border-subtle px-3.5 py-2 text-left transition-colors hover:bg-bg-hover"
                onClick={() => router.push(buildPath("patientDetail", { id: item.patient_id }))}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-medium text-text-primary">{item.patient_name}</span>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {item.cohort_name && (
                      <>
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: item.cohort_color }}
                        />
                        <span className="text-[9px] text-text-muted">{item.cohort_name}</span>
                      </>
                    )}
                    {item.program_name && (
                      <span className="text-[9px] text-text-placeholder">· {item.program_name}</span>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={cn("shrink-0 text-[9px] font-semibold tabular-nums", urg.badge)}>
                  {item.days_until_due === 0 ? "Today" : item.days_until_due === 1 ? "Tomorrow" : `${item.days_until_due}d`}
                </Badge>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
