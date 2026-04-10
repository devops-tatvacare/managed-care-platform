import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface DashboardCardProps {
  icon?: React.ElementType;
  title: string;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  variant?: "default" | "subtle" | "elevated" | "ai";
  density?: "default" | "compact";
  iconStyle?: "boxed" | "bare" | "hidden";
  showSeparator?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function DashboardCard({
  icon: Icon,
  title,
  description,
  badge,
  actions,
  variant = "default",
  density = "default",
  iconStyle = "boxed",
  showSeparator = true,
  className,
  headerClassName,
  contentClassName,
  children,
}: DashboardCardProps) {
  const isAi = variant === "ai";
  const isCompact = density === "compact";

  return (
    <Card
      variant={variant}
      density="flush"
      className={cn(
        "overflow-hidden",
        className,
      )}
    >
      <CardHeader
        className={cn(
          isCompact
            ? "px-[var(--space-panel-padding-compact)] py-[var(--space-panel-padding-compact)]"
            : "px-[var(--space-panel-padding)] py-[var(--space-panel-padding)]",
          headerClassName,
        )}
      >
        <div className={cn("flex items-start", isCompact ? "gap-2" : "gap-3")}>
          {Icon && iconStyle !== "hidden" && (
            <div
              className={cn(
                iconStyle === "boxed"
                  ? cn(
                      "mt-0.5 flex shrink-0 items-center justify-center rounded-lg border",
                      isCompact ? "h-7 w-7" : "h-8 w-8",
                      isAi
                        ? "border-ai-border bg-[color:var(--color-surface-ai)] text-ai-primary"
                        : "border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-muted)] text-text-muted",
                    )
                  : "mt-0.5 flex shrink-0 items-center justify-center text-text-muted",
              )}
            >
              <Icon className={cn("shrink-0", isCompact ? "h-3.5 w-3.5" : "h-4 w-4")} />
            </div>
          )}

          <div className={cn("min-w-0 flex-1", description ? "space-y-1" : "space-y-0")}>
            <CardTitle
              className={cn(
                "font-semibold tracking-[0.01em] text-text-primary",
                isCompact ? "text-[12px]" : "text-[13px]",
              )}
            >
              {title}
            </CardTitle>
            {description && (
              <p
                className={cn(
                  "text-text-muted",
                  isCompact ? "text-[11px] leading-[1.125rem]" : "text-xs leading-5",
                )}
              >
                {description}
              </p>
            )}
          </div>

          {(badge != null || actions) && (
            <div className={cn("flex shrink-0 items-center", isCompact ? "gap-1.5" : "gap-2")}>
              {badge != null && (
                <Badge
                  variant="secondary"
                  className={cn(isCompact ? "h-5 px-1.5 text-[10px]" : "text-[11px]")}
                >
                  {badge}
                </Badge>
              )}
              {actions}
            </div>
          )}
        </div>
      </CardHeader>
      {showSeparator && <Separator />}
      <CardContent
        className={cn(
          isCompact
            ? "px-[var(--space-panel-padding-compact)] py-[var(--space-panel-padding-compact)]"
            : "px-[var(--space-panel-padding)] py-[var(--space-panel-padding)]",
          contentClassName,
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}
