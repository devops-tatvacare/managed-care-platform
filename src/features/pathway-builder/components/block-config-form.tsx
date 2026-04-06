"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import type { ConfigFieldDefinition } from "@/config/block-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BlockConfigFormProps {
  configFields: ConfigFieldDefinition[];
  initialConfig: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

// ---------------------------------------------------------------------------
// Field renderers
// ---------------------------------------------------------------------------

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

function TextField({
  field,
  value,
  onValueChange,
}: {
  field: ConfigFieldDefinition;
  value: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <Input
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder={field.placeholder}
    />
  );
}

function NumberField({
  field,
  value,
  onValueChange,
}: {
  field: ConfigFieldDefinition;
  value: number | string;
  onValueChange: (v: number | string) => void;
}) {
  return (
    <Input
      type="number"
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        onValueChange(raw === "" ? "" : Number(raw));
      }}
      placeholder={field.placeholder}
    />
  );
}

function SelectField({
  field,
  value,
  onValueChange,
}: {
  field: ConfigFieldDefinition;
  value: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <Select value={value || ""} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={field.placeholder ?? "Select..."} />
      </SelectTrigger>
      <SelectContent>
        {field.options?.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ToggleField({
  value,
  onValueChange,
}: {
  field: ConfigFieldDefinition;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <Switch
      checked={!!value}
      onCheckedChange={onValueChange}
    />
  );
}

function TextareaField({
  field,
  value,
  onValueChange,
}: {
  field: ConfigFieldDefinition;
  value: string;
  onValueChange: (v: string) => void;
}) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder={field.placeholder}
      rows={3}
    />
  );
}

function MultiselectField({
  field,
  value,
  onValueChange,
}: {
  field: ConfigFieldDefinition;
  value: string[];
  onValueChange: (v: string[]) => void;
}) {
  const selected = Array.isArray(value) ? value : [];

  function toggle(optValue: string) {
    if (selected.includes(optValue)) {
      onValueChange(selected.filter((v) => v !== optValue));
    } else {
      onValueChange([...selected, optValue]);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {field.options?.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={selected.includes(opt.value)}
            onCheckedChange={() => toggle(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

function ListField({
  value,
  onValueChange,
}: {
  field: ConfigFieldDefinition;
  value: string[];
  onValueChange: (v: string[]) => void;
}) {
  const items = Array.isArray(value) ? value : [];

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-1.5">
          <Input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onValueChange(next);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-destructive"
            onClick={() => onValueChange(items.filter((_, idx) => idx !== i))}
          >
            <Icons.close />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="w-fit"
        onClick={() => onValueChange([...items, ""])}
      >
        <Icons.plus className="size-3" />
        Add item
      </Button>
    </div>
  );
}

function JsonField({
  value,
  onValueChange,
}: {
  field: ConfigFieldDefinition;
  value: unknown;
  onValueChange: (v: unknown) => void;
}) {
  const [raw, setRaw] = useState(() =>
    typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2)
  );
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Textarea
        className={cn("font-mono text-xs", error && "border-destructive")}
        value={raw}
        rows={5}
        onChange={(e) => {
          setRaw(e.target.value);
          try {
            const parsed = JSON.parse(e.target.value);
            setError(null);
            onValueChange(parsed);
          } catch {
            setError("Invalid JSON");
          }
        }}
      />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BlockConfigForm({
  configFields,
  initialConfig,
  onChange,
}: BlockConfigFormProps) {
  const [config, setConfig] = useState<Record<string, unknown>>(initialConfig);
  const [jsonOpen, setJsonOpen] = useState(false);

  // Reset when a different block is selected
  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  const updateField = useCallback(
    (key: string, value: unknown) => {
      setConfig((prev) => {
        const next = { ...prev, [key]: value };
        onChange(next);
        return next;
      });
    },
    [onChange]
  );

  const hasFields = configFields.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Typed config fields */}
      {hasFields ? (
        configFields.map((field) => {
          const val = config[field.key] ?? field.defaultValue ?? "";
          return (
            <div key={field.key} className="flex flex-col gap-1.5">
              <FieldLabel label={field.label} required={field.required} />
              {field.type === "text" && (
                <TextField
                  field={field}
                  value={String(val)}
                  onValueChange={(v) => updateField(field.key, v)}
                />
              )}
              {field.type === "number" && (
                <NumberField
                  field={field}
                  value={val as number | string}
                  onValueChange={(v) => updateField(field.key, v)}
                />
              )}
              {field.type === "select" && (
                <SelectField
                  field={field}
                  value={String(val)}
                  onValueChange={(v) => updateField(field.key, v)}
                />
              )}
              {field.type === "toggle" && (
                <ToggleField
                  field={field}
                  value={val as boolean}
                  onValueChange={(v) => updateField(field.key, v)}
                />
              )}
              {field.type === "textarea" && (
                <TextareaField
                  field={field}
                  value={String(val)}
                  onValueChange={(v) => updateField(field.key, v)}
                />
              )}
              {field.type === "multiselect" && (
                <MultiselectField
                  field={field}
                  value={val as string[]}
                  onValueChange={(v) => updateField(field.key, v)}
                />
              )}
              {field.type === "list" && (
                <ListField
                  field={field}
                  value={val as string[]}
                  onValueChange={(v) => updateField(field.key, v)}
                />
              )}
              {field.type === "json" && (
                <JsonField
                  field={field}
                  value={val}
                  onValueChange={(v) => updateField(field.key, v)}
                />
              )}
            </div>
          );
        })
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            Configuration form coming soon.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Use JSON editor below.
          </p>
        </div>
      )}

      {/* Collapsible raw JSON editor */}
      <Collapsible open={jsonOpen} onOpenChange={setJsonOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {jsonOpen ? (
              <Icons.chevronDown className="size-3" />
            ) : (
              <Icons.chevronRight className="size-3" />
            )}
            Raw JSON
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <JsonField
            field={{ key: "__raw", label: "Raw JSON", type: "json" }}
            value={config}
            onValueChange={(v) => {
              if (typeof v === "object" && v !== null && !Array.isArray(v)) {
                const next = v as Record<string, unknown>;
                setConfig(next);
                onChange(next);
              }
            }}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
