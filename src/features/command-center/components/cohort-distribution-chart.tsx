"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/config/icons";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { CohortDistribution } from "@/services/types/cohort";
import type { ProgramListItem } from "@/services/types/program";

interface CohortDistributionChartProps {
  programs: ProgramListItem[];
  distributions: Record<string, CohortDistribution[]>;
  loading: boolean;
}

export function CohortDistributionChart({ programs, distributions, loading }: CohortDistributionChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Icons.outcomes className="h-4 w-4" />
            Cohort Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[240px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData: { name: string; count: number; color: string }[] = [];
  for (const program of programs) {
    const dist = distributions[program.id] ?? [];
    for (const cohort of dist) {
      chartData.push({
        name: cohort.cohort_name,
        count: cohort.count,
        color: cohort.cohort_color,
      });
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icons.outcomes className="h-4 w-4" />
          Cohort Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">No distribution data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value: number) => [value, "Members"]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
