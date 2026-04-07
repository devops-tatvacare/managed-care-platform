"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { getTier } from "@/config/tiers";

export function TierThresholdPanel() {
  const { config } = useCohortisationStore();

  if (!config) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Tier Thresholds</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-muted">No config loaded.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedTiebreakers = [...config.tiebreaker_rules].sort(
    (a, b) => a.priority - b.priority
  );

  return (
    <div className="space-y-4">
      {/* Card 1: Tier Thresholds */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Tier Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-bg-secondary">
                <TableHead className="py-2 pl-4 text-[11px]">CRS Range</TableHead>
                <TableHead className="py-2 text-[11px]">Tier</TableHead>
                <TableHead className="py-2 pr-4 text-[11px]">Prerequisites</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.tier_thresholds.map((t) => {
                const tier = getTier(t.tier);
                return (
                  <TableRow key={t.tier}>
                    <TableCell className="py-2 pl-4 text-xs tabular-nums">
                      {t.crs_min}–{t.crs_max}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge
                        variant="outline"
                        className="text-[11px] font-medium"
                        style={{
                          borderColor: tier.colorVar,
                          color: tier.colorVar,
                        }}
                      >
                        {getTier(t.tier).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 pr-4 text-xs text-text-muted">
                      {t.prereq || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Card 2: Tie-Breaking Rules */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Tie-Breaking Rules</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-bg-secondary">
                <TableHead className="py-2 pl-4 text-[11px]">Priority</TableHead>
                <TableHead className="py-2 text-[11px]">Rule</TableHead>
                <TableHead className="py-2 pr-4 text-[11px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTiebreakers.map((rule) => (
                <TableRow key={rule.priority}>
                  <TableCell className="py-2 pl-4 text-xs tabular-nums font-medium">
                    {rule.priority}
                  </TableCell>
                  <TableCell className="py-2 text-xs">{rule.rule}</TableCell>
                  <TableCell className="py-2 pr-4 text-xs text-text-muted">
                    {rule.action}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
