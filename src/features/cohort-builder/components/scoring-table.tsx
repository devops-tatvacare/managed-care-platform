"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import type { ScoringComponentConfig } from "@/services/types/program";
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { ScoringComponentDrawer } from "./scoring-component-drawer";

function formatDataSource(ds: string): string {
  return ds
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ScoringTable() {
  const { program, saveEngine } = useCohortBuilderStore();
  const engine = program?.scoring_engine;

  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  if (!engine) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default py-16 text-center">
        <Icons.compositeScore className="mb-3 h-8 w-8 text-text-placeholder" />
        <p className="text-sm font-medium text-text-primary">No scoring engine configured</p>
        <p className="mb-4 mt-1 text-xs text-text-secondary">
          Enable a scoring engine to assign risk scores to members.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            saveEngine({
              components: [],
              tiebreaker_rules: [],
              aggregation_method: "weighted_sum",
            })
          }
        >
          <Icons.plus className="mr-1.5 h-3.5 w-3.5" />
          Enable Scoring Engine
        </Button>
      </div>
    );
  }

  const components = engine.components ?? [];
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);

  const handleAddComponent = async () => {
    const newComponent: ScoringComponentConfig = {
      name: `component_${components.length + 1}`,
      data_source: "lab_range",
      weight: 0,
      cap: 100,
      scoring_table: [],
    };
    const updated = [...components, newComponent];
    await saveEngine({
      components: updated,
      tiebreaker_rules: engine.tiebreaker_rules,
      aggregation_method: engine.aggregation_method,
    });
    setEditingIdx(updated.length - 1);
  };

  const handleSave = async (updated: ScoringComponentConfig) => {
    if (editingIdx === null) return;
    const updatedComponents = [...components];
    updatedComponents[editingIdx] = updated;
    await saveEngine({
      components: updatedComponents,
      tiebreaker_rules: engine.tiebreaker_rules,
      aggregation_method: engine.aggregation_method,
    });
    toast.success("Component saved");
    setEditingIdx(null);
  };

  const handleDelete = async () => {
    if (editingIdx === null) return;
    const updatedComponents = components.filter((_, i) => i !== editingIdx);
    await saveEngine({
      components: updatedComponents,
      tiebreaker_rules: engine.tiebreaker_rules,
      aggregation_method: engine.aggregation_method,
    });
    toast.success("Component removed");
    setEditingIdx(null);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Scoring Engine</h2>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-text-secondary">
            <span>Composite risk score components. Weights must total 100%.</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                totalWeight === 100
                  ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300"
                  : "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
              )}
            >
              {totalWeight}% / 100%
            </Badge>
          </p>
        </div>
        <Button size="sm" onClick={handleAddComponent}>
          <Icons.plus className="mr-1.5 h-3.5 w-3.5" />
          Add Component
        </Button>
      </div>

      {components.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default py-16 text-center">
          <Icons.compositeScore className="mb-3 h-8 w-8 text-text-placeholder" />
          <p className="text-sm font-medium text-text-primary">No components defined</p>
          <p className="mt-1 text-xs text-text-secondary">
            Add weighted components to calculate member risk scores.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead>Data Source</TableHead>
                <TableHead className="text-right">Weight %</TableHead>
                <TableHead className="text-right">Cap</TableHead>
                <TableHead className="text-right">Rules</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((comp, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <span className="text-sm font-medium text-text-primary">
                      {comp.label || comp.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-secondary">
                      {formatDataSource(comp.data_source)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="tabular-nums text-sm text-text-secondary">{comp.weight}%</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="tabular-nums text-sm text-text-secondary">{comp.cap}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="tabular-nums text-sm text-text-secondary">
                      {comp.scoring_table.length}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setEditingIdx(index)}
                      className="text-text-muted"
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ScoringComponentDrawer
        component={editingIdx !== null ? components[editingIdx] : null}
        open={editingIdx !== null}
        onClose={() => setEditingIdx(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  );
}
