"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import { BuilderShell } from "@/features/cohort-builder/components/builder-shell";

export default function CohortBuilderPage() {
  const params = useParams();
  const id = params.id as string;
  const { loadProgram, reset } = useCohortBuilderStore();

  useEffect(() => {
    loadProgram(id);
    return () => reset();
  }, [id, loadProgram, reset]);

  return <BuilderShell />;
}
