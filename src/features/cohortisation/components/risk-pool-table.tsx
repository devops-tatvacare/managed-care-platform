"use client";

import { useState, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icons } from "@/config/icons";
import { scoreColor, ASSIGNMENT_TYPE } from "@/config/status";
import { StatusBadge } from "@/components/shared/status-badge";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const ALL_VALUE = "__all__";

function reviewUrgency(dateStr: string | null): { className: string; label: string } {
  if (!dateStr) return { className: "text-text-placeholder", label: "--" };
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days < 0) return { className: "text-red-600 dark:text-red-400 font-semibold", label: `${Math.abs(days)}d overdue` };
  if (days <= 3) return { className: "text-red-600 dark:text-red-400", label: `${days}d` };
  if (days <= 7) return { className: "text-amber-600 dark:text-amber-400", label: `${days}d` };
  return { className: "text-text-muted", label: formatDate(dateStr) };
}

export function RiskPoolTable() {
  const {
    assignments,
    programs,
    assignmentsPage,
    assignmentsPages,
    assignmentsLoading,
    loadAssignments,
  } = useCohortisationStore();

  const [programFilter, setProgramFilter] = useState<string>(ALL_VALUE);
  const [cohortFilter, setCohortFilter] = useState<string>(ALL_VALUE);

  const applyFilters = useCallback(
    (nextProgram?: string, nextCohort?: string) => {
      const pId = nextProgram ?? programFilter;
      const cId = nextCohort ?? cohortFilter;
      loadAssignments({
        page: 1,
        ...(pId !== ALL_VALUE && { program_id: pId }),
        ...(cId !== ALL_VALUE && { cohort_id: cId }),
      });
    },
    [programFilter, cohortFilter, loadAssignments],
  );

  const handleProgramChange = (value: string) => {
    setProgramFilter(value);
    setCohortFilter(ALL_VALUE);
    applyFilters(value, ALL_VALUE);
  };

  const handleCohortChange = (value: string) => {
    setCohortFilter(value);
    applyFilters(undefined, value);
  };

  const handlePage = (page: number) => {
    loadAssignments({
      page,
      ...(programFilter !== ALL_VALUE && { program_id: programFilter }),
      ...(cohortFilter !== ALL_VALUE && { cohort_id: cohortFilter }),
    });
  };

  const uniqueCohorts = Array.from(
    new Map(
      assignments.map((a) => [a.cohort_id, { id: a.cohort_id, name: a.cohort_name }]),
    ).values(),
  );

  const programLookup = new Map(programs.map((p) => [p.id, p.name]));

  const filterTriggerClass = "h-8 w-fit gap-1 rounded-lg border-[color:var(--color-surface-border)] bg-bg-primary px-2.5 text-xs shadow-none";

  return (
    <div className="space-y-3">
      {/* Filters — compact inline */}
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
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Review Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignmentsLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Icons.spinner className="mx-auto h-5 w-5 animate-spin text-text-muted" />
                </TableCell>
              </TableRow>
            ) : assignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-text-muted text-sm">
                  No assignments found
                </TableCell>
              </TableRow>
            ) : (
              assignments.map((a) => {
                const review = reviewUrgency(a.review_due_at);
                const typeConfig = ASSIGNMENT_TYPE[a.assignment_type];
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium text-text-primary">
                      <span className="inline-flex items-center gap-1.5">
                        <Icons.user className="h-3 w-3 shrink-0 text-text-placeholder" />
                        {a.patient_name}
                      </span>
                    </TableCell>
                    <TableCell className="text-text-secondary text-sm">
                      {programLookup.get(a.program_id) ?? a.program_id}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-transparent text-white text-[10px]"
                        style={{ backgroundColor: a.cohort_color }}
                      >
                        {a.cohort_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn("tabular-nums text-sm font-medium", scoreColor(a.score))}>
                        {a.score != null ? a.score : "--"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {typeConfig ? (
                        <StatusBadge config={typeConfig} />
                      ) : (
                        <span className="text-xs text-text-muted capitalize">{a.assignment_type ?? "--"}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-text-muted text-sm">
                      {formatDate(a.assigned_at)}
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-sm tabular-nums", review.className)}>
                        {review.label}
                      </span>
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
    </div>
  );
}
