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
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const ALL_VALUE = "__all__";

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

  // Derive unique cohorts from current assignments for the cohort filter
  const uniqueCohorts = Array.from(
    new Map(
      assignments.map((a) => [a.cohort_id, { id: a.cohort_id, name: a.cohort_name }]),
    ).values(),
  );

  const programLookup = new Map(programs.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={programFilter} onValueChange={handleProgramChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Programs</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={cohortFilter} onValueChange={handleCohortChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Cohorts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Cohorts</SelectItem>
            {uniqueCohorts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Review Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignmentsLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Icons.spinner className={cn("mx-auto h-5 w-5 animate-spin text-text-muted")} />
                </TableCell>
              </TableRow>
            ) : assignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-text-muted">
                  No assignments found
                </TableCell>
              </TableRow>
            ) : (
              assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.patient_name}</TableCell>
                  <TableCell>{programLookup.get(a.program_id) ?? a.program_id}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-white border-transparent"
                      style={{ backgroundColor: a.cohort_color }}
                    >
                      {a.cohort_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {a.score != null ? a.score : "--"}
                  </TableCell>
                  <TableCell>{formatDate(a.assigned_at)}</TableCell>
                  <TableCell>{a.review_due_at ? formatDate(a.review_due_at) : "--"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {assignmentsPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={assignmentsPage <= 1}
            onClick={() => handlePage(assignmentsPage - 1)}
          >
            <Icons.chevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <span className="text-text-muted">
            Page {assignmentsPage} of {assignmentsPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={assignmentsPage >= assignmentsPages}
            onClick={() => handlePage(assignmentsPage + 1)}
          >
            Next
            <Icons.chevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
