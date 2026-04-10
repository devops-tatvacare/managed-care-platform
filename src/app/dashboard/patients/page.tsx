"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSheet, type FilterField } from "@/components/shared/filter-sheet";
import { Icons } from "@/config/icons";
import { buildPath } from "@/config/routes";
import { PATIENT_PATHWAY_STATUS, careGapSeverity, scoreColor } from "@/config/status";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { usePatientsStore } from "@/stores/patients-store";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function PatientsPage() {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const {
    patients,
    total,
    page,
    pages,
    filters,
    filterOptions,
    loading,
    error,
    loadPatients,
    loadFilterOptions,
    setPage,
    setFilters,
    resetFilters,
  } = usePatientsStore();

  useEffect(() => {
    loadPatients();
    loadFilterOptions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Search handlers ---- */
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setFilters({ search: searchRef.current?.value ?? "" });
      }
    },
    [setFilters],
  );

  const handleSearchChange = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters({ search: searchRef.current?.value ?? "" });
    }, 300);
  }, [setFilters]);

  /* ---- Navigation ---- */
  const handleRowClick = useCallback(
    (id: string) => {
      router.push(buildPath("patientDetail", { id }));
    },
    [router],
  );

  const navigateToTab = useCallback(
    (e: React.MouseEvent, id: string, tab: string) => {
      e.stopPropagation();
      router.push(`${buildPath("patientDetail", { id })}?tab=${tab}`);
    },
    [router],
  );

  /* ---- Filter fields (dynamic from backend) ---- */
  const filterFields: FilterField[] = useMemo(() => {
    const fields: FilterField[] = [];

    const statuses = filterOptions?.pathway_statuses ?? [];
    if (statuses.length > 0) {
      fields.push({
        key: "pathwayStatus",
        label: "Pathway Status",
        type: "select",
        options: statuses.map((s) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s })),
        placeholder: "All statuses",
      });
    }

    const names = filterOptions?.pathway_names ?? [];
    if (names.length > 0) {
      fields.push({
        key: "pathwayName",
        label: "Pathway Name",
        type: "select",
        options: names.map((n) => ({ label: n, value: n })),
        placeholder: "All pathways",
      });
    }

    const assignees = filterOptions?.assigned_tos ?? [];
    if (assignees.length > 0) {
      fields.push({
        key: "assignedTo",
        label: "Assigned To",
        type: "select",
        options: assignees.map((a) => ({ label: a, value: a })),
        placeholder: "All assignees",
      });
    }

    const programs = filterOptions?.programs ?? [];
    if (programs.length > 0) {
      fields.push({
        key: "programId",
        label: "Program",
        type: "select",
        options: programs.map((p) => ({ label: p.name, value: p.id })),
        placeholder: "All programs",
      });
    }

    const cohorts = filterOptions?.cohorts ?? [];
    const filteredCohorts = filters.programId
      ? cohorts.filter((c) => c.program_id === filters.programId)
      : cohorts;
    if (filteredCohorts.length > 0) {
      fields.push({
        key: "cohortId",
        label: "Cohort",
        type: "select",
        options: filteredCohorts.map((c) => ({ label: c.name, value: c.id })),
        placeholder: "All cohorts",
      });
    }

    return fields;
  }, [filterOptions, filters.programId]);

  const handleApplyFilters = useCallback(
    (values: Record<string, string | undefined>) => {
      setFilters({
        pathwayStatus: values.pathwayStatus,
        pathwayName: values.pathwayName,
        assignedTo: values.assignedTo,
        programId: values.programId,
        cohortId: values.cohortId,
      });
    },
    [setFilters],
  );

  const activeFilterCount = [filters.pathwayStatus, filters.pathwayName, filters.assignedTo, filters.programId, filters.cohortId].filter(Boolean).length;

  const Spinner = Icons.spinner;

  return (
    <div className="flex h-full flex-col">
      {/* Fixed top: header + search/filter bar */}
      <div className="shrink-0">
        <PageHeader
          title="Patients"
          description={loading ? "Loading..." : `${formatNumber(total)} patients`}
        />

        {/* Search + Filter button */}
        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Icons.search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-placeholder" />
            <Input
              ref={searchRef}
              placeholder="Search by name, EMPI, or phone..."
              defaultValue={filters.search}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterOpen(true)}
            className="gap-1.5"
          >
            <Icons.filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="default" className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-[10px]">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 shrink-0 rounded-md border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-12 flex flex-1 items-center justify-center">
          <Spinner className="h-6 w-6 animate-spin text-text-muted" />
        </div>
      )}

      {/* Empty */}
      {!loading && !error && patients.length === 0 && (
        <EmptyState
          icon={Icons.patients}
          title="No patients found"
          description="Try adjusting your search or filters."
          className="mt-8"
        />
      )}

      {/* Table */}
      {!loading && patients.length > 0 && (
        <>
          <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-default shadow-sm">
            <div className="flex-1 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>EMPI</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pathway</TableHead>
                    <TableHead className="text-right">Care Gaps</TableHead>
                    <TableHead className="text-right">Risk Score</TableHead>
                    <TableHead>Last Contact</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((p) => {
                    const gapCount = p.care_gaps?.length ?? 0;
                    const gap = careGapSeverity(gapCount);
                    const statusConfig = p.pathway_status
                      ? PATIENT_PATHWAY_STATUS[p.pathway_status]
                      : undefined;

                    return (
                      <TableRow
                        key={p.id}
                        onClick={() => handleRowClick(p.id)}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-medium text-text-primary">
                          {p.first_name} {p.last_name}
                        </TableCell>
                        <TableCell className="text-text-muted font-mono text-xs">
                          {p.empi_id}
                        </TableCell>
                        <TableCell>
                          {statusConfig ? (
                            <StatusBadge config={statusConfig} />
                          ) : (
                            <span className="text-sm text-text-placeholder">--</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          {p.pathway_name ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                              <Icons.pathwayBuilder className="h-3 w-3 shrink-0 text-text-placeholder" />
                              <span className="truncate">{p.pathway_name}</span>
                            </span>
                          ) : (
                            <span className="text-sm text-text-placeholder">--</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("tabular-nums text-sm", gap.className)}>
                            {gap.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {p.risk_score != null ? (
                            <span className={cn("tabular-nums text-sm font-medium", scoreColor(p.risk_score))}>
                              {Math.round(p.risk_score)}
                            </span>
                          ) : (
                            <span className="text-sm text-text-placeholder">--</span>
                          )}
                        </TableCell>
                        <TableCell className="text-text-muted text-sm">
                          {p.last_contact_date
                            ? formatDate(p.last_contact_date)
                            : <span className="text-text-placeholder">--</span>}
                        </TableCell>
                        <TableCell>
                          {p.assigned_to ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
                              <Icons.user className="h-3 w-3 shrink-0 text-text-placeholder" />
                              <span className="truncate max-w-[140px]">{p.assigned_to}</span>
                            </span>
                          ) : (
                            <span className="text-sm text-text-placeholder">--</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="xs"
                              className="gap-1 text-text-secondary hover:text-brand-primary hover:border-brand-primary"
                              onClick={(e) => navigateToTab(e, p.id, "care-protocols")}
                              title="View Care Plan"
                            >
                              <Icons.pathwayBuilder className="h-3.5 w-3.5" />
                              <span className="text-[11px]">Plan</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="xs"
                              className="gap-1 text-text-secondary hover:text-brand-primary hover:border-brand-primary"
                              onClick={(e) => navigateToTab(e, p.id, "communications")}
                              title="Send Outreach"
                            >
                              <Icons.send className="h-3.5 w-3.5" />
                              <span className="text-[11px]">Outreach</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-3 flex shrink-0 items-center justify-between pb-1">
            <p className="text-sm text-text-muted">
              Page {page} of {pages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Filter Sheet */}
      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title="Filter Patients"
        description="Narrow down the patient list"
        fields={filterFields}
        values={{
          pathwayStatus: filters.pathwayStatus,
          pathwayName: filters.pathwayName,
          assignedTo: filters.assignedTo,
          programId: filters.programId,
          cohortId: filters.cohortId,
        }}
        onApply={handleApplyFilters}
        onReset={resetFilters}
      />
    </div>
  );
}
