import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { type StatusConfig } from "@/config/status";

interface StatusBadgeProps {
  config: StatusConfig;
  className?: string;
}

export function StatusBadge({ config, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium", config.className, className)}>
      {config.label}
    </Badge>
  );
}
