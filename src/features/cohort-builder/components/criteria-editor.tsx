"use client";

import { useState } from "react";
import type { CriteriaNode } from "@/services/types/program";
import { RULE_TYPES, getRuleType } from "@/config/rule-types";
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CriteriaRuleForm } from "./criteria-rule-form";

interface CriteriaEditorProps {
  criteria: CriteriaNode[];
  onChange: (criteria: CriteriaNode[]) => void;
}

export function CriteriaEditor({ criteria, onChange }: CriteriaEditorProps) {
  // If empty, show a single AND group to start
  if (criteria.length === 0) {
    return (
      <div className="space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange([{ group_operator: "AND", children: [] }])}
        >
          <Icons.plus className="mr-1.5 h-3.5 w-3.5" />
          Add Criteria Group
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {criteria.map((node, index) => (
        <CriteriaNodeView
          key={index}
          node={node}
          onChange={(updated) => {
            const next = [...criteria];
            next[index] = updated;
            onChange(next);
          }}
          onDelete={() => {
            onChange(criteria.filter((_, i) => i !== index));
          }}
          depth={0}
        />
      ))}
    </div>
  );
}

// ── Recursive Node Renderer ────────────────────────────────────────────

interface CriteriaNodeViewProps {
  node: CriteriaNode;
  onChange: (node: CriteriaNode) => void;
  onDelete: () => void;
  depth: number;
}

function CriteriaNodeView({ node, onChange, onDelete, depth }: CriteriaNodeViewProps) {
  const [expandedRule, setExpandedRule] = useState<number | null>(null);

  // Group node
  if (node.group_operator) {
    const children = node.children ?? [];
    const operator = node.group_operator;

    const toggleOperator = () => {
      onChange({ ...node, group_operator: operator === "AND" ? "OR" : "AND" });
    };

    const addRule = (ruleType: string) => {
      const ruleDef = getRuleType(ruleType);
      if (!ruleDef) return;
      const newChild: CriteriaNode = {
        rule_type: ruleType,
        config: { ...ruleDef.defaultConfig },
      };
      onChange({ ...node, children: [...children, newChild] });
    };

    const addGroup = () => {
      const newChild: CriteriaNode = { group_operator: "AND", children: [] };
      onChange({ ...node, children: [...children, newChild] });
    };

    const updateChild = (index: number, updated: CriteriaNode) => {
      const next = [...children];
      next[index] = updated;
      onChange({ ...node, children: next });
    };

    const deleteChild = (index: number) => {
      onChange({ ...node, children: children.filter((_, i) => i !== index) });
    };

    return (
      <Card className={cn("p-3", depth > 0 && "ml-4 border-dashed")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={toggleOperator}
              className="text-xs font-bold"
            >
              {operator}
            </Button>
            <span className="text-xs text-text-muted">
              {children.length} rule{children.length !== 1 ? "s" : ""}
            </span>
          </div>
          {depth > 0 && (
            <Button variant="ghost" size="icon-xs" onClick={onDelete} className="text-text-placeholder hover:text-status-error">
              <Icons.close className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="mt-2 space-y-2">
          {children.map((child, i) => (
            <div key={i}>
              {i > 0 && (
                <div className="flex items-center gap-2 py-1">
                  <div className="h-px flex-1 bg-border-default" />
                  <span className="text-[10px] font-medium text-text-placeholder">{operator}</span>
                  <div className="h-px flex-1 bg-border-default" />
                </div>
              )}
              {child.group_operator ? (
                <CriteriaNodeView
                  node={child}
                  onChange={(updated) => updateChild(i, updated)}
                  onDelete={() => deleteChild(i)}
                  depth={depth + 1}
                />
              ) : (
                <LeafRule
                  node={child}
                  expanded={expandedRule === i}
                  onToggle={() => setExpandedRule(expandedRule === i ? null : i)}
                  onChange={(updated) => updateChild(i, updated)}
                  onDelete={() => deleteChild(i)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Add buttons */}
        <div className="mt-3 flex items-center gap-2">
          <Select onValueChange={addRule}>
            <SelectTrigger className="h-7 w-auto gap-1.5 text-xs">
              <Icons.plus className="h-3 w-3" />
              <SelectValue placeholder="Add Rule" />
            </SelectTrigger>
            <SelectContent>
              {RULE_TYPES.map((rt) => {
                const Icon = rt.icon;
                return (
                  <SelectItem key={rt.type} value={rt.type}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {rt.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="xs" onClick={addGroup} className="text-text-muted">
            <Icons.plus className="mr-1 h-3 w-3" />
            Add Group
          </Button>
        </div>
      </Card>
    );
  }

  // Leaf node at top level — shouldn't happen but handle gracefully
  return (
    <LeafRule
      node={node}
      expanded={false}
      onToggle={() => {}}
      onChange={onChange}
      onDelete={onDelete}
    />
  );
}

// ── Leaf Rule ──────────────────────────────────────────────────────────

interface LeafRuleProps {
  node: CriteriaNode;
  expanded: boolean;
  onToggle: () => void;
  onChange: (node: CriteriaNode) => void;
  onDelete: () => void;
}

function LeafRule({ node, expanded, onToggle, onChange, onDelete }: LeafRuleProps) {
  const ruleDef = getRuleType(node.rule_type ?? "");
  const Icon = ruleDef?.icon ?? Icons.config;
  const label = ruleDef?.label ?? node.rule_type ?? "Unknown";

  const configSummary = getConfigSummary(node);

  return (
    <div className="rounded-lg border border-border-default bg-bg-primary">
      <div
        className="flex cursor-pointer items-center gap-2.5 px-3 py-2"
        onClick={onToggle}
      >
        <Icon className="h-4 w-4 shrink-0 text-text-muted" />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-text-primary">{label}</span>
          {configSummary && (
            <span className="ml-2 text-xs text-text-muted">{configSummary}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 text-text-placeholder hover:text-status-error"
        >
          <Icons.close className="h-3 w-3" />
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-border-default p-3">
          <CriteriaRuleForm
            ruleType={node.rule_type ?? ""}
            config={node.config ?? {}}
            onChange={(config) => onChange({ ...node, config })}
          />
        </div>
      )}
    </div>
  );
}

function getConfigSummary(node: CriteriaNode): string {
  const config = node.config ?? {};
  switch (node.rule_type) {
    case "diagnosis": {
      const codes = config.icd10_codes as string[] | undefined;
      return codes?.length ? codes.join(", ") : "";
    }
    case "lab":
      return config.test_type ? `${config.test_type} ${config.operator} ${config.value}` : "";
    case "demographics":
      return config.bmi_threshold != null ? `BMI ${config.bmi_operator} ${config.bmi_threshold}` : "";
    case "pharmacy":
      return `PDC ${config.pdc_operator} ${config.pdc_threshold}`;
    case "utilisation":
      return `${config.event_type} >= ${config.count_threshold}`;
    case "sdoh":
      return config.domain ? `${config.domain}` : "";
    case "exclusion": {
      const codes = config.icd10_codes as string[] | undefined;
      return codes?.length ? `Exclude: ${codes.join(", ")}` : "";
    }
    default:
      return "";
  }
}
