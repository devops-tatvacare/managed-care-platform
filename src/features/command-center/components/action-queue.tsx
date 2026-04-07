"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { buildPath } from "@/config/routes";
import type { ActionQueueItem } from "@/services/types/command-center";

const PRIORITY_STYLES: Record<string, string> = {
  high: "border-l-status-error",
  medium: "border-l-status-warning",
  low: "border-l-border",
};

const ALERT_ICONS: Record<string, React.ElementType> = {
  overdue_review: Icons.warning,
  care_gap: Icons.careGap,
  cohort_change: Icons.arrowUp,
  missed_touchpoint: Icons.phone,
};

interface ActionQueueProps {
  items: ActionQueueItem[];
  loading: boolean;
}

export function ActionQueue({ items, loading }: ActionQueueProps) {
  const router = useRouter();

  function handleAction(action: { action_type: string; target: string }) {
    if (action.action_type === "navigate") {
      router.push(buildPath("patientDetail", { id: action.target }));
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Icons.ai className="h-4 w-4" />
            AI Action Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icons.ai className="h-4 w-4" />
          AI Action Queue
          <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px]">
          <div className="space-y-0 divide-y divide-border">
            {items.map((item) => {
              const AlertIcon = ALERT_ICONS[item.alert_type] ?? Icons.warning;
              return (
                <div
                  key={item.id}
                  className={cn("border-l-4 px-4 py-3", PRIORITY_STYLES[item.priority])}
                >
                  <div className="flex items-start gap-2">
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">{item.title}</p>
                      <p className="text-xs text-text-muted">{item.description}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{ borderColor: item.cohort_color, color: item.cohort_color }}
                        >
                          {item.cohort_name}
                        </Badge>
                        {item.actions.map((action) => (
                          <Button
                            key={action.label}
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => handleAction(action)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-text-muted">No pending actions</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
