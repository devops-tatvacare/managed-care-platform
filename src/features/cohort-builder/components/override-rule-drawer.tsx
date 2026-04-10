"use client";

import { useEffect, useState } from "react";
import type { TiebreakerRule } from "@/services/types/program";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

interface OverrideRuleDrawerProps {
  rule: TiebreakerRule | null;
  open: boolean;
  onClose: () => void;
  onSave: (rule: TiebreakerRule) => void;
  onDelete?: () => void;
}

const ACTION_OPTIONS = [
  { value: "override_cohort", label: "Override Cohort" },
  { value: "boost_score", label: "Boost Score" },
  { value: "cap_score", label: "Cap Score" },
  { value: "flag_review", label: "Flag for Review" },
] as const;

export function OverrideRuleDrawer({
  rule,
  open,
  onClose,
  onSave,
  onDelete,
}: OverrideRuleDrawerProps) {
  const [priority, setPriority] = useState(1);
  const [name, setName] = useState("");
  const [action, setAction] = useState("override_cohort");

  useEffect(() => {
    if (rule) {
      setPriority(rule.priority);
      setName(rule.rule);
      setAction(rule.action);
    } else {
      setPriority(1);
      setName("");
      setAction("override_cohort");
    }
  }, [rule, open]);

  const handleSave = () => {
    onSave({
      priority,
      rule: name,
      action,
      condition: rule?.condition ?? {},
    });
  };

  const isEditing = rule !== null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Rule" : "Add Rule"}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-4 px-4">
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">
              Priority
            </span>
            <Input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">
              Rule Name
            </span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. DKA → Tier 4"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">
              Action
            </span>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="flex-row justify-between">
          <div>
            {onDelete && (
              <Button variant="destructive" size="sm" onClick={onDelete}>
                Delete
              </Button>
            )}
          </div>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
