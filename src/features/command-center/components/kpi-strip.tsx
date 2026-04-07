"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import type { CommandCenterKPIs } from "@/services/types/command-center";

interface KpiStripProps {
  kpis: CommandCenterKPIs | null;
  loading: boolean;
}

interface KpiCell {
  label: string;
  key: keyof CommandCenterKPIs;
  format?: (v: number) => string;
  colorWhen?: (v: number) => string;
}

const CELLS: KpiCell[] = [
  { label: "Members", key: "total_members", format: (v) => v.toLocaleString() },
  { label: "Risk Score", key: "avg_risk_score", format: (v) => v.toFixed(1) },
  { label: "HbA1c <7%", key: "hba1c_control_rate", format: (v) => `${v}%` },
  {
    label: "Care Gaps",
    key: "open_care_gaps",
    format: (v) => v.toLocaleString(),
    colorWhen: (v) => (v > 0 ? "text-status-error" : "text-text-primary"),
  },
  { label: "PDC ≥80%", key: "pdc_above_80_rate", format: (v) => `${v}%` },
];

export function KpiStrip({ kpis, loading }: KpiStripProps) {
  return (
    <div className="flex shrink-0 gap-px overflow-hidden rounded-xl bg-border-default">
      {CELLS.map((cell) => {
        const raw = kpis?.[cell.key] ?? null;
        const value = typeof raw === "number" ? (cell.format?.(raw) ?? String(raw)) : "—";
        const valueColor = typeof raw === "number" && cell.colorWhen ? cell.colorWhen(raw) : "text-text-primary";

        return (
          <div key={cell.key} className="flex-1 bg-bg-primary px-3.5 py-2.5">
            {loading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-12" />
                <Skeleton className="h-5 w-16" />
              </div>
            ) : (
              <>
                <div className="text-[9px] font-medium uppercase tracking-[0.06em] text-text-muted">
                  {cell.label}
                </div>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className={cn("text-xl font-bold", valueColor)}>{value}</span>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
