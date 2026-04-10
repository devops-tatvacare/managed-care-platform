"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { UnsavedChangesGuard } from "@/components/shared/unsaved-changes-guard";
import { Icons } from "@/config/icons";
import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import { BuilderShell } from "@/features/cohort-builder/components/builder-shell";

export default function CohortBuilderPage() {
  const params = useParams();
  const id = params.id as string;
  const { program, programLoading, error, isDirty, loadProgram, reset } =
    useCohortBuilderStore();

  useEffect(() => {
    loadProgram(id);
    return () => reset();
  }, [id, loadProgram, reset]);

  const Spinner = Icons.spinner;

  if (programLoading && !program) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Icons.cohortisation className="h-10 w-10 text-text-placeholder" />
        <h3 className="mt-3 text-sm font-semibold text-text-primary">
          {error ? "Error loading program" : "Program not found"}
        </h3>
        {error && <p className="mt-1 text-xs text-status-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <UnsavedChangesGuard isDirty={isDirty} />
      <BuilderShell />
    </div>
  );
}
