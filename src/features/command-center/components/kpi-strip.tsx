"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import type { CommandCenterKPIs } from "@/services/types/command-center";

interface KpiStripProps {
  kpis: CommandCenterKPIs | null;
  loading: boolean;
}

interface KpiCell {
  label: string;
  key: keyof CommandCenterKPIs;
  icon: React.ElementType;
  iconColor: string;
  format?: (v: number) => string;
  colorWhen?: (v: number) => string;
}

const CELLS: KpiCell[] = [
  { label: "Members", key: "total_members", icon: Icons.patients, iconColor: "text-indigo-500 dark:text-indigo-400", format: (v) => v.toLocaleString() },
  { label: "Risk Score", key: "avg_risk_score", icon: Icons.riskScore, iconColor: "text-amber-500 dark:text-amber-400", format: (v) => v.toFixed(1) },
  { label: "HbA1c <7%", key: "hba1c_control_rate", icon: Icons.hba1c, iconColor: "text-green-600 dark:text-green-400", format: (v) => `${v}%` },
  {
    label: "Care Gaps",
    key: "open_care_gaps",
    icon: Icons.careGap,
    iconColor: "text-red-500 dark:text-red-400",
    format: (v) => v.toLocaleString(),
    colorWhen: (v) => (v > 0 ? "text-red-600 dark:text-red-400" : "text-text-primary"),
  },
  { label: "PDC ≥80%", key: "pdc_above_80_rate", icon: Icons.pdc, iconColor: "text-emerald-500", format: (v) => `${v}%` },
];

export function KpiStrip({ kpis, loading }: KpiStripProps) {
  return (
    <div className="flex shrink-0 gap-px overflow-hidden rounded-xl bg-border-default shadow-sm">
      {CELLS.map((cell) => {
        const raw = kpis?.[cell.key] ?? null;
        const value = typeof raw === "number" ? (cell.format?.(raw) ?? String(raw)) : "—";
        const valueColor = typeof raw === "number" && cell.colorWhen ? cell.colorWhen(raw) : "text-text-primary";
        const Icon = cell.icon;

        return (
          <div key={cell.key} className="flex flex-1 items-center gap-2.5 bg-bg-primary px-3.5 py-2.5">
            <Icon className={cn("h-4 w-4 shrink-0", cell.iconColor)} />
            <div>
              {loading ? (
                <div className="space-y-1">
                  <Skeleton className="h-2.5 w-12" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ) : (
                <>
                  <div className="text-[9px] font-medium uppercase tracking-[0.06em] text-text-muted">
                    {cell.label}
                  </div>
                  <div className="mt-0.5">
                    <span className={cn("text-xl font-bold tabular-nums", valueColor)}>{value}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
