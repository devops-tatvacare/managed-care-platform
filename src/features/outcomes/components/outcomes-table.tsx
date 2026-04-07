"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import type { MetricValue } from "@/services/types/outcomes";

interface OutcomesTableProps {
  metrics: MetricValue[];
  loading: boolean;
}

function fmtVal(value: number | null, unit: string): string {
  if (value === null) return "—";
  if (unit === "percent") return `${value}%`;
  if (unit === "currency") return `$${value.toLocaleString()}`;
  if (unit === "ratio") return `${value}x`;
  if (unit === "per_1k_mm") return `${value} /1k MM`;
  if (unit === "hours") return `${value}h`;
  return String(value);
}

function statusBadge(m: MetricValue): React.ReactNode {
  if (!m.data_available) {
    return <Badge variant="secondary">No Data</Badge>;
  }
  if (m.value === null || m.target_value === null) {
    return <Badge variant="outline">N/A</Badge>;
  }
  const lowerIsBetter = m.metric_key === "hospitalisation_rate" || m.metric_key === "avg_response_time";
  const atTarget = lowerIsBetter ? m.value <= m.target_value : m.value >= m.target_value;
  const nearTarget = lowerIsBetter
    ? m.value <= m.target_value * 1.2
    : m.value >= m.target_value * 0.8;

  if (atTarget) return <Badge className="bg-status-success-bg text-status-success">On Track</Badge>;
  if (nearTarget) return <Badge className="bg-status-warning-bg text-status-warning">Near Target</Badge>;
  return <Badge className="bg-status-error-bg text-status-error">Below Target</Badge>;
}

export function OutcomesTable({ metrics, loading }: OutcomesTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">Metric</TableHead>
          <TableHead className="text-right">Baseline</TableHead>
          <TableHead className="text-right">Current</TableHead>
          <TableHead className="text-right">Target</TableHead>
          <TableHead className="text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {metrics.map((m) => (
          <TableRow key={m.metric_key}>
            <TableCell className="font-medium">{m.label}</TableCell>
            <TableCell className="text-right text-text-muted">
              {fmtVal(m.baseline_value, m.unit)}
            </TableCell>
            <TableCell className={cn("text-right font-semibold")}>
              {fmtVal(m.value, m.unit)}
            </TableCell>
            <TableCell className="text-right text-text-muted">
              {fmtVal(m.target_value, m.unit)}
            </TableCell>
            <TableCell className="text-center">{statusBadge(m)}</TableCell>
          </TableRow>
        ))}
        {metrics.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="py-8 text-center text-text-muted">
              No metrics available for this category
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
