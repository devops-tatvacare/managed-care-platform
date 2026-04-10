"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/config/icons";
import { scoreColor } from "@/config/status";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import { SendCommsDialog } from "./send-comms-dialog";

const ALL_VALUE = "__all__";

function reviewUrgency(dateStr: string | null): { className: string; label: string } {
  if (!dateStr) return { className: "text-text-placeholder", label: "--" };
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0) return { className: "text-red-600 dark:text-red-400 font-semibold", label: `${Math.abs(days)}d overdue` };
  if (days <= 3) return { className: "text-red-600 dark:text-red-400", label: `${days}d` };
  if (days <= 7) return { className: "text-amber-600 dark:text-amber-400", label: `${days}d` };
  return { className: "text-text-muted", label: formatDate(dateStr) };
}

function pdcColor(pdc: number | null): string {
  if (pdc == null) return "text-text-muted";
  if (pdc < 60) return "text-red-600 dark:text-red-400";
  if (pdc < 80) return "text-amber-600 dark:text-amber-400";
  return "text-green-700 dark:text-green-400";
}

function topFactors(
  breakdown: Record<string, { raw: number; weighted: number }> | null,
): { key: string; weighted: number }[] {
  if (!breakdown) return [];
  return Object.entries(breakdown)
    .map(([key, val]) => ({ key, weighted: val.weighted }))
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 3);
}

