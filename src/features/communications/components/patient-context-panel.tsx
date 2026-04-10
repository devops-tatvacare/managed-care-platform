"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Icons } from "@/config/icons";
import { PATIENT_PATHWAY_STATUS, careGapSeverity } from "@/config/status";
import { cn } from "@/lib/cn";
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

const SECTION_COLORS: Record<string, { bg: string; icon: string }> = {
  patient: { bg: "bg-indigo-50/60 dark:bg-indigo-950/60", icon: "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400" },
  cohort: { bg: "bg-blue-50/60 dark:bg-blue-950/60", icon: "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400" },
  "care-gaps": { bg: "bg-amber-50/60 dark:bg-amber-950/60", icon: "bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400" },
  medications: { bg: "bg-emerald-50/60 dark:bg-emerald-950/60", icon: "bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400" },
  pathway: { bg: "bg-violet-50/60 dark:bg-violet-950/60", icon: "bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-400" },
};

function ContextSection({
  icon: Icon,
  title,
  colorKey = "patient",
  children,
}: {
  icon: React.ElementType;
  title: string;
  colorKey?: string;
  children: React.ReactNode;
}) {
  const colors = SECTION_COLORS[colorKey] ?? SECTION_COLORS.patient;
  return (
    <section>
      <div className={cn("flex items-center gap-2 px-[var(--space-panel-padding-compact)] py-2", colors.bg)}>
        <span className={cn("flex h-5 w-5 items-center justify-center rounded", colors.icon)}>
          <Icon className="h-3 w-3" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
          {title}
        </span>
      </div>
      <div className="px-[var(--space-panel-padding-compact)] py-2.5">
        {children}
      </div>
    </section>
  );
}

export function PatientContextPanel({ patient, cohorts, loading }: PatientContextPanelProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-[var(--space-panel-padding-compact)]">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="space-y-2 text-center">
          <Icons.user className="mx-auto h-5 w-5 text-text-placeholder" />
          <p className="text-xs text-text-muted">Select a thread to see patient context</p>
        </div>
      </div>
    );
  }

  const age = computeAge(patient.date_of_birth);
  const careGaps = patient.care_gaps ?? [];
  const meds = patient.active_medications ?? [];
  const gapSev = careGapSeverity(careGaps.length);

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-[color:var(--color-surface-border)]">
        {/* Patient identity */}
        <ContextSection icon={Icons.user} title="Patient" colorKey="patient">
          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-text-primary">
              {patient.first_name} {patient.last_name}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-[10px]">
                {age}y
              </Badge>
              <Badge variant="secondary" className="text-[10px] capitalize">
                {patient.gender}
              </Badge>
              {patient.preferred_language && (
                <Badge variant="secondary" className="text-[10px] uppercase">
                  {patient.preferred_language}
                </Badge>
              )}
              {patient.cpf && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  CPF {patient.cpf}
                </Badge>
              )}
            </div>
            {patient.preferred_channel && (
              <p className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <Icons.send className="h-3 w-3" />
                Preferred: <span className="capitalize text-text-secondary">{patient.preferred_channel}</span>
              </p>
            )}
          </div>
        </ContextSection>

        {/* Cohort membership */}
        {cohorts.length > 0 && (
          <ContextSection icon={Icons.cohortisation} title="Cohort membership" colorKey="cohort">
            <div className="flex flex-col gap-2">
              {cohorts.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: c.cohort_color }}
                  />
                  <span className="text-xs text-text-secondary">
                    {c.program_name ? <span className="text-text-muted">{c.program_name} / </span> : ""}
                    <span className="font-medium text-text-primary">{c.cohort_name}</span>
                  </span>
                  {c.score != null && (
                    <span className="ml-auto text-[10px] tabular-nums text-text-muted">
                      Score {c.score}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </ContextSection>
        )}

        {/* Care gaps */}
        {careGaps.length > 0 && (
          <ContextSection icon={Icons.careGap} title="Open care gaps" colorKey="care-gaps">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className={cn("text-sm font-semibold tabular-nums", gapSev.className)}>
                  {gapSev.label}
                </span>
                <span className="text-[11px] text-text-muted">open</span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {careGaps.map((gap) => (
                  <li key={gap} className="flex items-start gap-2 text-xs leading-5 text-text-secondary">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-status-warning" />
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          </ContextSection>
        )}

        {/* Medications */}
        {meds.length > 0 && (
          <ContextSection icon={Icons.pharmacy} title="Active medications" colorKey="medications">
            <ul className="flex flex-col gap-2">
              {meds.map((med) => (
                <li key={med.name} className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-text-primary">{med.name}</span>
                    <span className="text-[10px] text-text-muted">{med.dose}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-text-muted">{med.frequency}</span>
                    {med.pdc_90day != null && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-4 px-1 text-[9px] tabular-nums",
                          med.pdc_90day >= 80
                            ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300"
                            : med.pdc_90day >= 50
                              ? "border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                              : "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
                        )}
                      >
                        PDC {med.pdc_90day}%
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </ContextSection>
        )}

        {/* Pathway */}
        {patient.pathway_status && (
          <ContextSection icon={Icons.pathwayBuilder} title="Pathway" colorKey="pathway">
            <div className="flex items-center gap-2">
              {patient.pathway_name && (
                <span className="text-xs font-medium text-text-primary">{patient.pathway_name}</span>
              )}
              {PATIENT_PATHWAY_STATUS[patient.pathway_status] ? (
                <StatusBadge config={PATIENT_PATHWAY_STATUS[patient.pathway_status]} />
              ) : (
                <span className="text-xs text-text-muted capitalize">{patient.pathway_status}</span>
              )}
            </div>
          </ContextSection>
        )}
      </div>
    </ScrollArea>
  );
}
