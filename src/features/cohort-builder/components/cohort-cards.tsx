"use client";

import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import { Icons } from "@/config/icons";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CohortDetailDrawer } from "./cohort-detail-drawer";

export function CohortCards() {
  const { program, selectCohort, createCohort } = useCohortBuilderStore();

  if (!program) return null;

  const handleAddCohort = async () => {
    const cohort = await createCohort({ name: "New Cohort" });
    if (cohort) selectCohort(cohort.id);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {program.cohorts.map((cohort) => (
          <Card key={cohort.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cohort.color }}
                  />
                  <span className="text-sm font-medium text-text-primary">
                    {cohort.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => selectCohort(cohort.id)}
                  className="text-text-muted"
                >
                  Edit
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                <span>{cohort.member_count} members</span>
                {cohort.score_range_min != null && cohort.score_range_max != null && (
                  <span>Score {cohort.score_range_min}–{cohort.score_range_max}</span>
                )}
                <span>Review: {cohort.review_cadence_days}d</span>
                <span>Order: {cohort.sort_order}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add Cohort Card */}
        <Card
          className="cursor-pointer border-dashed transition-colors hover:border-brand-primary hover:bg-bg-hover"
          onClick={handleAddCohort}
        >
          <CardContent className="flex flex-col items-center justify-center p-4 py-8">
            <Icons.plus className="h-6 w-6 text-text-placeholder" />
            <span className="mt-2 text-sm text-text-muted">Add Cohort</span>
          </CardContent>
        </Card>
      </div>

      <CohortDetailDrawer />
    </>
  );
}