export function RiskWorklist() {
  const {
    assignments,
    programs,
    assignmentsPage,
    assignmentsPages,
    assignmentsTotal,
    assignmentsLoading,
    loadAssignments,
    recalculate,
    recalculating,
  } = useCohortisationStore();

  const [programFilter, setProgramFilter] = useState<string>(ALL_VALUE);
  const [cohortFilter, setCohortFilter] = useState<string>(ALL_VALUE);
  const [minScore, setMinScore] = useState<number>(50);
  const [scoreInput, setScoreInput] = useState<string>("50");
  const [commsPatient, setCommsPatient] = useState<{ id: string; name: string } | null>(null);

  const buildParams = useCallback(
    (overrides?: { program?: string; cohort?: string; score?: number; page?: number }) => {
      const pId = overrides?.program ?? programFilter;
      const cId = overrides?.cohort ?? cohortFilter;
      const score = overrides?.score ?? minScore;
      return {
        page: overrides?.page ?? 1,
        ...(pId !== ALL_VALUE && { program_id: pId }),
        ...(cId !== ALL_VALUE && { cohort_id: cId }),
        min_score: score,
      };
    },
    [programFilter, cohortFilter, minScore],
  );

  const applyFilters = useCallback(
    (overrides?: { program?: string; cohort?: string; score?: number }) => {
      loadAssignments(buildParams({ ...overrides, page: 1 }));
    },
    [buildParams, loadAssignments],
  );

  const handleProgramChange = (value: string) => {
    setProgramFilter(value);
    setCohortFilter(ALL_VALUE);
    applyFilters({ program: value, cohort: ALL_VALUE });
  };

  const handleCohortChange = (value: string) => {
    setCohortFilter(value);
    applyFilters({ cohort: value });
  };

  const commitScore = () => {
    const parsed = Number(scoreInput);
    if (Number.isNaN(parsed) || parsed < 0) return;
    setMinScore(parsed);
    applyFilters({ score: parsed });
  };

  const handlePage = (page: number) => {
    loadAssignments(buildParams({ page }));
  };

  const handleRescore = async (patientId: string, patientName: string) => {
    const result = await recalculate([patientId]);
    if (result) {
      toast.success(`Re-scored ${patientName}`);
      applyFilters();
    } else {
      toast.error("Re-score failed");
    }
  };

  const uniqueCohorts = Array.from(
    new Map(
      assignments.map((a) => [a.cohort_id, { id: a.cohort_id, name: a.cohort_name }]),
    ).values(),
  );

  const filterTriggerClass =
    "h-8 w-fit gap-1 rounded-lg border-[color:var(--color-surface-border)] bg-bg-primary px-2.5 text-xs shadow-none";

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select value={programFilter} onValueChange={handleProgramChange}>
          <SelectTrigger className={filterTriggerClass}>
            <SelectValue placeholder="All Programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Programs</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={cohortFilter} onValueChange={handleCohortChange}>
          <SelectTrigger className={filterTriggerClass}>
            <SelectValue placeholder="All Cohorts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Cohorts</SelectItem>
            {uniqueCohorts.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted whitespace-nowrap">Score &ge;</span>
          <Input
            type="number"
            className="h-8 w-16 rounded-lg border-[color:var(--color-surface-border)] bg-bg-primary px-2 text-xs shadow-none"
            value={scoreInput}
            onChange={(e) => setScoreInput(e.target.value)}
            onBlur={commitScore}
            onKeyDown={(e) => { if (e.key === "Enter") commitScore(); }}
          />
        </div>

        <span className="ml-auto text-xs tabular-nums text-text-muted">
          {assignmentsTotal} patient{assignmentsTotal !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Top Factors</TableHead>
              <TableHead className="text-right">PDC</TableHead>
              <TableHead>Review Due</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignmentsLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <Icons.spinner className="mx-auto h-5 w-5 animate-spin text-text-muted" />
                </TableCell>
              </TableRow>
            ) : assignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-text-muted text-sm">
                  No at-risk patients found
                </TableCell>
              </TableRow>
            ) : (
              assignments.map((a) => {
                const review = reviewUrgency(a.review_due_at);
                const factors = topFactors(a.score_breakdown);
                const pdcVal = a.pdc_worst != null ? Math.round(a.pdc_worst * 100) : null;

                return (
                  <TableRow key={a.id}>
                    {/* Patient */}
                    <TableCell className="font-medium text-text-primary">
                      <Link
                        href={`/dashboard/patients/${a.patient_id}`}
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        <Icons.user className="h-3 w-3 shrink-0 text-text-placeholder" />
                        {a.patient_name}
                      </Link>
                    </TableCell>

                    {/* Cohort */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-transparent text-white text-[10px]"
                        style={{ backgroundColor: a.cohort_color }}
                      >
                        {a.cohort_name}
                      </Badge>
                    </TableCell>

                    {/* Score */}
                    <TableCell className="text-right">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn("tabular-nums text-sm font-medium cursor-help", scoreColor(a.score))}>
                              {a.score != null ? a.score : "--"}
                            </span>
                          </TooltipTrigger>
                          {a.narrative && (
                            <TooltipContent side="left" className="max-w-xs text-xs leading-relaxed">
                              {a.narrative}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* Top Factors */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {factors.length > 0 ? (
                          factors.map((f) => (
                            <span
                              key={f.key}
                              className="inline-block rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-text-secondary"
                            >
                              {f.key}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-text-placeholder">--</span>
                        )}
                      </div>
                    </TableCell>

                    {/* PDC */}
                    <TableCell className="text-right">
                      <span className={cn("tabular-nums text-sm", pdcColor(pdcVal))}>
                        {pdcVal != null ? `${pdcVal}%` : "--"}
                      </span>
                    </TableCell>

                    {/* Review Due */}
                    <TableCell>
                      <span className={cn("text-sm tabular-nums", review.className)}>
                        {review.label}
                      </span>
                    </TableCell>

                    {/* Trend */}
                    <TableCell>
                      {a.previous_cohort_id ? (
                        <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                          <Icons.referral className="h-3 w-3" />
                          {a.previous_cohort_name}
                        </span>
                      ) : (
                        <Icons.idle className="h-3 w-3 text-text-placeholder" />
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Icons.more className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setCommsPatient({ id: a.patient_id, name: a.patient_name })}
                          >
                            <Icons.send className="mr-2 h-3.5 w-3.5" />
                            Send Communication
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/patients/${a.patient_id}`}>
                              <Icons.pathwayBuilder className="mr-2 h-3.5 w-3.5" />
                              View Pathway
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={recalculating}
                            onClick={() => handleRescore(a.patient_id, a.patient_name)}
                          >
                            <Icons.recurring className="mr-2 h-3.5 w-3.5" />
                            Re-score
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {assignmentsPages > 1 && (
        <div className="flex items-center justify-between pb-1">
          <p className="text-sm text-text-muted">
            Page {assignmentsPage} of {assignmentsPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={assignmentsPage <= 1}
              onClick={() => handlePage(assignmentsPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={assignmentsPage >= assignmentsPages}
              onClick={() => handlePage(assignmentsPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Send Communication Dialog */}
      <SendCommsDialog patient={commsPatient} onClose={() => setCommsPatient(null)} />
    </div>
  );
}
