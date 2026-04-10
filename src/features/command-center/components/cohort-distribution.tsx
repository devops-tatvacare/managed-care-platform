"use client";

import { Icons } from "@/config/icons";
import { Skeleton } from "@/components/ui/skeleton";
import type { CohortDistribution as CohortDistData } from "@/services/types/cohort";
import type { ProgramListItem } from "@/services/types/program";

interface CohortDistributionProps {
  programs: ProgramListItem[];
  distributions: Record<string, CohortDistData[]>;
  loading: boolean;
}

export function CohortDistribution({ programs, distributions, loading }: CohortDistributionProps) {
  // Flatten all cohorts across programs, using actual cohort colors
  const bars: { name: string; count: number; color: string }[] = [];
  let maxCount = 0;
  for (const program of programs) {
    const dist = distributions[program.id] ?? [];
    for (const cohort of dist) {
      // Strip "Cohort N — " prefix for compact display
      const shortName = cohort.cohort_name.replace(/^Cohort \d+\s*[—–-]\s*/, "");
      bars.push({ name: shortName || cohort.cohort_name, count: cohort.count, color: cohort.cohort_color });
      if (cohort.count > maxCount) maxCount = cohort.count;
    }
  }

  const totalMembers = bars.reduce((s, b) => s + b.count, 0);

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-primary shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-border-default px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Icons.cohortisation className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
          <span className="text-[11px] font-semibold text-text-primary">Cohort Distribution</span>
        </div>
        {!loading && totalMembers > 0 && (
          <span className="text-[10px] tabular-nums text-text-muted">
            {totalMembers.toLocaleString()} members
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center px-3.5 py-3">
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full rounded" />
            ))}
          </div>
        ) : bars.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <div className="space-y-1.5 text-center">
              <Icons.cohortisation className="mx-auto h-5 w-5 text-text-placeholder" />
              <p className="text-[11px] text-text-muted">No distribution data</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {bars.map((bar) => {
              const pct = maxCount > 0 ? (bar.count / maxCount) * 100 : 0;
              return (
                <div key={bar.name} className="flex items-center gap-2.5">
                  <div className="flex w-24 shrink-0 items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: bar.color }}
                    />
                    <span className="truncate text-[10px] text-text-secondary">{bar.name}</span>
                  </div>
                  <div className="relative h-4 flex-1 overflow-hidden rounded-md bg-bg-hover">
                    <div
                      className="absolute inset-y-0 left-0 flex items-center justify-end rounded-md pr-1.5 transition-all"
                      style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: bar.color }}
                    >
                      <span className="text-[9px] font-semibold text-white drop-shadow-sm">
                        {bar.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
