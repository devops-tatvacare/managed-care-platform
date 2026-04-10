import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/cn";
import { Icons } from "@/config/icons";

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: { direction: "up" | "down"; value: string; positive?: boolean };
  icon?: React.ElementType;
  className?: string;
}

export function KpiCard({ label, value, subtitle, trend, icon: Icon, className }: KpiCardProps) {
  const trendPositive = trend?.positive ?? trend?.direction === "up";
  const TrendIcon = trend?.direction === "up" ? Icons.arrowUp : Icons.arrowDown;

  return (
    <Card variant="elevated" density="flush" className={cn("overflow-hidden", className)}>
      <CardHeader className="px-[var(--space-panel-padding)] py-3">
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
            {label}
          </span>
          {Icon && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[color:var(--color-surface-border)] bg-[color:var(--color-surface-muted)] text-brand-primary">
              <Icon className="h-4 w-4 shrink-0" />
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="px-[var(--space-panel-padding)] py-4">
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        {trend && (
          <p
            className={cn(
              "mt-0.5 flex items-center gap-1 text-[11px]",
              trendPositive ? "text-status-success" : "text-status-error",
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {trend.value}
          </p>
        )}
        {subtitle && !trend && (
          <p className="mt-0.5 text-[11px] text-text-muted">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
