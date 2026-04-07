"use client";

import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import type { ThreadSummary } from "@/services/types/communications";

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  whatsapp: Icons.send,
  sms: Icons.outreach,
  call: Icons.phone,
  app_push: Icons.notifications,
  system: Icons.ai,
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
      <div className="flex flex-col gap-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-text-muted">No threads found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        {threads.map((thread) => {
          const ChannelIcon = CHANNEL_ICONS[thread.channel] ?? Icons.outreach;
          const isSelected = selectedPatientId === thread.patient_id;

          return (
            <button
              key={thread.patient_id}
              type="button"
              onClick={() => onSelectAction(thread.patient_id)}
              className={cn(
                "flex items-start gap-3 border-b border-border-default px-3 py-3 text-left transition-colors hover:bg-bg-secondary",
                isSelected && "bg-bg-secondary",
              )}
            >
              <ChannelIcon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-text-primary">
                    {thread.patient_name}
                  </span>
                  <span className="shrink-0 text-[10px] text-text-muted">
                    {timeAgo(thread.last_action_at)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="truncate text-xs text-text-muted">
                    {thread.last_action_type.replace(/_/g, " ")}
                  </span>
                  {thread.unread_count > 0 && (
                    <Badge variant="default" className="h-4 min-w-4 shrink-0 px-1 text-[9px]">
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
