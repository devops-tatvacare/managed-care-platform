"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    <div className="rounded-lg border border-border-default bg-bg-primary shadow-sm px-5 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Avatar + Identity */}
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 rounded-lg">
            <AvatarFallback className="rounded-lg bg-brand-primary-light text-brand-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-text-primary">
                {patient.first_name} {patient.last_name}
              </h2>
              <span className="text-[11px] text-text-placeholder">
                {age}y &middot; {patient.gender} &middot; {patient.empi_id}
              </span>
            </div>
            {activeDiagnoses.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {activeDiagnoses.map((d) => (
                  <Badge key={d.id} variant="outline" className="text-[10px] px-2 py-0 h-5">
                    {d.icd10_code} {d.description}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Context chips + Actions, separated by dividers */}
        <div className="flex items-center gap-4 shrink-0">
          {patient.pcp_name && (
            <>
              <div className="text-right text-[11px]">
                <span className="text-text-placeholder">PCP</span>{" "}
                <span className="text-text-primary font-medium">{patient.pcp_name}</span>
              </div>
              <div className="h-5 w-px bg-border-default" />
            </>
          )}
          {activeRx.length > 0 && (
            <>
              <div className="text-right text-[11px]">
                <span className="text-text-placeholder">Rx</span>{" "}
                <span className="text-text-primary font-medium">
                  {activeRx.map((m) => m.name).join(", ")}
                  {(patient.active_medications?.length ?? 0) > 3 && (
                    <span className="text-text-placeholder"> +{(patient.active_medications?.length ?? 0) - 3}</span>
                  )}
                </span>
              </div>
              <div className="h-5 w-px bg-border-default" />
            </>
          )}
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
    </div>
  );
}
