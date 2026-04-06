"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Icons } from "@/config/icons";
import type { PatientDetail, PatientDiagnosisRecord } from "@/services/types/patient";

interface PatientHeaderProps {
  patient: PatientDetail;
  diagnoses: PatientDiagnosisRecord[];
}

function computeAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function PatientHeader({ patient, diagnoses }: PatientHeaderProps) {
  const initials = `${patient.first_name[0]}${patient.last_name[0]}`.toUpperCase();
  const age = computeAge(patient.date_of_birth);
  const activeDiagnoses = diagnoses.filter((d) => d.is_active);
  const activeRx = patient.active_medications?.slice(0, 3) ?? [];

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border-default bg-bg-primary p-4">
      {/* Left */}
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12 rounded-lg">
          <AvatarFallback className="rounded-lg bg-brand-primary-light text-brand-primary text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-text-primary">
            {patient.first_name} {patient.last_name}
          </h2>
          <p className="text-sm text-text-muted">
            {age}y {patient.gender} &middot; EMPI {patient.empi_id}
          </p>
          {activeDiagnoses.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {activeDiagnoses.map((d) => (
                <Badge key={d.id} variant="outline" className="text-[10px]">
                  {d.icd10_code} {d.description}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="text-right space-y-0.5">
          {patient.pcp_name && (
            <p className="text-xs text-text-muted">
              PCP: <span className="text-text-secondary font-medium">{patient.pcp_name}</span>
            </p>
          )}
          {activeRx.length > 0 && (
            <p className="text-xs text-text-muted">
              Rx: {activeRx.map((m) => m.name).join(", ")}
              {(patient.active_medications?.length ?? 0) > 3 && (
                <span className="text-text-placeholder"> +{(patient.active_medications?.length ?? 0) - 3}</span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Icons.documents className="mr-1.5 h-3.5 w-3.5" />
            Care Plan
          </Button>
          <Button size="sm">
            <Icons.send className="mr-1.5 h-3.5 w-3.5" />
            Send Outreach
          </Button>
        </div>
      </div>
    </div>
  );
}
