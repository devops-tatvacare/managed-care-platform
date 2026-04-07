"use client";

import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import type { ConciergeActionRead } from "@/services/types/communications";

const STATUS_ICONS: Record<string, { icon: React.ElementType; className: string }> = {
  pending: { icon: Icons.pending, className: "text-text-muted" },
  success: { icon: Icons.completed, className: "text-status-success" },
  failed: { icon: Icons.warning, className: "text-status-error" },
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  call: "Call",
  app_push: "Push",
  system: "System",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface MessageThreadProps {
  patientName: string | null;
  actions: ConciergeActionRead[];
  loading: boolean;
}

export function MessageThread({ patientName, actions, loading }: MessageThreadProps) {
  if (!patientName && !loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-muted">Select a thread to view messages</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className={cn("h-16 w-3/4 rounded-lg", i % 2 === 0 ? "ml-auto" : "")} />
        ))}
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-text-muted">No messages yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-4">
        {actions.map((action) => {
          const isReply = action.action_type.includes("replied");
          const isSystem = action.channel === "system";
          const statusCfg = STATUS_ICONS[action.status] ?? STATUS_ICONS.pending;
          const StatusIcon = statusCfg.icon;

          if (isSystem) {
            return (
              <div key={action.id} className="flex justify-center py-1">
                <div className="rounded-full bg-bg-tertiary px-3 py-1 text-[11px] text-text-muted">
                  {action.action_type.replace(/_/g, " ")} — {formatTime(action.created_at)}
                </div>
              </div>
            );
          }

          return (
            <div
              key={action.id}
              className={cn(
                "flex",
                isReply ? "justify-start" : "justify-end",
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2",
                  isReply
                    ? "bg-bg-tertiary text-text-primary"
                    : "bg-brand-primary text-white",
                )}
              >
                <p className="text-sm">
                  {action.payload?.message
                    ? String(action.payload.message)
                    : action.action_type.replace(/_/g, " ")}
                </p>
                <div
                  className={cn(
                    "mt-1 flex items-center gap-1.5 text-[10px]",
                    isReply ? "text-text-muted" : "text-white/70",
                  )}
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 px-1 text-[9px]",
                      isReply ? "border-border-default text-text-muted" : "border-white/30 text-white/80",
                    )}
                  >
                    {CHANNEL_LABELS[action.channel] ?? action.channel}
                  </Badge>
                  <span>{formatTime(action.created_at)}</span>
                  <StatusIcon className={cn("h-3 w-3", isReply ? statusCfg.className : "text-white/70")} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
