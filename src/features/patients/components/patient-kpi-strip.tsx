"use client";

import { cn } from "@/lib/cn";
import { getTier } from "@/config/tiers";
import { TIER_BADGE_STYLES } from "@/config/status";
import { formatDate } from "@/lib/format";
import type { PatientDetail } from "@/services/types/patient";

interface PatientKpiStripProps {
  patient: PatientDetail;
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return "--";
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "1 day ago";
  return `${diff}d ago`;
}

function lowestPdc(
  meds: PatientDetail["active_medications"],
): { name: string; pdc: number } | null {
  if (!meds || meds.length === 0) return null;
  return meds.reduce(
    (low, m) => (m.pdc_90day < low.pdc ? { name: m.name, pdc: m.pdc_90day } : low),
    { name: meds[0].name, pdc: meds[0].pdc_90day },
  );
}

interface KpiItem {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}

export function PatientKpiStrip({ patient }: PatientKpiStripProps) {
  const tier = getTier(patient.tier);
  const tierStyle = TIER_BADGE_STYLES[patient.tier];
  const careGapCount = patient.care_gaps?.length ?? 0;
  const worstPdc = lowestPdc(patient.active_medications);

  const pdcValueClass = worstPdc
    ? worstPdc.pdc >= 0.8
      ? "text-status-success"
      : worstPdc.pdc >= 0.6
        ? "text-status-warning"
        : "text-status-error"
    : undefined;

  const kpis: KpiItem[] = [
    {
      label: "CRS Score",
      value: String(patient.crs_score),
      sub: tier.label,
      valueClass: tierStyle?.className,
    },
    {
      label: "Care Gaps",
      value: String(careGapCount),
      sub: patient.care_gaps?.slice(0, 2).join(", ") || undefined,
      valueClass: careGapCount > 0 ? "text-status-warning" : undefined,
    },
    {
      label: "Last Contact",
      value: daysAgo(patient.last_contact_date),
    },
    {
      label: "Pathway",
      value: patient.pathway_status ?? "--",
      sub: patient.pathway_name ?? undefined,
      valueClass: "text-brand-primary",
    },
    {
      label: "Lowest PDC",
      value: worstPdc ? `${Math.round(worstPdc.pdc * 100)}%` : "--",
      sub: worstPdc?.name,
      valueClass: pdcValueClass,
    },
    {
      label: "Assigned To",
      value: patient.assigned_to ?? "--",
      sub: patient.review_due_date
        ? `Review: ${formatDate(patient.review_due_date)}`
        : undefined,
    },
  ];

  return (
    <div className="mt-3 grid grid-cols-6 divide-x divide-border-default rounded-lg border border-border-default bg-bg-primary shadow-sm">
      {kpis.map((item) => (
        <div key={item.label} className="px-4 py-2.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-text-placeholder">
            {item.label}
          </p>
          <p
            className={cn(
              "mt-0.5 text-sm font-semibold text-text-primary",
              item.valueClass,
            )}
          >
            {item.value}
          </p>
          {item.sub && (
            <p className="mt-0.5 truncate text-[11px] text-text-muted">{item.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
