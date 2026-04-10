"use client";

import { useEffect } from "react";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { PopulationDashboard } from "@/features/cohortisation/components/population-dashboard";

export default function CohortisationPage() {
  const { loadDashboard, loadPrograms, loadAssignments } = useCohortisationStore();

  useEffect(() => {
    loadDashboard();
    loadPrograms();
    loadAssignments({ min_score: 50 });
  }, [loadDashboard, loadPrograms, loadAssignments]);

  return <PopulationDashboard />;
}
