"use client";

import { KpiCard } from "@/components/shared/kpi-card";
import { Icons } from "@/config/icons";
import type { OrchestrationStats as Stats } from "@/services/types/communications";

interface OrchestrationStatsProps {
  stats: Stats | null;
  loading: boolean;
}

export function OrchestrationStats({ stats, loading }: OrchestrationStatsProps) {
  const cards = [
    { label: "Total Sequences", value: stats?.total_sequences ?? 0, icon: Icons.outreach },
    { label: "Active", value: stats?.active ?? 0, icon: Icons.active },
    { label: "Completed", value: stats?.completed ?? 0, icon: Icons.completed },
    { label: "Failed", value: stats?.failed ?? 0, icon: Icons.warning },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {cards.map((c) => (
        <KpiCard
          key={c.label}
          label={c.label}
          value={loading ? "—" : c.value}
          icon={c.icon}
        />
      ))}
    </div>
  );
}
