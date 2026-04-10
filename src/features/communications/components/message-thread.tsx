"use client";

import { cn } from "@/lib/cn";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import type { ConciergeActionRead } from "@/services/types/communications";

/* ── Constants ── */

const STATUS_ICONS: Record<string, { icon: React.ElementType; className: string }> = {
  pending: { icon: Icons.pending, className: "text-text-placeholder" },
  success: { icon: Icons.completed, className: "text-green-500 dark:text-green-400" },
  failed: { icon: Icons.warning, className: "text-red-500 dark:text-red-400" },
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  call: "Call",
  app_push: "Push",
  system: "System",
};

const EVENT_LABELS: Record<string, string> = {
  call_initiated: "Call initiated",
  call_completed: "Call completed",
  call_no_answer: "Call — no answer",
  push_sent: "Push notification sent",
  push_opened: "Push notification opened",
  wa_delivered: "Message delivered",
  sms_delivered: "SMS delivered",
  wa_read: "Message read",
};

const EVENT_ICONS: Record<string, React.ElementType> = {
  call_initiated: Icons.phone,
  call_completed: Icons.completed,
  call_no_answer: Icons.warning,
  push_sent: Icons.notifications,
  push_opened: Icons.notifications,
  wa_delivered: Icons.completed,
  sms_delivered: Icons.completed,
  wa_read: Icons.completed,
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** True if the action represents a message with actual text content */
function isMessageAction(action: ConciergeActionRead): boolean {
  const msg = action.payload?.message;
  return typeof msg === "string" && msg.trim().length > 0;
}

/* ── Component ── */

interface MessageThreadProps {
  patientName: string | null;
  actions: ConciergeActionRead[];
  loading: boolean;
}

export function MessageThread({ patientName, actions, loading }: MessageThreadProps) {
  if (!patientName && !loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)]">
            <Icons.communications className="h-5 w-5 text-text-placeholder" />
          </div>
          <p className="text-sm text-text-muted">Select a thread to view messages</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-16 w-3/5 rounded-2xl", i % 2 === 0 ? "ml-auto" : "")}
          />
        ))}
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-surface-muted)]">
            <Icons.send className="h-5 w-5 text-text-placeholder" />
          </div>
          <p className="text-sm text-text-muted">No messages yet</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1.5 p-4">
        {actions.map((action) => {
          const isMessage = isMessageAction(action);
          const isReply = action.action_type.includes("replied");
          const statusCfg = STATUS_ICONS[action.status] ?? STATUS_ICONS.pending;
          const StatusIcon = statusCfg.icon;

          /* ── Event marker (non-message actions) ── */
          if (!isMessage) {
            const EventIcon = EVENT_ICONS[action.action_type] ?? Icons.pending;
            const label = EVENT_LABELS[action.action_type] ?? action.action_type.replace(/_/g, " ");

            return (
              <div key={action.id} className="flex items-center gap-2 py-1.5">
                <span className="h-px flex-1 bg-[color:var(--color-surface-border)]" />
                <div className="flex items-center gap-1.5 rounded-full bg-[color:var(--color-surface-muted)] px-3 py-1">
                  <EventIcon className="h-3 w-3 text-text-muted" />
                  <span className="text-[11px] text-text-muted">{label}</span>
                  <span className="text-[10px] text-text-placeholder">
                    {formatTime(action.created_at)}
                  </span>
                  {action.triggered_by === "auto" && (
                    <Icons.ai className="h-2.5 w-2.5 text-indigo-500 dark:text-indigo-400" />
                  )}
                  <StatusIcon className={cn("h-2.5 w-2.5", statusCfg.className)} />
                </div>
                <span className="h-px flex-1 bg-[color:var(--color-surface-border)]" />
              </div>
            );
          }

          /* ── Message bubble ── */
          return (
            <div
              key={action.id}
              className={cn("flex", isReply ? "justify-start" : "justify-end")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3.5 py-2.5",
                  isReply
                    ? "rounded-bl-md border border-[color:var(--color-surface-border)] bg-bg-primary text-text-primary"
                    : "rounded-br-md bg-brand-primary text-white",
                )}
              >
                <p className="text-[13px] leading-[1.4]">
                  {String(action.payload!.message)}
                </p>
                <div
                  className={cn(
                    "mt-1.5 flex items-center gap-1.5 text-[10px]",
                    isReply ? "text-text-muted" : "text-white/60",
                  )}
                >
                  {action.triggered_by === "auto" ? (
                    <span className="inline-flex items-center gap-0.5">
                      <Icons.ai className="h-2.5 w-2.5" />
                      AI
                    </span>
                  ) : (
                    <span>Manual</span>
                  )}
                  <span className={cn("h-0.5 w-0.5 rounded-full", isReply ? "bg-text-placeholder" : "bg-white/40")} />
                  <span>{CHANNEL_LABELS[action.channel] ?? action.channel}</span>
                  <span className={cn("h-0.5 w-0.5 rounded-full", isReply ? "bg-text-placeholder" : "bg-white/40")} />
                  <span>{formatTime(action.created_at)}</span>
                  <StatusIcon className={cn("ml-auto h-3 w-3", isReply ? statusCfg.className : "text-white/60")} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
