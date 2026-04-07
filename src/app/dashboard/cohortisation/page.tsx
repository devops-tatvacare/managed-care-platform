"use client";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";

export default function CohortisationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cohortisation"
        description="Program-based cohort management and scoring"
      />
      <EmptyState
        icon={Icons.cohortisation}
        title="Cohort System Redesigned"
        description="The new program-based cohort UI is coming in Phase 4B. Use the API endpoints to manage programs and cohorts."
      />
    </div>
  );
}
