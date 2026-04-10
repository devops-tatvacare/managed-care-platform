"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import type { TiebreakerRule } from "@/services/types/program";
import { Icons } from "@/config/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfigSectionHeader } from "./config-section-header";
import { OverrideRuleDrawer } from "./override-rule-drawer";

const ACTION_BADGE: Record<string, string> = {
  override_cohort: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
  boost_score: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300",
  cap_score: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300",
  flag_review: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
};

const ACTION_LABELS: Record<string, string> = {
  override_cohort: "Override Cohort",
  boost_score: "Boost Score",
  cap_score: "Cap Score",
  flag_review: "Flag for Review",
};

export function OverrideRulesTable() {
  const { program, saveEngine } = useCohortBuilderStore();
  const engine = program?.scoring_engine;
  const rules = engine?.tiebreaker_rules ?? [];

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const saveRules = async (updated: TiebreakerRule[]) => {
    await saveEngine({
      components: engine!.components,
      tiebreaker_rules: updated,
      aggregation_method: engine!.aggregation_method,
    });
  };

  const handleAdd = () => {
    setEditingIdx(null);
    setDrawerOpen(true);
  };

  const handleEdit = (idx: number) => {
    setEditingIdx(idx);
    setDrawerOpen(true);
  };

  const handleSave = async (rule: TiebreakerRule) => {
    const updated = [...rules];
    if (editingIdx !== null) {
      updated[editingIdx] = rule;
    } else {
      updated.push(rule);
    }
    await saveRules(updated);
    toast.success(editingIdx !== null ? "Rule updated." : "Rule added.");
    setDrawerOpen(false);
  };

  const handleDelete = async () => {
    if (editingIdx === null) return;
    await saveRules(rules.filter((_, i) => i !== editingIdx));
    toast.success("Rule deleted.");
    setDrawerOpen(false);
  };

  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  const drawerRule = editingIdx !== null ? rules[editingIdx] ?? null : null;

  return (
    <>
      <div className="space-y-4">
        <ConfigSectionHeader
          title="Override Rules"
          description="Tiebreaker rules applied in priority order after scoring."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdd}
              disabled={!engine}
            >
              <Icons.plus className="mr-1.5 h-3.5 w-3.5" />
              Add Rule
            </Button>
          }
        />

        {!engine ? (
          <p className="text-sm text-text-muted">
            Enable scoring engine first to define override rules.
          </p>
        ) : sortedRules.length === 0 ? (
          <EmptyState
            icon={Icons.override}
            title="No override rules"
            description="Add tiebreaker rules to handle edge cases in cohort assignment."
          />
        ) : (
          <div className="rounded-lg border border-border-default">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-xs">Priority</TableHead>
                  <TableHead className="text-xs">Rule</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRules.map((rule, i) => {
                  const originalIdx = rules.indexOf(rule);
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-sm tabular-nums">
                        {rule.priority}
                      </TableCell>
                      <TableCell className="text-sm text-text-primary">
                        {rule.rule}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${ACTION_BADGE[rule.action] ?? ""}`}
                        >
                          {ACTION_LABELS[rule.action] ?? rule.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleEdit(originalIdx)}
                          className="text-text-muted"
                        >
                          <Icons.config className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <OverrideRuleDrawer
        rule={drawerRule}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
        onDelete={editingIdx !== null ? handleDelete : undefined}
      />
    </>
  );
}
