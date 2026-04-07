"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import { fetchPatientCohorts } from "@/services/api/patients";
import type { AssignmentRecord } from "@/services/types/cohort";

interface CohortMembershipTabProps {
  patientId: string;
}

export function CohortMembershipTab({ patientId }: CohortMembershipTabProps) {
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPatientCohorts(patientId)
      .then((data) => {
        if (!cancelled) setAssignments(data);
      })
      .catch(() => {
        if (!cancelled) setAssignments([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Icons.spinner className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={Icons.cohortisation}
        title="No Cohort Assignments"
        description="This patient has not been assigned to any cohorts yet."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {assignments.map((a) => (
        <AssignmentCard key={a.id} assignment={a} />
      ))}
    </div>
  );
}

function AssignmentCard({ assignment }: { assignment: AssignmentRecord }) {
  const breakdown = assignment.score_breakdown;
  const maxWeighted = breakdown
    ? Math.max(...Object.values(breakdown).map((v) => v.weighted), 1)
    : 1;

  return (
    <Card className="gap-4 py-4">
      <CardHeader className="gap-1 pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {assignment.program_name ?? "Unknown Program"}
          </CardTitle>
          <Badge
            className={cn("text-[10px]")}
            style={{
              backgroundColor: assignment.cohort_color,
              color: isLightColor(assignment.cohort_color) ? "#1a1a1a" : "#ffffff",
            }}
          >
            {assignment.cohort_name}
          </Badge>
        </div>
        <span className="text-[10px] capitalize text-text-muted">
          {assignment.assignment_type} assignment
        </span>
      </CardHeader>

      <CardContent className="space-y-3 pb-0">
        {assignment.score != null && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-text-primary">
              {assignment.score}
            </span>
            <span className="text-xs text-text-muted">score</span>
          </div>
        )}

        {breakdown && Object.keys(breakdown).length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Score Breakdown
            </span>
            {Object.entries(breakdown).map(([key, val]) => (
              <div key={key} className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-secondary">{formatComponentName(key)}</span>
                  <span className="font-medium text-text-primary">{val.weighted.toFixed(1)}</span>
                </div>
                <Progress
                  value={(val.weighted / maxWeighted) * 100}
                  className="h-1.5"
                />
              </div>
            ))}
          </div>
        )}

        {assignment.reason && (
          <p className="text-xs text-text-muted">{assignment.reason}</p>
        )}
      </CardContent>

      <CardFooter className="gap-4 border-t border-border-default pt-3 text-[10px] text-text-muted">
        {assignment.assigned_at && (
          <span>Assigned: {formatDate(assignment.assigned_at)}</span>
        )}
        {assignment.review_due_at && (
          <span>Review due: {formatDate(assignment.review_due_at)}</span>
        )}
      </CardFooter>
    </Card>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatComponentName(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}
