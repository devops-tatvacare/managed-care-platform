"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { MigrationHistoryItem, MigrationSummaryResponse } from "@/services/types/outcomes";

interface MigrationSummaryProps {
  summary: MigrationSummaryResponse | null;
  history: MigrationHistoryItem[];
  loading: boolean;
}

function CohortDot({ color, name }: { color: string; name: string }) {
  // Extract short tier label: "Tier 4 — Comprehensive Support" → "Tier 4"
  const short = name.match(/^Tier \d/)?.[0] ?? name.split("—")[0]?.trim() ?? name;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {short}
    </span>
  );
}

export function MigrationSummary({ summary, history, loading }: MigrationSummaryProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const hasFlows = summary && summary.total_migrations > 0;
  const hasHistory = history.length > 0;

  if (!hasFlows && !hasHistory) {
    return (
      <div className="rounded-lg border border-border-default px-4 py-6 text-center">
        <p className="text-xs text-text-muted leading-relaxed">
          No cohort migrations recorded yet. Migrations appear when the scoring engine
          re-evaluates patients and their risk tier changes based on updated clinical data.
        </p>
      </div>
    );
  }

  // Build color map from history items (they have color fields)
  const colorMap: Record<string, string> = {};
  for (const h of history) {
    if (h.from_cohort_name && h.from_cohort_color) colorMap[h.from_cohort_name] = h.from_cohort_color;
    if (h.to_cohort_name && h.to_cohort_color) colorMap[h.to_cohort_name] = h.to_cohort_color;
  }

  return (
    <div className="space-y-4">
      {/* Migration Flows — compact inline rows */}
      {hasFlows && (
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-xs font-semibold text-text-primary">Migration Flows</h3>
            <span className="text-[10px] text-text-placeholder tabular-nums">
              {summary!.total_migrations} total
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-border-default">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">From</TableHead>
                  <TableHead className="w-8" />
                  <TableHead className="w-[35%]">To</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary!.flows.map((f, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <CohortDot color={colorMap[f.from_cohort_name] ?? "#94a3b8"} name={f.from_cohort_name} />
                    </TableCell>
                    <TableCell className="px-0 text-center">
                      <ArrowRight className="mx-auto h-3 w-3 text-text-placeholder" />
                    </TableCell>
                    <TableCell>
                      <CohortDot color={colorMap[f.to_cohort_name] ?? "#94a3b8"} name={f.to_cohort_name} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs font-semibold tabular-nums text-text-primary">{f.count}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Recent Migrations — patient-level */}
      {hasHistory && (
        <div>
          <h3 className="text-xs font-semibold text-text-primary mb-2">Recent Migrations</h3>
          <div className="overflow-hidden rounded-lg border border-border-default">
            <ScrollArea className="max-h-[280px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead />
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.slice(0, 20).map((item) => (
                    <TableRow key={item.assignment_id}>
                      <TableCell className="text-xs font-medium text-text-primary">
                        {item.patient_name}
                      </TableCell>
                      <TableCell>
                        <CohortDot color={item.from_cohort_color ?? "#94a3b8"} name={item.from_cohort_name} />
                      </TableCell>
                      <TableCell className="px-0 text-center">
                        <ArrowRight className="mx-auto h-3 w-3 text-text-placeholder" />
                      </TableCell>
                      <TableCell>
                        <CohortDot color={item.to_cohort_color ?? "#94a3b8"} name={item.to_cohort_name} />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "text-xs tabular-nums",
                          (item.score_after ?? 0) > (item.score_before ?? 0)
                            ? "text-status-error"
                            : "text-status-success"
                        )}>
                          {item.score_before ?? "—"} → {item.score_after ?? "—"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
