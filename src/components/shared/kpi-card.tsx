import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { Icons } from "@/config/icons";

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: { direction: "up" | "down"; value: string; positive?: boolean };
  className?: string;
}

export function KpiCard({ label, value, subtitle, trend, className }: KpiCardProps) {
  const trendPositive = trend?.positive ?? trend?.direction === "up";
  const TrendIcon = trend?.direction === "up" ? Icons.arrowUp : Icons.arrowDown;

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</p>
        <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
        {trend && (
          <p className={cn("mt-0.5 flex items-center gap-1 text-[11px]", trendPositive ? "text-status-success" : "text-status-error")}>
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
