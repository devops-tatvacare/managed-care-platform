"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { buildPath } from "@/config/routes";
import { apiRequest } from "@/services/api/client";
import { API_ENDPOINTS } from "@/config/api";
import { toast } from "sonner";
import type { ActionQueueItem } from "@/services/types/command-center";
import { useCommandCenterStore } from "@/stores/command-center-store";

// priority is a number: 1=high, 2=medium, 3+=low
function getPriorityStyle(priority: number) {
  if (priority === 1) return { border: "border-l-red-400 dark:border-l-red-600", icon: Icons.warning, iconColor: "text-red-500 dark:text-red-400" };
  if (priority === 2) return { border: "border-l-amber-400 dark:border-l-amber-600", icon: Icons.pending, iconColor: "text-amber-500 dark:text-amber-400" };
  return { border: "border-l-slate-300 dark:border-l-slate-600", icon: Icons.idle, iconColor: "text-slate-400 dark:text-slate-500" };
}

interface ActionQueueProps {
  items: ActionQueueItem[];
  loading: boolean;
}

export function ActionQueue({ items, loading }: ActionQueueProps) {
  const router = useRouter();
  const loadActionQueue = useCommandCenterStore((s) => s.loadActionQueue);

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-primary shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-border-default px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Icons.warning className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
          <span className="text-[11px] font-semibold text-text-primary">Action Queue</span>
        </div>
        {!loading && items.length > 0 && (
          <Badge variant="outline" className="h-5 rounded-full border-amber-200 bg-amber-50 px-1.5 text-[9px] text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
            {items.length} pending
          </Badge>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 px-3.5 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full items-center justify-center py-8">
            <div className="space-y-1.5 text-center">
              <Icons.completed className="mx-auto h-5 w-5 text-green-500 dark:text-green-400" />
              <p className="text-[11px] text-text-muted">All caught up</p>
            </div>
          </div>
        ) : (
          items.map((item) => {
            const style = getPriorityStyle(item.priority);
            const PriorityIcon = style.icon;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-2.5 border-b border-border-subtle border-l-[3px] px-3 py-2.5",
                  style.border,
                )}
              >
                <PriorityIcon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", style.iconColor)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-text-primary">{item.title}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-text-muted line-clamp-1">{item.description}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {item.cohort_name && (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                        <span className="text-[9px] text-text-muted">{item.cohort_name}</span>
                      </>
                    )}
                    {item.trigger_data?.risk_score != null && (
                      <span className="text-[9px] tabular-nums text-text-muted">
                        Score: {Math.round(item.trigger_data.risk_score as number)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {item.resolution_options.map((opt, i) => {
                    if (opt.action_type === "dismiss") {
                      return (
                        <Button
                          key={i}
                          variant="ghost"
                          size="xs"
                          className="text-text-muted hover:text-status-error"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await apiRequest({
                              method: "PATCH",
                              path: API_ENDPOINTS.actions.update(item.id),
                              body: { status: "dismissed", resolution_type: "dismiss" },
                            });
                            toast.success("Action dismissed");
                            await loadActionQueue();
                          }}
                        >
                          <Icons.close className="h-3 w-3" />
                        </Button>
                      );
                    }

                    const IconComponent = Icons[opt.icon as keyof typeof Icons] ?? Icons.external;
                    return (
                      <Button
                        key={i}
                        variant="outline"
                        size="xs"
                        className="text-[10px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(
                            buildPath("patientDetail", { id: item.patient_id }) +
                            (opt.navigate_tab ? `?tab=${opt.navigate_tab}` : ""),
                          );
                        }}
                      >
                        <IconComponent className="mr-1 h-3 w-3" />
                        {opt.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
