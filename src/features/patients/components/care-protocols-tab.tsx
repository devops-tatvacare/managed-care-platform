"use client";

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
import { AISummaryCard } from "./ai-summary-card";

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
  return (
    <div className="space-y-6">
      {/* AI Clinical Summary — real LLM-powered */}
      <AISummaryCard patientId={patient.id} />

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
                        step.status === "completed" && "text-green-600 dark:text-green-400",
                        step.status === "in_progress" && "text-indigo-600 dark:text-indigo-400",
                        step.status === "pending" && "text-slate-400 dark:text-slate-500",
                        step.status === "overdue" && "text-red-600 dark:text-red-400",
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
