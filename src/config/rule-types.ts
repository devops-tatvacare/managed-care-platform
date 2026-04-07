import type { LucideIcon } from "lucide-react";
import { Icons } from "@/config/icons";

export interface RuleTypeDefinition {
  type: string;
  label: string;
  icon: LucideIcon;
  description: string;
  defaultConfig: Record<string, unknown>;
}

export const RULE_TYPES: RuleTypeDefinition[] = [
  {
    type: "diagnosis",
    label: "Diagnosis Code",
    icon: Icons.diagnosis,
    description: "Match ICD-10 codes by prefix or exact match",
    defaultConfig: { icd10_codes: [], match_type: "prefix", include: true },
  },
  {
    type: "lab",
    label: "Lab Threshold",
    icon: Icons.lab,
    description: "Check lab value against a threshold",
    defaultConfig: { test_type: "", operator: "gte", value: 0 },
  },
  {
    type: "demographics",
    label: "Demographics",
    icon: Icons.demographics,
    description: "Age, BMI, gender criteria",
    defaultConfig: { bmi_threshold: null, bmi_operator: "gte" },
  },
  {
    type: "pharmacy",
    label: "Pharmacy / Adherence",
    icon: Icons.pharmacy,
    description: "PDC threshold check",
    defaultConfig: { pdc_threshold: 0.8, pdc_operator: "gte" },
  },
  {
    type: "utilisation",
    label: "Utilisation Event",
    icon: Icons.utilisation,
    description: "ER visits, hospitalisations, DKA",
    defaultConfig: { event_type: "er_visit", count_threshold: 1 },
  },
  {
    type: "sdoh",
    label: "SDOH Flag",
    icon: Icons.sdoh,
    description: "Social determinants of health",
    defaultConfig: { domain: null, count_threshold: 1 },
  },
  {
    type: "exclusion",
    label: "Exclusion Rule",
    icon: Icons.exclusion,
    description: "Exclude patients matching these codes",
    defaultConfig: { icd10_codes: [] },
  },
];

export function getRuleType(type: string): RuleTypeDefinition | undefined {
  return RULE_TYPES.find((r) => r.type === type);
}
