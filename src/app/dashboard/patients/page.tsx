"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TierBadge } from "@/components/shared/tier-badge";
import { Icons } from "@/config/icons";
import { buildPath } from "@/config/routes";
import { formatDate, formatNumber } from "@/lib/format";
import { usePatientsStore } from "@/stores/patients-store";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  const {
    patients,
    total,
    page,
    pages,
    filters,
    loading,
    error,
    loadPatients,
    setPage,
    setFilters,
  } = usePatientsStore();

  useEffect(() => {
    loadPatients();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleTierChange = useCallback(
    (value: string) => {
      setFilters({ tier: value === "all" ? undefined : Number(value) });
    },
    [setFilters],
  );

  const handleRowClick = useCallback(
    (id: string) => {
      router.push(buildPath("patientDetail", { id }));
    },
    [router],
  );

  const Spinner = Icons.spinner;

  return (
    <div>
      <PageHeader
        title="Patients"
        description={loading ? "Loading..." : `${formatNumber(total)} patients`}
      />

      {/* Filters */}
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
        <Select
          value={filters.tier !== undefined ? String(filters.tier) : "all"}
          onValueChange={handleTierChange}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="0">Tier 0</SelectItem>
            <SelectItem value="1">Tier 1</SelectItem>
            <SelectItem value="2">Tier 2</SelectItem>
            <SelectItem value="3">Tier 3</SelectItem>
            <SelectItem value="4">Tier 4</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-md border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-12 flex items-center justify-center">
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
          <div className="mt-4 rounded-md border border-border-default">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>EMPI</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">CRS</TableHead>
                  <TableHead>Pathway</TableHead>
                  <TableHead className="text-right">Care Gaps</TableHead>
                  <TableHead>Last Contact</TableHead>
                  <TableHead>Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p) => (
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
                      <TierBadge tier={p.tier} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.crs_score}
                    </TableCell>
                    <TableCell className="text-text-secondary text-sm">
                      {p.pathway_status ?? "--"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.care_gaps?.length ?? 0}
                    </TableCell>
                    <TableCell className="text-text-muted text-sm">
                      {p.last_contact_date
                        ? formatDate(p.last_contact_date)
                        : "--"}
                    </TableCell>
                    <TableCell className="text-text-secondary text-sm">
                      {p.assigned_to ?? "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
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
    </div>
  );
}
