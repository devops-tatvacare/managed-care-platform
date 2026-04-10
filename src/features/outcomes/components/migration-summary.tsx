"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight } from "lucide-react";
import type { MigrationHistoryItem, MigrationSummaryResponse } from "@/services/types/outcomes";

interface MigrationSummaryProps {
  summary: MigrationSummaryResponse | null;
  history: MigrationHistoryItem[];
  loading: boolean;
}

export function MigrationSummary({ summary, history, loading }: MigrationSummaryProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Migration Flows</CardTitle>
        </CardHeader>
        <CardContent>
          {!summary || summary.total_migrations === 0 ? (
            <p className="py-4 text-center text-xs text-text-muted leading-relaxed">
              No cohort migrations recorded yet. Migrations appear when the scoring engine re-evaluates patients and their risk tier changes based on updated clinical data.
            </p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {summary.flows.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{f.from_cohort_name}</Badge>
                    <ArrowRight className="h-3 w-3 text-text-muted" />
                    <Badge variant="outline">{f.to_cohort_name}</Badge>
                    <span className="ml-auto font-semibold">{f.count}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Migrations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-4 text-center text-xs text-text-muted">
                      No recent migrations. When patients are re-scored and move between cohort tiers, their transitions will appear here.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.slice(0, 10).map((item) => (
                    <TableRow key={item.assignment_id}>
                      <TableCell className="text-sm">{item.patient_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{ borderColor: item.from_cohort_color }}
                          className="text-xs"
                        >
                          {item.from_cohort_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{ borderColor: item.to_cohort_color }}
                          className="text-xs"
                        >
                          {item.to_cohort_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {item.score_before ?? "—"} → {item.score_after ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
