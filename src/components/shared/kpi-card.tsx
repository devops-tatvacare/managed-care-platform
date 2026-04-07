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
    <Card className={cn("gap-0 py-0", className)}>
      <CardHeader className="px-4 py-2.5">
        <CardTitle className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
          {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
          {label}
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="px-4 py-3">
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
