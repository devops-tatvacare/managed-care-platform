"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StatusBadge } from "@/components/shared/status-badge";
import { Icons } from "@/config/icons";
import { PROTOCOL_STEP_STATUS } from "@/config/status";
import { cn } from "@/lib/cn";
import type { PatientDetail } from "@/services/types/patient";

interface CareProtocolsTabProps {
  patient: PatientDetail;
}

const PROTOCOL_STEPS = [
  { id: "1", title: "Chart Review & Eligibility", status: "completed" as const },
  { id: "2", title: "Patient Contact & Enrollment", status: "completed" as const },
  { id: "3", title: "Careplan Generation", status: "completed" as const },
  { id: "4", title: "Adherence Barrier Assessment", status: "in_progress" as const },
  { id: "5", title: "Monthly Clinical Review", status: "pending" as const },
  { id: "6", title: "Specialist Referrals", status: "overdue" as const },
];

const STATUS_ICONS: Record<string, typeof Icons.completed> = {
  completed: Icons.completed,
  in_progress: Icons.pending,
  pending: Icons.idle,
  overdue: Icons.warning,
};

export function CareProtocolsTab({ patient }: CareProtocolsTabProps) {
  const gapList = patient.care_gaps?.slice(0, 3).join(", ") ?? "none identified";

  return (
    <div className="space-y-6">
      {/* AI Summary Card */}
      <Card className={cn("border-ai-border bg-gradient-to-br from-indigo-50 to-purple-50")}>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="border-ai-border bg-white/60 text-brand-primary text-[10px] font-semibold">
              <Icons.ai className="mr-1 h-3 w-3" />
              AI CARE SUMMARY
            </Badge>
            <span className="text-[11px] text-text-muted">Updated today</span>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed">
            {patient.first_name} is a {patient.tier >= 3 ? "high-complexity" : "moderate-complexity"} patient
            currently enrolled in the {patient.pathway_name ?? "standard care"} pathway.
            {patient.care_gaps && patient.care_gaps.length > 0
              ? ` There are ${patient.care_gaps.length} open care gaps (${gapList}) requiring attention.`
              : " No open care gaps have been identified."}{" "}
            Medication adherence tracking shows{" "}
            {patient.active_medications && patient.active_medications.length > 0
              ? `${patient.active_medications.length} active medications being monitored.`
              : "no active medications currently being monitored."}{" "}
            The recommended next step is to complete the adherence barrier assessment
            and schedule any overdue specialist referrals.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button size="sm">Schedule Ophthalmology</Button>
            <Button size="sm">Order uACR Lab</Button>
            <Button size="sm" variant="outline">Assign Pharmacist Review</Button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Icons.thumbsUp className="h-3.5 w-3.5 text-text-muted" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Icons.thumbsDown className="h-3.5 w-3.5 text-text-muted" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Protocol Steps */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Protocol Steps</h3>
        <Accordion type="single" collapsible className="space-y-2">
          {PROTOCOL_STEPS.map((step) => {
            const StepIcon = STATUS_ICONS[step.status];
            const statusConfig = PROTOCOL_STEP_STATUS[step.status];
            return (
              <AccordionItem
                key={step.id}
                value={step.id}
                className="rounded-md border border-border-default px-4"
              >
                <AccordionTrigger className="py-3 text-sm hover:no-underline">
                  <div className="flex items-center gap-3">
                    <StepIcon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        step.status === "completed" && "text-green-600",
                        step.status === "in_progress" && "text-indigo-600",
                        step.status === "pending" && "text-slate-400",
                        step.status === "overdue" && "text-red-600",
                      )}
                    />
                    <span className="font-medium text-text-primary">{step.title}</span>
                    <StatusBadge config={statusConfig} />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3 text-sm text-text-muted">
                  Details for &ldquo;{step.title}&rdquo; will be populated from the protocol engine.
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
