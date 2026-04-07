"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import type { PatientDetail } from "@/services/types/patient";
import type { AssignmentRecord } from "@/services/types/cohort";

function computeAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

interface PatientContextPanelProps {
  patient: PatientDetail | null;
  cohorts: AssignmentRecord[];
  loading: boolean;
}

export function PatientContextPanel({ patient, cohorts, loading }: PatientContextPanelProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-text-muted">Select a thread to see patient context</p>
      </div>
    );
  }

  const age = computeAge(patient.date_of_birth);
  const careGaps = patient.care_gaps ?? [];
  const meds = patient.active_medications ?? [];

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 p-3">
        {/* Patient summary */}
        <Card className="gap-0 py-0">
          <CardHeader className="px-3 py-2.5">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold">
              <Icons.user className="h-3.5 w-3.5 text-text-muted" />
              Patient
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="px-3 py-2.5">
            <p className="text-sm font-medium text-text-primary">
              {patient.first_name} {patient.last_name}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {age}y {patient.gender} {patient.cpf ? `| CPF: ${patient.cpf}` : ""}
            </p>
          </CardContent>
        </Card>

        {/* Cohort membership */}
        {cohorts.length > 0 && (
          <Card className="gap-0 py-0">
            <CardHeader className="px-3 py-2.5">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold">
                <Icons.cohortisation className="h-3.5 w-3.5 text-text-muted" />
                Cohort Membership
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="flex flex-wrap gap-1.5 px-3 py-2.5">
              {cohorts.map((c) => (
                <Badge
                  key={c.id}
                  variant="outline"
                  className="text-[10px]"
                  style={{ borderColor: c.cohort_color, color: c.cohort_color }}
                >
                  {c.program_name ? `${c.program_name} / ` : ""}{c.cohort_name}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Care gaps */}
        {careGaps.length > 0 && (
          <Card className="gap-0 py-0">
            <CardHeader className="px-3 py-2.5">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold">
                <Icons.careGap className="h-3.5 w-3.5 text-text-muted" />
                Open Care Gaps
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="px-3 py-2.5">
              <ul className="flex flex-col gap-1">
                {careGaps.map((gap) => (
                  <li key={gap} className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-status-warning" />
                    {gap}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Medications */}
        {meds.length > 0 && (
          <Card className="gap-0 py-0">
            <CardHeader className="px-3 py-2.5">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold">
                <Icons.pharmacy className="h-3.5 w-3.5 text-text-muted" />
                Active Medications
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="px-3 py-2.5">
              <ul className="flex flex-col gap-1">
                {meds.map((med) => (
                  <li key={med.name} className="text-xs text-text-secondary">
                    {med.name} {med.dose} — {med.frequency}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Pathway step */}
        {patient.pathway_status && (
          <Card className="gap-0 py-0">
            <CardHeader className="px-3 py-2.5">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold">
                <Icons.pathwayBuilder className="h-3.5 w-3.5 text-text-muted" />
                Pathway
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="px-3 py-2.5">
              <p className="text-xs text-text-secondary">
                {patient.pathway_name ?? "—"} ({patient.pathway_status})
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
