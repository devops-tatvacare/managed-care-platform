"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import type { MetricValue } from "@/services/types/outcomes";

interface OutcomesKpiStripProps {
  metrics: MetricValue[];
  loading: boolean;
}

function formatValue(m: MetricValue): string {
  if (m.value === null) return "—";
  if (m.unit === "percent") return `${m.value}%`;
  if (m.unit === "currency") return `$${m.value.toLocaleString()}`;
  if (m.unit === "ratio") return `${m.value}x`;
  if (m.unit === "per_1k_mm") return `${m.value}`;
  if (m.unit === "hours") return `${m.value}h`;
  return String(m.value);
}

function statusColor(m: MetricValue): string {
  if (m.value === null || m.target_value === null) return "text-text-primary";
  const lowerIsBetter = m.metric_key === "hospitalisation_rate" || m.metric_key === "avg_response_time";
  const atTarget = lowerIsBetter ? m.value <= m.target_value : m.value >= m.target_value;
  return atTarget ? "text-status-success" : "text-status-warning";
}

export function OutcomesKpiStrip({ metrics, loading }: OutcomesKpiStripProps) {
  const display = metrics.slice(0, 4);

  return (
    <div className="flex shrink-0 gap-px overflow-hidden rounded-xl bg-border-default">
      {display.map((m) => (
        <div key={m.metric_key} className="flex-1 bg-bg-primary px-3.5 py-2.5">
          {loading ? (
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ) : (
            <>
              <div className="text-[9px] font-medium uppercase tracking-[0.06em] text-text-muted">
                {m.label}
              </div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className={cn("text-xl font-bold", statusColor(m))}>
                  {formatValue(m)}
                </span>
                {m.target_value !== null && (
                  <span className="text-xs text-text-muted">
                    / {m.unit === "currency" ? `$${m.target_value}` : m.target_value}{m.unit === "percent" ? "%" : ""}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
