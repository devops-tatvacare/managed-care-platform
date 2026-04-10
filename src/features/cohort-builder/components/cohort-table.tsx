"use client";

import { toast } from "sonner";
import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import { Icons } from "@/config/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { CohortDetailDrawer } from "./cohort-detail-drawer";

const CADENCE_LABELS: Record<number, string> = {
  7: "Weekly",
  14: "Bi-weekly",
  30: "Monthly",
  90: "Quarterly",
  180: "6-month",
  365: "Annual",
};

function cadenceLabel(days: number): string {
  return CADENCE_LABELS[days] ?? `${days}d`;
}

export function CohortTable() {
  const { program, createCohort, selectCohort } = useCohortBuilderStore();

  if (!program) return null;

  const cohorts = [...program.cohorts].sort((a, b) => a.sort_order - b.sort_order);

  const handleAddCohort = async () => {
    const cohort = await createCohort({ name: "New Cohort" });
    if (cohort) {
      toast.success("Cohort created");
      selectCohort(cohort.id);
    } else {
      toast.error("Failed to create cohort");
    }
  };

  return (
    <>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Cohorts</h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            {cohorts.length === 0
              ? "Define the cohorts in this program, then edit their criteria and review cadence."
              : `${cohorts.length} cohort${cohorts.length === 1 ? "" : "s"} configured. Select a cohort to edit its criteria and thresholds.`}
          </p>
        </div>
        <Button size="sm" onClick={handleAddCohort}>
          <Icons.plus className="mr-1.5 h-3.5 w-3.5" />
          Add Cohort
        </Button>
      </div>

      {cohorts.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default py-16 text-center">
          <Icons.cohortisation className="mb-3 h-8 w-8 text-text-placeholder" />
          <p className="text-sm font-medium text-text-primary">No cohorts defined</p>
          <p className="mb-4 mt-1 text-xs text-text-secondary">
            Create the first cohort to start defining membership rules.
          </p>
          <Button variant="secondary" size="sm" onClick={handleAddCohort}>
            <Icons.plus className="mr-1.5 h-3.5 w-3.5" />
            Add your first cohort
          </Button>
        </div>
      ) : (
        /* Table */
        <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Score Range</TableHead>
                <TableHead>Review Cadence</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead>Linked Pathway</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohorts.map((cohort) => {
                const scoreRange =
                  cohort.score_range_min != null && cohort.score_range_max != null
                    ? `${cohort.score_range_min}–${cohort.score_range_max}`
                    : "--";

                return (
                  <TableRow key={cohort.id}>
                    {/* Name */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: cohort.color }}
                        />
                        <span className="text-sm font-medium text-text-primary">
                          {cohort.name}
                        </span>
                      </div>
                    </TableCell>

                    {/* Score Range */}
                    <TableCell>
                      <span className="tabular-nums text-sm text-text-secondary">
                        {scoreRange}
                      </span>
                    </TableCell>

                    {/* Review Cadence */}
                    <TableCell>
                      <span className="text-sm text-text-secondary">
                        {cadenceLabel(cohort.review_cadence_days)}
                      </span>
                    </TableCell>

                    {/* Members */}
                    <TableCell className="text-right">
                      <span className="tabular-nums text-sm text-text-secondary">
                        {cohort.member_count}
                      </span>
                    </TableCell>

                    {/* Linked Pathway */}
                    <TableCell>
                      {cohort.pathway_name ? (
                        <Badge variant="outline" className="gap-1">
                          <Icons.pathwayBuilder className="h-3 w-3" />
                          {cohort.pathway_name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-text-placeholder">Not linked</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => selectCohort(cohort.id)}
                        className="text-text-muted"
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CohortDetailDrawer />
    </>
  );
}
