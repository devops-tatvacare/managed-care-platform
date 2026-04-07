"use client";

import { useState } from "react";
import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import type { ScoringComponentConfig } from "@/services/types/program";
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ScoringComponentDrawer } from "./scoring-component-drawer";

export function ScoringEnginePanel() {
  const { program, saveEngine } = useCohortBuilderStore();
  const engine = program?.scoring_engine;

  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  if (!engine) {
    return (
      <EmptyState
        icon={Icons.compositeScore}
        title="No scoring engine configured"
        description="Enable a scoring engine to assign risk scores to members."
        action={
          <Button
            onClick={() => saveEngine({ components: [], aggregation_method: "weighted_sum" })}
          >
            <Icons.plus className="mr-1.5 h-4 w-4" />
            Enable Scoring Engine
          </Button>
        }
      />
    );
  }

  const components = engine.components ?? [];
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);

  const handleSave = async (updated: ScoringComponentConfig[]) => {
    await saveEngine({
      components: updated,
      tiebreaker_rules: engine.tiebreaker_rules,
      aggregation_method: engine.aggregation_method,
    });
  };

  const handleAddComponent = () => {
    const newComponent: ScoringComponentConfig = {
      name: `component_${components.length + 1}`,
      label: "New Component",
      data_source: "lab_range",
      weight: 0,
      cap: 100,
      scoring_table: [],
    };
    const updated = [...components, newComponent];
    handleSave(updated);
  };

  const handleUpdateComponent = (index: number, component: ScoringComponentConfig) => {
    const updated = [...components];
    updated[index] = component;
    handleSave(updated);
    setEditingIndex(null);
  };

  const handleDeleteComponent = (index: number) => {
    const updated = components.filter((_, i) => i !== index);
    handleSave(updated);
    setEditingIndex(null);
  };

  return (
    <>
      {/* Weight summary */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs font-medium text-text-muted">Total Weight:</span>
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            totalWeight === 100
              ? "border-green-300 bg-green-50 text-green-700"
              : "border-red-300 bg-red-50 text-red-700"
          )}
        >
          {totalWeight}%
        </Badge>
        <span className="text-xs text-text-muted">
          ({components.length} component{components.length !== 1 ? "s" : ""})
        </span>
      </div>

      {/* Component cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {components.map((comp, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">
                  {comp.label || comp.name}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setEditingIndex(index)}
                  className="text-text-muted"
                >
                  Edit
                </Button>
              </div>
              <p className="mt-1 text-xs text-text-muted">{comp.data_source}</p>
              <div className="mt-3 flex items-center gap-3">
                {/* Weight bar */}
                <div className="flex-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand-primary"
                      style={{ width: `${Math.min(comp.weight, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-medium text-text-primary">{comp.weight}%</span>
              </div>
              <div className="mt-2 flex gap-3 text-xs text-text-muted">
                <span>{comp.scoring_table.length} rules</span>
                <span>Cap: {comp.cap}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add Component Card */}
        <Card
          className="cursor-pointer border-dashed transition-colors hover:border-brand-primary hover:bg-bg-hover"
          onClick={handleAddComponent}
        >
          <CardContent className="flex flex-col items-center justify-center p-4 py-8">
            <Icons.plus className="h-6 w-6 text-text-placeholder" />
            <span className="mt-2 text-sm text-text-muted">Add Component</span>
          </CardContent>
        </Card>
      </div>

      {/* Drawer for editing */}
      <ScoringComponentDrawer
        component={editingIndex !== null ? components[editingIndex] : null}
        open={editingIndex !== null}
        onClose={() => setEditingIndex(null)}
        onSave={(component) => {
          if (editingIndex !== null) handleUpdateComponent(editingIndex, component);
        }}
        onDelete={() => {
          if (editingIndex !== null) handleDeleteComponent(editingIndex);
        }}
      />
    </>
  );
}
