"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { CohortDistribution as CohortDistData } from "@/services/types/cohort";
import type { ProgramListItem } from "@/services/types/program";

interface CohortDistributionProps {
  programs: ProgramListItem[];
  distributions: Record<string, CohortDistData[]>;
  loading: boolean;
}

const TIER_COLORS = [
  { bg: "bg-tier-0", text: "text-green-800" },
  { bg: "bg-tier-1", text: "text-blue-800" },
  { bg: "bg-tier-2", text: "text-yellow-800" },
  { bg: "bg-tier-3", text: "text-orange-800" },
  { bg: "bg-tier-4", text: "text-red-800" },
];

export function CohortDistribution({ programs, distributions, loading }: CohortDistributionProps) {
  // Flatten all cohorts across programs
  const bars: { name: string; count: number; colorIdx: number }[] = [];
  let maxCount = 0;
  for (const program of programs) {
    const dist = distributions[program.id] ?? [];
    dist.forEach((cohort, i) => {
      bars.push({ name: cohort.cohort_name, count: cohort.count, colorIdx: i % TIER_COLORS.length });
      if (cohort.count > maxCount) maxCount = cohort.count;
    });
  }

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-primary">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-default px-3.5 py-2.5">
        <span className="text-[11px] font-semibold text-text-primary">Cohort Distribution</span>
        <span className="text-[9px] text-text-muted">All programs</span>
      </div>

      {/* Body — vertically centered */}
      <div className="flex flex-1 flex-col justify-center px-3.5 py-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3.5 w-full rounded" />
            ))}
          </div>
        ) : bars.length === 0 ? (
          <p className="text-center text-[11px] text-text-muted">No data</p>
        ) : (
          <div className="flex flex-col gap-2">
            {bars.map((bar) => {
              const pct = maxCount > 0 ? (bar.count / maxCount) * 100 : 0;
              const colors = TIER_COLORS[bar.colorIdx];
              return (
                <div key={bar.name} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-right text-[9px] text-text-muted">{bar.name}</span>
                  <div className="relative h-3.5 flex-1 overflow-hidden rounded bg-bg-hover">
                    <div
                      className={`absolute inset-y-0 left-0 flex items-center justify-end rounded pr-1.5 ${colors.bg}`}
                      style={{ width: `${Math.max(pct, 8)}%` }}
                    >
                      <span className={`text-[8px] font-semibold ${colors.text}`}>
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
