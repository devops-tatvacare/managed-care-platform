"use client";

import { useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FilterFieldOption {
  label: string;
  value: string;
}

interface FilterFieldBase {
  key: string;
  label: string;
}

interface TextFilterField extends FilterFieldBase {
  type: "text";
  placeholder?: string;
}

interface SelectFilterField extends FilterFieldBase {
  type: "select";
  options: FilterFieldOption[];
  placeholder?: string;
}

export type FilterField = TextFilterField | SelectFilterField;

export interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  fields: FilterField[];
  values: Record<string, string | undefined>;
  onApply: (values: Record<string, string | undefined>) => void;
  onReset: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ALL_VALUE = "__all__";

export function FilterSheet({
  open,
  onOpenChange,
  title = "Filters",
  description,
  fields,
  values,
  onApply,
  onReset,
}: FilterSheetProps) {
  const [draft, setDraft] = useState<Record<string, string | undefined>>(values);

  // Sync draft when sheet opens
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) setDraft(values);
      onOpenChange(next);
    },
    [values, onOpenChange],
  );

  const updateField = useCallback((key: string, value: string | undefined) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleApply = useCallback(() => {
    onApply(draft);
    onOpenChange(false);
  }, [draft, onApply, onOpenChange]);

  const handleReset = useCallback(() => {
    onReset();
    onOpenChange(false);
  }, [onReset, onOpenChange]);

  const activeCount = Object.values(values).filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-5">
          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">
                {field.label}
              </span>

              {field.type === "text" && (
                <Input
                  value={draft[field.key] ?? ""}
                  onChange={(e) => updateField(field.key, e.target.value || undefined)}
                  placeholder={field.placeholder}
                />
              )}

              {field.type === "select" && (
                <Select
                  value={draft[field.key] ?? ALL_VALUE}
                  onValueChange={(v) => updateField(field.key, v === ALL_VALUE ? undefined : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={field.placeholder ?? "All"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All</SelectItem>
                    {field.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>

        <SheetFooter className="flex-row gap-2 border-t pt-4">
          <Button variant="outline" className="flex-1" onClick={handleReset}>
            Reset{activeCount > 0 ? ` (${activeCount})` : ""}
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
