"use client";

import { useState } from "react";
import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import type { TiebreakerRule } from "@/services/types/program";
import { Icons } from "@/config/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function OverrideRulesPanel() {
  const { program, saveEngine } = useCohortBuilderStore();
  const engine = program?.scoring_engine;
  const rules = engine?.tiebreaker_rules ?? [];

  const [editingRule, setEditingRule] = useState<TiebreakerRule | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!engine) {
    return (
      <EmptyState
        icon={Icons.override}
        title="No scoring engine"
        description="Enable a scoring engine first to configure override rules."
      />
    );
  }

  const saveRules = async (updated: TiebreakerRule[]) => {
    await saveEngine({
      components: engine.components,
      tiebreaker_rules: updated,
      aggregation_method: engine.aggregation_method,
    });
  };

  const handleAdd = () => {
    setEditingRule({ priority: rules.length + 1, rule: "", action: "override_cohort", condition: {} });
    setEditingIndex(null);
    setDialogOpen(true);
  };

  const handleEdit = (index: number) => {
    setEditingRule({ ...rules[index] });
    setEditingIndex(index);
    setDialogOpen(true);
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;
    const updated = [...rules];
    if (editingIndex !== null) {
      updated[editingIndex] = editingRule;
    } else {
      updated.push(editingRule);
    }
    await saveRules(updated);
    setDialogOpen(false);
    setEditingRule(null);
  };

  const handleDelete = async (index: number) => {
    await saveRules(rules.filter((_, i) => i !== index));
  };

  return (
    <>
      {rules.length === 0 ? (
        <EmptyState
          icon={Icons.override}
          title="No override rules"
          description="Add tiebreaker rules to handle edge cases in cohort assignment."
          action={
            <Button onClick={handleAdd}>
              <Icons.plus className="mr-1.5 h-4 w-4" />
              Add Rule
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-muted">{rules.length} override rule{rules.length !== 1 ? "s" : ""}</span>
            <Button variant="outline" size="sm" onClick={handleAdd}>
              <Icons.plus className="mr-1.5 h-3.5 w-3.5" />
              Add Rule
            </Button>
          </div>

          <div className="rounded-lg border border-border-default">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-xs">Priority</TableHead>
                  <TableHead className="text-xs">Rule</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm tabular-nums">{rule.priority}</TableCell>
                    <TableCell className="text-sm text-text-primary">{rule.rule}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{rule.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => handleEdit(i)} className="text-text-muted">
                          <Icons.config className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(i)} className="text-text-placeholder hover:text-status-error">
                          <Icons.close className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? "Edit Rule" : "Add Rule"}</DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-muted">Priority</label>
                <Input
                  type="number"
                  value={editingRule.priority}
                  onChange={(e) => setEditingRule({ ...editingRule, priority: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-muted">Rule Name</label>
                <Input
                  value={editingRule.rule}
                  onChange={(e) => setEditingRule({ ...editingRule, rule: e.target.value })}
                  placeholder="e.g. Hospitalisation override"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-muted">Action</label>
                <Select
                  value={editingRule.action}
                  onValueChange={(v) => setEditingRule({ ...editingRule, action: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="override_cohort">Override Cohort</SelectItem>
                    <SelectItem value="boost_score">Boost Score</SelectItem>
                    <SelectItem value="cap_score">Cap Score</SelectItem>
                    <SelectItem value="flag_review">Flag for Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRule}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
