"use client";

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
      {/* AI Summary Card — compact */}
      <div className="rounded-lg border border-ai-border bg-gradient-to-br from-indigo-50/60 to-purple-50/40 px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Badge className="shrink-0 bg-brand-primary text-white text-[10px] font-semibold px-2 py-0.5">
              <Icons.ai className="mr-1 h-3 w-3" />
              AI SUMMARY
            </Badge>
            <p className="text-[13px] text-text-secondary leading-snug">
              {patient.first_name} is a moderate-complexity patient
              in the {patient.pathway_name ?? "standard care"} pathway.
              {patient.care_gaps && patient.care_gaps.length > 0
                ? ` ${patient.care_gaps.length} open care gaps (${gapList}).`
                : " No open care gaps."}{" "}
              {patient.active_medications && patient.active_medications.length > 0
                ? `${patient.active_medications.length} active medications tracked.`
                : ""}{" "}
              Next: complete adherence barrier assessment, schedule overdue specialist referrals.
            </p>
          </div>
          <span className="shrink-0 text-[10px] text-text-placeholder whitespace-nowrap">Updated today</span>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <Button size="xs" variant="outline" className="border-brand-primary text-brand-primary hover:bg-brand-primary-light">
            Schedule Ophthalmology
          </Button>
          <Button size="xs" variant="outline" className="border-brand-primary text-brand-primary hover:bg-brand-primary-light">
            Order uACR Lab
          </Button>
          <Button size="xs" variant="outline" className="border-border-default text-text-secondary hover:bg-bg-hover">
            Assign Pharmacist Review
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon-xs">
              <Icons.thumbsUp className="text-text-placeholder" />
            </Button>
            <Button variant="ghost" size="icon-xs">
              <Icons.thumbsDown className="text-text-placeholder" />
            </Button>
          </div>
        </div>
      </div>

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
