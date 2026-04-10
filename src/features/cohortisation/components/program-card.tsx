"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { PATHWAY_STATUS } from "@/config/status";
import { buildPath } from "@/config/routes";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import type { ProgramListItem } from "@/services/types/program";
import type { CohortDistribution } from "@/services/types/cohort";

interface ProgramCardProps {
  program: ProgramListItem;
  distribution?: CohortDistribution[];
}

export function ProgramCard({ program, distribution }: ProgramCardProps) {
  const router = useRouter();
  const loadDistribution = useCohortisationStore((s) => s.loadDistribution);

  useEffect(() => {
    loadDistribution(program.id);
  }, [program.id, loadDistribution]);

  const totalMembers = distribution?.reduce((sum, d) => sum + d.count, 0) ?? 0;
  const statusConfig = PATHWAY_STATUS[program.status];

  return (
    <Card
      className={cn("cursor-pointer transition-shadow hover:shadow-md")}
      onClick={() => router.push(buildPath("cohortBuilderEditor", { id: program.id }))}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-text-primary">{program.name}</p>
          {statusConfig && <StatusBadge config={statusConfig} />}
        </div>

        {program.condition && (
          <p className="text-xs text-text-muted">{program.condition}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{program.cohort_count} cohorts</span>
          <span>{formatNumber(totalMembers)} members</span>
        </div>

        {distribution && distribution.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex h-1.5 w-full overflow-hidden rounded-full">
              {distribution.map((d) => (
                <div
                  key={d.cohort_id}
                  style={{ flex: d.count, backgroundColor: d.cohort_color }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {distribution.map((d) => (
                <span key={d.cohort_id} className="inline-flex items-center gap-1 text-[10px] text-text-muted">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: d.cohort_color }}
                  />
                  {d.cohort_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
