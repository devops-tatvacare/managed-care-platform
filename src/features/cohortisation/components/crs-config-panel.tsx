"use client";

import { useState } from "react";
import { ChevronRight, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import type { CRSComponent } from "@/services/types/cohort";

export function CRSConfigPanel() {
  const { config, configLoading, saveConfig } = useCohortisationStore();
  const [editedComponents, setEditedComponents] = useState<CRSComponent[] | null>(null);
  const [openComponents, setOpenComponents] = useState<Set<string>>(new Set());

  const components = editedComponents ?? config?.components ?? [];
  const totalWeight = Math.round(components.reduce((sum, c) => sum + c.weight * 100, 0));
  const isWeightValid = totalWeight === 100;
  const isDirty = editedComponents !== null;

  function toggleOpen(name: string) {
    setOpenComponents((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function handleWeightChange(index: number, value: number[]) {
    const base = editedComponents ?? config?.components ?? [];
    const updated = base.map((c, i) =>
      i === index ? { ...c, weight: value[0] / 100 } : c
    );
    setEditedComponents(updated);
  }

  async function handleSave() {
    if (!editedComponents) return;
    await saveConfig({ components: editedComponents });
    setEditedComponents(null);
  }

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">CRS Formula Components</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-text-muted">No config loaded.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold">CRS Formula Components</CardTitle>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-xs tabular-nums",
              isWeightValid
                ? "border-status-success text-status-success"
                : "border-status-error text-status-error"
            )}
          >
            {totalWeight}%
          </Badge>
          {isDirty && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs"
              disabled={configLoading}
              onClick={handleSave}
            >
              <Save className="size-3" />
              Save
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-1 px-4 pb-4">
        {components.map((component, index) => {
          const isOpen = openComponents.has(component.name);
          const weightPct = Math.round(component.weight * 100);

          return (
            <Collapsible
              key={component.name}
              open={isOpen}
              onOpenChange={() => toggleOpen(component.name)}
            >
              <CollapsibleTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-bg-hover">
                  <div className="flex items-center gap-2 min-w-0">
                    <ChevronRight
                      className={cn(
                        "size-3.5 shrink-0 text-text-muted transition-transform duration-150",
                        isOpen && "rotate-90"
                      )}
                    />
                    <span className="text-xs font-medium text-text-primary truncate">
                      {component.label ?? component.name}
                    </span>
                  </div>
                  <span className="ml-3 text-xs tabular-nums text-text-muted shrink-0">
                    {weightPct}%
                  </span>
                </button>
              </CollapsibleTrigger>

              <div className="px-3 pb-2">
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[weightPct]}
                  onValueChange={(val) => handleWeightChange(index, val)}
                  className="mt-1"
                />
              </div>

              <CollapsibleContent>
                <div className="mx-3 mb-3 rounded-md border border-border-subtle overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-bg-secondary">
                        <TableHead className="py-1.5 text-[11px]">Criterion</TableHead>
                        <TableHead className="py-1.5 text-[11px] text-right">Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {component.scoring_table.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-1.5 text-xs">{row.criterion}</TableCell>
                          <TableCell className="py-1.5 text-xs tabular-nums text-right">
                            {row.points}
                          </TableCell>
                        </TableRow>
                      ))}
                      {component.bonus_table?.map((row, i) => (
                        <TableRow key={`bonus-${i}`} className="text-text-muted">
                          <TableCell className="py-1.5 text-xs italic">{row.criterion}</TableCell>
                          <TableCell className="py-1.5 text-xs tabular-nums text-right italic">
                            +{row.points}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="border-t border-border-subtle px-3 py-1.5">
                    <span className="text-[11px] text-text-muted">
                      Cap: {component.cap} points
                    </span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
