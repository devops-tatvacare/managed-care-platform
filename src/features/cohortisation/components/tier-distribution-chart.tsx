"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { TIERS } from "@/config/tiers";

const TIER_COLORS = ["#86efac", "#93c5fd", "#fcd34d", "#fdba74", "#fca5a5"];

export function TierDistributionChart() {
  const { distribution, distributionTotal, distributionLoading } =
    useCohortisationStore();

  const chartData = TIERS.map((tier) => {
    const match = distribution.find((d) => d.tier === tier.number);
    return {
      name: tier.label,
      count: match?.count ?? 0,
      tier: tier.number,
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold">
          Population Distribution
        </CardTitle>
        <span className={cn("text-sm text-muted-foreground", distributionLoading && "opacity-50")}>
          {distributionTotal} patients
        </span>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0];
                return (
                  <div className="rounded-md border bg-popover px-3 py-2 shadow-sm text-sm">
                    <p className="font-medium">{item.payload.name}</p>
                    <p className="text-muted-foreground">
                      {item.value} patients
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.tier}`}
                  fill={TIER_COLORS[entry.tier]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
