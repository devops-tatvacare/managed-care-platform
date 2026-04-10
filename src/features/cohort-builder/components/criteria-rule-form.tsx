"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface CriteriaRuleFormProps {
  ruleType: string;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export function CriteriaRuleForm({ ruleType, config, onChange }: CriteriaRuleFormProps) {
  const update = (key: string, value: unknown) => onChange({ ...config, [key]: value });

  switch (ruleType) {
    case "diagnosis":
      return <DiagnosisForm config={config} update={update} />;
    case "lab":
      return <LabForm config={config} update={update} />;
    case "demographics":
      return <DemographicsForm config={config} update={update} />;
    case "pharmacy":
      return <PharmacyForm config={config} update={update} />;
    case "utilisation":
      return <UtilisationForm config={config} update={update} />;
    default:
      return <FallbackForm config={config} onChange={onChange} />;
  }
}

// ── Diagnosis ──────────────────────────────────────────────────────────

function DiagnosisForm({ config, update }: { config: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  const codes = (config.icd10_codes as string[]) ?? [];
  const codesStr = codes.join(", ");

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">ICD-10 Codes (comma-separated)</span>
        <Input
          value={codesStr}
          onChange={(e) => update("icd10_codes", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
          placeholder="E11, E11.6, E13"
        />
      </div>
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">Match Type</span>
        <Select value={String(config.match_type ?? "prefix")} onValueChange={(v) => update("match_type", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="prefix">Prefix</SelectItem>
            <SelectItem value="exact">Exact</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={config.include !== false}
          onCheckedChange={(checked) => update("include", checked)}
        />
        <span className="text-xs text-text-muted">Include (uncheck to exclude)</span>
      </div>
    </div>
  );
}

// ── Lab ────────────────────────────────────────────────────────────────

function LabForm({ config, update }: { config: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">Test Type</span>
        <Select value={String(config.test_type ?? "")} onValueChange={(v) => update("test_type", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select test" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="HbA1c">HbA1c</SelectItem>
            <SelectItem value="eGFR">eGFR</SelectItem>
            <SelectItem value="BMI">BMI</SelectItem>
            <SelectItem value="LDL">LDL</SelectItem>
            <SelectItem value="BP_systolic">BP Systolic</SelectItem>
            <SelectItem value="uACR">uACR</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 space-y-1.5">
          <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">Operator</span>
          <Select value={String(config.operator ?? "gte")} onValueChange={(v) => update("operator", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gte">&gt;=</SelectItem>
              <SelectItem value="lte">&lt;=</SelectItem>
              <SelectItem value="gt">&gt;</SelectItem>
              <SelectItem value="lt">&lt;</SelectItem>
              <SelectItem value="eq">=</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">Value</span>
          <Input
            type="number"
            value={String(config.value ?? 0)}
            onChange={(e) => update("value", Number(e.target.value))}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}

// ── Demographics ───────────────────────────────────────────────────────

function DemographicsForm({ config, update }: { config: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 space-y-1.5">
          <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">BMI Operator</span>
          <Select value={String(config.bmi_operator ?? "gte")} onValueChange={(v) => update("bmi_operator", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gte">&gt;=</SelectItem>
              <SelectItem value="lte">&lt;=</SelectItem>
              <SelectItem value="gt">&gt;</SelectItem>
              <SelectItem value="lt">&lt;</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">BMI Threshold</span>
          <Input
            type="number"
            value={config.bmi_threshold != null ? String(config.bmi_threshold) : ""}
            onChange={(e) => update("bmi_threshold", e.target.value ? Number(e.target.value) : null)}
            className="h-8 text-xs"
            placeholder="e.g. 30"
          />
        </div>
      </div>
    </div>
  );
}

// ── Pharmacy ───────────────────────────────────────────────────────────

function PharmacyForm({ config, update }: { config: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 space-y-1.5">
          <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">PDC Operator</span>
          <Select value={String(config.pdc_operator ?? "gte")} onValueChange={(v) => update("pdc_operator", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gte">&gt;=</SelectItem>
              <SelectItem value="lte">&lt;=</SelectItem>
              <SelectItem value="lt">&lt;</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">PDC Threshold</span>
          <Input
            type="number"
            step="0.01"
            value={String(config.pdc_threshold ?? 0.8)}
            onChange={(e) => update("pdc_threshold", Number(e.target.value))}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}

// ── Utilisation ────────────────────────────────────────────────────────

function UtilisationForm({ config, update }: { config: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">Event Type</span>
        <Select value={String(config.event_type ?? "er_visit")} onValueChange={(v) => update("event_type", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="er_visit">ER Visit</SelectItem>
            <SelectItem value="hospitalisation">Hospitalisation</SelectItem>
            <SelectItem value="dka">DKA</SelectItem>
            <SelectItem value="readmission">Readmission</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">Count Threshold</span>
        <Input
          type="number"
          value={String(config.count_threshold ?? 1)}
          onChange={(e) => update("count_threshold", Number(e.target.value))}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

// ── Fallback (JSON editor) ─────────────────────────────────────────────

function FallbackForm({ config, onChange }: { config: Record<string, unknown>; onChange: (config: Record<string, unknown>) => void }) {
  const jsonStr = JSON.stringify(config, null, 2);

  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">Configuration (JSON)</span>
      <Textarea
        value={jsonStr}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            onChange(parsed);
          } catch {
            // invalid JSON — don't update
          }
        }}
        rows={4}
        className="font-mono text-xs"
      />
    </div>
  );
}
