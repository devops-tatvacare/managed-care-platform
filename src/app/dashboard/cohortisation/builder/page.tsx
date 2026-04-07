"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Icons } from "@/config/icons";
import { PATHWAY_STATUS } from "@/config/status";
import { buildPath } from "@/config/routes";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { createProgram } from "@/services/api/programs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CohortBuilderListPage() {
  const router = useRouter();
  const { programs, programsLoading, loadPrograms } = useCohortisationStore();

  useEffect(() => {
    loadPrograms();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = useCallback(async () => {
    try {
      const program = await createProgram({ name: "Untitled Program" });
      router.push(buildPath("cohortBuilderEditor", { id: program.id }));
    } catch {
      // error handled silently
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

      {programsLoading && (
        <div className="mt-12 flex flex-1 items-center justify-center">
          <Spinner className="h-6 w-6 animate-spin text-text-muted" />
        </div>
      )}

      {!programsLoading && programs.length === 0 && (
        <EmptyState
          icon={Icons.cohortisation}
          title="No programs yet"
          description="Create your first cohort program to get started."
          className="mt-8"
        />
      )}

      {!programsLoading && programs.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => {
            const statusConfig = PATHWAY_STATUS[p.status] ?? PATHWAY_STATUS.draft;
            return (
              <Card
                key={p.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(buildPath("cohortBuilderEditor", { id: p.id }))}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">{p.name}</span>
                    <StatusBadge config={statusConfig} />
                  </div>
                  {p.condition && (
                    <p className="mt-1 text-xs text-text-muted">{p.condition}</p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs text-text-muted">
                    <span>{p.cohort_count} cohorts</span>
                    <span>v{p.version}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
