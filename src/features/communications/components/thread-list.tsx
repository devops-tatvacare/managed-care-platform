"use client";

import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import type { ThreadSummary } from "@/services/types/communications";

const CHANNEL_CONFIG: Record<string, { icon: React.ElementType; label: string; bg: string; text: string }> = {
  whatsapp: { icon: Icons.send, label: "WhatsApp", bg: "bg-green-100 dark:bg-green-900", text: "text-green-700 dark:text-green-400" },
  sms: { icon: Icons.outreach, label: "SMS", bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-700 dark:text-blue-400" },
  call: { icon: Icons.phone, label: "Call", bg: "bg-amber-100 dark:bg-amber-900", text: "text-amber-700 dark:text-amber-400" },
  app_push: { icon: Icons.notifications, label: "Push", bg: "bg-violet-100 dark:bg-violet-900", text: "text-violet-700 dark:text-violet-400" },
  system: { icon: Icons.ai, label: "System", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400" },
};

const STATUS_DOT: Record<string, string> = {
  success: "bg-green-500",
  failed: "bg-red-500",
  pending: "bg-yellow-500",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

interface ThreadListProps {
  threads: ThreadSummary[];
  loading: boolean;
  selectedPatientId: string | null;
  onSelectAction: (patientId: string) => void;
}

export function ThreadList({ threads, loading, selectedPatientId, onSelectAction }: ThreadListProps) {
  if (loading && threads.length === 0) {
    return (
      <div className="flex flex-col gap-1 p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)]">
            <Icons.communications className="h-5 w-5 text-text-placeholder" />
          </div>
          <p className="text-sm text-text-muted">No threads found</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-px p-1.5">
        {threads.map((thread) => {
          const cfg = CHANNEL_CONFIG[thread.channel] ?? CHANNEL_CONFIG.system;
          const ChannelIcon = cfg.icon;
          const isSelected = selectedPatientId === thread.patient_id;

          return (
            <button
              key={thread.patient_id}
              type="button"
              onClick={() => onSelectAction(thread.patient_id)}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "relative h-auto w-full items-center justify-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left whitespace-normal",
                isSelected
                  ? "bg-brand-primary/[0.08] ring-1 ring-brand-primary/20"
                  : "hover:bg-[color:var(--color-surface-subtle)]",
              )}
            >
              {/* Channel avatar */}
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", cfg.bg, cfg.text)}>
                <ChannelIcon className="h-3.5 w-3.5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-medium text-text-primary">
                    {thread.patient_name}
                  </span>
                  <span className="shrink-0 text-[10px] text-text-placeholder">
                    {timeAgo(thread.last_action_at)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[thread.last_action_status] ?? STATUS_DOT.pending)} />
                  <span className="text-[11px] text-text-muted">
                    {cfg.label}
                  </span>
                  <span className="text-[10px] text-text-placeholder">· {thread.total_actions}</span>
                  {thread.unread_count > 0 && (
                    <Badge variant="default" className="ml-auto h-[16px] min-w-[16px] shrink-0 rounded-full px-1 text-[9px]">
                      {thread.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
