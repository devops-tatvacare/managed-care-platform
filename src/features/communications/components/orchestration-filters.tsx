"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProgramListItem, CohortSummary } from "@/services/types/program";

const CHANNEL_OPTIONS = [
  { value: "all", label: "All Channels" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "call", label: "Call" },
  { value: "app_push", label: "Push" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
] as const;

interface OrchestrationFiltersProps {
  programs: ProgramListItem[];
  cohorts: CohortSummary[];
  selectedProgramId: string;
  selectedCohortId: string;
  selectedChannel: string;
  selectedStatus: string;
  onProgramChangeAction: (value: string) => void;
  onCohortChangeAction: (value: string) => void;
  onChannelChangeAction: (value: string) => void;
  onStatusChangeAction: (value: string) => void;
}

const triggerClassName = "h-8 w-full rounded-lg border-[color:var(--color-surface-border)] bg-bg-primary text-xs shadow-none";

export function OrchestrationFilters({
  programs,
  cohorts,
  selectedProgramId,
  selectedCohortId,
  selectedChannel,
  selectedStatus,
  onProgramChangeAction,
  onCohortChangeAction,
  onChannelChangeAction,
  onStatusChangeAction,
}: OrchestrationFiltersProps) {
  return (
    <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <Select value={selectedProgramId} onValueChange={onProgramChangeAction}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder="All Programs" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Programs</SelectItem>
          {programs.map((p) => (
            <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedCohortId} onValueChange={onCohortChangeAction}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder="All Cohorts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">All Cohorts</SelectItem>
          {cohorts.map((c) => (
            <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedChannel} onValueChange={onChannelChangeAction}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CHANNEL_OPTIONS.map((c) => (
            <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedStatus} onValueChange={onStatusChangeAction}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
