import { cn } from "@/lib/cn";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface DashboardCardProps {
  icon?: React.ElementType;
  title: string;
  badge?: string | number;
  variant?: "default" | "ai";
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function DashboardCard({
  icon: Icon,
  title,
  badge,
  variant = "default",
  className,
  contentClassName,
  children,
}: DashboardCardProps) {
  const isAi = variant === "ai";

  return (
    <Card
      className={cn(
        "gap-0 py-0",
        isAi && "border-ai-border bg-[color-mix(in_srgb,var(--color-ai-primary)_3%,white)]",
        className,
      )}
    >
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-[13px] font-semibold">
          {Icon && (
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                isAi ? "text-ai-primary" : "text-text-muted",
              )}
            />
          )}
          {title}
        </CardTitle>
        {badge != null && (
          <CardAction>
            <Badge variant="secondary" className="text-[11px]">
              {badge}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <Separator />
      <CardContent className={cn("px-4 py-3", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
