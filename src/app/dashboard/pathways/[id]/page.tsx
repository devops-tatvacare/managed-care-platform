"use client";

import { useEffect, use } from "react";
import { usePathwayBuilderStore } from "@/stores/pathway-builder-store";
import { Icons } from "@/config/icons";
import { BuilderShell } from "@/features/pathway-builder/components/builder-shell";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PathwayEditorPage({ params }: PageProps) {
  const { id } = use(params);
  const { selectedPathway, builderLoading, error, loadPathway } =
    usePathwayBuilderStore();

  useEffect(() => {
    loadPathway(id);
  }, [id, loadPathway]);

  const Spinner = Icons.spinner;

  if (builderLoading && !selectedPathway) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!selectedPathway) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Icons.pathwayBuilder className="h-10 w-10 text-text-placeholder" />
        <h3 className="mt-3 text-sm font-semibold text-text-primary">
          {error ? "Error loading pathway" : "Pathway not found"}
        </h3>
        {error && <p className="mt-1 text-xs text-status-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <BuilderShell />
    </div>
  );
}
