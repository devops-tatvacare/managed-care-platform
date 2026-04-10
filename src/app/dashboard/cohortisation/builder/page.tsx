"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Icons } from "@/config/icons";
import { PATHWAY_STATUS } from "@/config/status";
import { buildPath } from "@/config/routes";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { createProgram } from "@/services/api/programs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CohortBuilderListPage() {
  const router = useRouter();
  const { programs, programsLoading, programsError, loadPrograms } =
    useCohortisationStore();
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    loadPrograms();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = useCallback(async () => {
    try {
      setCreateError(null);
      const program = await createProgram({ name: "Untitled Program" });
      router.push(buildPath("cohortBuilderEditor", { id: program.id }));
    } catch {
      setCreateError("Failed to create program");
    }
  }, [router]);

  const Spinner = Icons.spinner;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0">
        <PageHeader
          title="Cohort Builder"
          description={programsLoading ? "Loading..." : `${programs.length} programs`}
          actions={
            <Button onClick={handleCreate}>
              <Icons.plus className="mr-1.5 h-4 w-4" />
              Create Program
            </Button>
          }
        />
      </div>

      {(programsError || createError) && (
        <div className="mt-4 shrink-0 rounded-md border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error">
          {createError ?? programsError}
        </div>
      )}

      {programsLoading && (
        <div className="mt-12 flex flex-1 items-center justify-center">
          <Spinner className="h-6 w-6 animate-spin text-text-muted" />
        </div>
      )}

      {!programsLoading && !programsError && programs.length === 0 && (
        <EmptyState
          icon={Icons.cohortisation}
          title="No programs yet"
          description="Create your first cohort program to get started."
          className="mt-8"
        />
      )}

      {!programsLoading && !programsError && programs.length > 0 && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-default shadow-sm">
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead className="text-right">Cohorts</TableHead>
                  <TableHead>Scoring</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Version</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((p) => {
                  const statusConfig = PATHWAY_STATUS[p.status] ?? PATHWAY_STATUS.draft;
                  return (
                    <TableRow
                      key={p.id}
                      onClick={() =>
                        router.push(buildPath("cohortBuilderEditor", { id: p.id }))
                      }
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium text-text-primary">
                        {p.name}
                      </TableCell>
                      <TableCell className="text-sm text-text-secondary">
                        {p.condition ?? "--"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.cohort_count}
                      </TableCell>
                      <TableCell
                        className={
                          p.has_scoring_engine
                            ? "text-sm text-text-primary"
                            : "text-sm text-text-muted"
                        }
                      >
                        {p.has_scoring_engine ? "Configured" : "Not configured"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge config={statusConfig} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        v{p.version}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
