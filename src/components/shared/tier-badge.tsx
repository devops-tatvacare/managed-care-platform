import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { getTier } from "@/config/tiers";
import { TIER_BADGE_STYLES } from "@/config/status";

interface TierBadgeProps {
  tier: number;
  showName?: boolean;
  className?: string;
}

export function TierBadge({ tier, showName = false, className }: TierBadgeProps) {
  const config = getTier(tier);
  const style = TIER_BADGE_STYLES[tier];

  return (
    <Badge variant="outline" className={cn("text-[10px] font-semibold", style.className, className)}>
      {config.label}
      {showName && ` \u2014 ${config.name}`}
    </Badge>
  );
}
