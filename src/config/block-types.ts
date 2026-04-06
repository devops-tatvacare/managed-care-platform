import type { IconName } from "./icons";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BlockCategory = "eligibility" | "action" | "logic" | "escalation" | "schedule";

export interface CategoryDefinition {
  key: BlockCategory;
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  iconBgClass: string;
  icon: IconName;
}

export interface ConfigFieldDefinition {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "multiselect" | "toggle" | "textarea" | "json" | "list";
  options?: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: unknown;
}

export interface BlockTypeDefinition {
  type: string;
  category: BlockCategory;
  label: string;
  description: string;
  icon: IconName;
  configFields: ConfigFieldDefinition[];
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const BLOCK_CATEGORIES: CategoryDefinition[] = [
  { key: "eligibility", label: "Eligibility", colorClass: "text-green-700", bgClass: "bg-green-50", borderClass: "border-green-200", iconBgClass: "bg-green-600", icon: "completed" },
  { key: "action", label: "Actions", colorClass: "text-blue-700", bgClass: "bg-blue-50", borderClass: "border-blue-200", iconBgClass: "bg-blue-600", icon: "send" },
  { key: "logic", label: "Logic", colorClass: "text-amber-700", bgClass: "bg-amber-50", borderClass: "border-amber-200", iconBgClass: "bg-amber-600", icon: "conditional" },
  { key: "escalation", label: "Escalation", colorClass: "text-red-700", bgClass: "bg-red-50", borderClass: "border-red-200", iconBgClass: "bg-red-600", icon: "warning" },
  { key: "schedule", label: "Schedules", colorClass: "text-cyan-700", bgClass: "bg-cyan-50", borderClass: "border-cyan-200", iconBgClass: "bg-cyan-600", icon: "schedule" },
];

// ---------------------------------------------------------------------------
// Block Type Registry
// ---------------------------------------------------------------------------

export const BLOCK_TYPE_REGISTRY: Record<string, BlockTypeDefinition> = {
  // ── Eligibility ─────────────────────────────────────────────────────────
  eligibility_diagnosis: {
    type: "eligibility_diagnosis",
    category: "eligibility",
    label: "Diagnosis Check",
    description: "Match ICD-10 codes for diabetes diagnosis inclusion",
    icon: "diagnosis",
    configFields: [
      { key: "icd10_codes", label: "ICD-10 Codes", type: "text", required: true, placeholder: "E11, E10.x" },
      { key: "match_type", label: "Match Type", type: "select", options: [{ label: "Exact", value: "exact" }, { label: "Prefix", value: "prefix" }], defaultValue: "prefix" },
      { key: "include", label: "Include", type: "toggle", defaultValue: true },
    ],
  },
  eligibility_lab: {
    type: "eligibility_lab",
    category: "eligibility",
    label: "Lab Result Gate",
    description: "Filter patients by lab result threshold (HbA1c, eGFR, lipids)",
    icon: "lab",
    configFields: [
      { key: "test_type", label: "Test Type", type: "select", required: true, options: [
        { label: "HbA1c", value: "hba1c" },
        { label: "Fasting Plasma Glucose", value: "fpg" },
        { label: "OGTT", value: "ogtt" },
        { label: "eGFR", value: "egfr" },
        { label: "UACR", value: "uacr" },
        { label: "LDL", value: "ldl" },
        { label: "HDL", value: "hdl" },
        { label: "Triglycerides", value: "tg" },
        { label: "Random Glucose", value: "random_glucose" },
      ]},
      { key: "operator", label: "Operator", type: "select", required: true, options: [
        { label: "≥", value: "gte" },
        { label: "≤", value: "lte" },
        { label: ">", value: "gt" },
        { label: "<", value: "lt" },
        { label: "=", value: "eq" },
        { label: "Between", value: "between" },
      ]},
      { key: "value", label: "Value", type: "number", required: true },
      { key: "unit", label: "Unit", type: "text", placeholder: "%" },
      { key: "missing_data_rule", label: "Missing Data Rule", type: "select", options: [
        { label: "Block enrollment", value: "block" },
        { label: "Substitute default", value: "substitute" },
        { label: "Provisional enrollment", value: "provisional" },
        { label: "Trigger outreach", value: "trigger_outreach" },
      ]},
    ],
  },
  eligibility_demographics: {
    type: "eligibility_demographics",
    category: "eligibility",
    label: "Demographics Filter",
    description: "Filter by age range, gender, BMI threshold",
    icon: "demographics",
    configFields: [
      { key: "age_min", label: "Min Age", type: "number", placeholder: "18" },
      { key: "age_max", label: "Max Age", type: "number", placeholder: "80" },
      { key: "gender", label: "Gender", type: "select", options: [
        { label: "Any", value: "any" },
        { label: "Male", value: "male" },
        { label: "Female", value: "female" },
      ]},
      { key: "bmi_threshold", label: "BMI Threshold", type: "number" },
      { key: "bmi_operator", label: "BMI Operator", type: "select", options: [
        { label: "≥", value: "gte" },
        { label: "≤", value: "lte" },
      ]},
    ],
  },
  eligibility_pharmacy: {
    type: "eligibility_pharmacy",
    category: "eligibility",
    label: "Pharmacy / Rx Check",
    description: "PDC threshold, drug class, active Rx requirement",
    icon: "pharmacy",
    configFields: [],
  },
  eligibility_utilisation: {
    type: "eligibility_utilisation",
    category: "eligibility",
    label: "Utilisation Trigger",
    description: "ER visit, hospitalisation, DKA event triggers",
    icon: "utilisation",
    configFields: [],
  },
  eligibility_sdoh: {
    type: "eligibility_sdoh",
    category: "eligibility",
    label: "SDOH Screening",
    description: "SDOH domain flags: food, housing, transport, literacy",
    icon: "sdoh",
    configFields: [],
  },
  eligibility_pro: {
    type: "eligibility_pro",
    category: "eligibility",
    label: "PRO Instrument",
    description: "PRO instruments: PHQ-9, DDS, SED-9, MMAS",
    icon: "pro",
    configFields: [],
  },
  eligibility_exclusion: {
    type: "eligibility_exclusion",
    category: "eligibility",
    label: "Exclusion Criteria",
    description: "Exclude: ESRD, hospice, GDM, severe dementia",
    icon: "exclusion",
    configFields: [],
  },

  // ── Actions ─────────────────────────────────────────────────────────────
  action_outreach: {
    type: "action_outreach",
    category: "action",
    label: "Patient Outreach",
    description: "Send message via WhatsApp, SMS, phone, or app push",
    icon: "outreach",
    configFields: [
      { key: "channel", label: "Channel", type: "select", required: true, options: [
        { label: "WhatsApp", value: "whatsapp" },
        { label: "SMS", value: "sms" },
        { label: "Phone Call", value: "phone" },
        { label: "App Push", value: "app_push" },
      ]},
      { key: "template_slug", label: "Template Slug", type: "text" },
      { key: "ai_personalisation", label: "AI Personalisation", type: "toggle", defaultValue: true },
      { key: "escalation_action", label: "Escalation Action", type: "select", options: [
        { label: "Assign Care Manager", value: "assign_care_manager" },
        { label: "Schedule RN Call", value: "schedule_rn_call" },
        { label: "AI Voice Call", value: "voice_call_ai" },
        { label: "Flag Command Center", value: "flag_command_center" },
      ]},
    ],
  },
  action_lab_order: {
    type: "action_lab_order",
    category: "action",
    label: "Lab Order",
    description: "Order lab test at specified frequency with notification",
    icon: "lab",
    configFields: [
      { key: "test_type", label: "Test Type", type: "select", required: true, options: [
        { label: "HbA1c", value: "hba1c" },
        { label: "Fasting Plasma Glucose", value: "fpg" },
        { label: "eGFR", value: "egfr" },
        { label: "UACR", value: "uacr" },
        { label: "LDL", value: "ldl" },
        { label: "Lipid Panel", value: "lipid_panel" },
      ]},
      { key: "frequency", label: "Frequency", type: "select", required: true, options: [
        { label: "Monthly", value: "monthly" },
        { label: "Quarterly", value: "quarterly" },
        { label: "Biannual", value: "biannual" },
        { label: "Annual", value: "annual" },
      ]},
      { key: "notification_target", label: "Notify", type: "select", options: [
        { label: "Care Manager", value: "care_manager" },
        { label: "Physician", value: "physician" },
        { label: "Pharmacist", value: "pharmacist" },
      ]},
    ],
  },
  action_referral: {
    type: "action_referral",
    category: "action",
    label: "Specialist Referral",
    description: "Refer to specialty with urgency and prerequisite data",
    icon: "referral",
    configFields: [
      { key: "specialty", label: "Specialty", type: "text", required: true, placeholder: "e.g. cardiology, ophthalmology" },
      { key: "urgency", label: "Urgency", type: "select", required: true, options: [
        { label: "Standard", value: "standard" },
        { label: "Warm Handoff", value: "warm" },
        { label: "Urgent", value: "urgent" },
      ]},
      { key: "prerequisite_data", label: "Prerequisite Data", type: "text", placeholder: "e.g. echocardiogram, bnp_level" },
    ],
  },
  action_medication: {
    type: "action_medication",
    category: "action",
    label: "Medication Action",
    description: "Drug class, dosing, titration, contraindication gates",
    icon: "medication",
    configFields: [],
  },
  action_assessment: {
    type: "action_assessment",
    category: "action",
    label: "PRO Assessment",
    description: "Administer PRO instrument at defined frequency",
    icon: "assessment",
    configFields: [],
  },
  action_care_team: {
    type: "action_care_team",
    category: "action",
    label: "Care Team Assignment",
    description: "Assign care team role, cadence, escalation chain",
    icon: "careTeam",
    configFields: [],
  },

  // ── Logic ───────────────────────────────────────────────────────────────
  logic_conditional: {
    type: "logic_conditional",
    category: "logic",
    label: "Conditional Branch",
    description: "Branch pathway based on clinical field comparison",
    icon: "conditional",
    configFields: [
      { key: "field", label: "Field", type: "text", required: true, placeholder: "e.g. hba1c, egfr" },
      { key: "operator", label: "Operator", type: "select", required: true, options: [
        { label: ">", value: "gt" },
        { label: "<", value: "lt" },
        { label: "≥", value: "gte" },
        { label: "≤", value: "lte" },
        { label: "=", value: "eq" },
        { label: "≠", value: "neq" },
      ]},
      { key: "value", label: "Value", type: "text", required: true },
      { key: "true_branch_label", label: "True Branch Label", type: "text", defaultValue: "Yes" },
      { key: "false_branch_label", label: "False Branch Label", type: "text", defaultValue: "No" },
    ],
  },
  logic_wait: {
    type: "logic_wait",
    category: "logic",
    label: "Wait / Delay",
    description: "Pause execution for specified duration",
    icon: "wait",
    configFields: [],
  },
  logic_missing_data: {
    type: "logic_missing_data",
    category: "logic",
    label: "Missing Data Handler",
    description: "Handle missing clinical data with collection triggers",
    icon: "missingData",
    configFields: [],
  },
  logic_composite_score: {
    type: "logic_composite_score",
    category: "logic",
    label: "Composite Risk Score",
    description: "Calculate weighted multi-component CRS score",
    icon: "compositeScore",
    configFields: [],
  },

  // ── Escalation ──────────────────────────────────────────────────────────
  escalation_uptier: {
    type: "escalation_uptier",
    category: "escalation",
    label: "Up-Tier Escalation",
    description: "Escalate patient to higher care tier with notification",
    icon: "uptier",
    configFields: [
      { key: "target_tier", label: "Target Tier", type: "number", required: true },
      { key: "timing", label: "Timing", type: "select", required: true, options: [
        { label: "Same Day", value: "same_day" },
        { label: "Within 48h", value: "within_48h" },
        { label: "Next Review", value: "next_review" },
        { label: "Next Month", value: "next_month" },
      ]},
      { key: "notification_targets", label: "Notify", type: "multiselect", options: [
        { label: "Care Manager", value: "care_manager" },
        { label: "Physician", value: "physician" },
        { label: "Pharmacist", value: "pharmacist" },
        { label: "Patient", value: "patient" },
      ]},
    ],
  },
  escalation_downtier: {
    type: "escalation_downtier",
    category: "escalation",
    label: "Down-Tier Step-Down",
    description: "Multi-criteria down-tier eligibility with clinician confirmation",
    icon: "downtier",
    configFields: [],
  },
  escalation_external: {
    type: "escalation_external",
    category: "escalation",
    label: "External Escalation",
    description: "Escalate to external system: 911, ED, crisis protocol",
    icon: "external",
    configFields: [],
  },
  escalation_override: {
    type: "escalation_override",
    category: "escalation",
    label: "Clinician Override",
    description: "Manual clinician override with required documentation",
    icon: "override",
    configFields: [],
  },

  // ── Schedules ───────────────────────────────────────────────────────────
  schedule_recurring: {
    type: "schedule_recurring",
    category: "schedule",
    label: "Recurring Touchpoint",
    description: "Recurring touchpoint by tier cadence",
    icon: "schedule",
    configFields: [],
  },
  schedule_template: {
    type: "schedule_template",
    category: "schedule",
    label: "Message Template",
    description: "Message template with variables and AI rewrite",
    icon: "schedule",
    configFields: [],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getBlockType(type: string): BlockTypeDefinition | undefined {
  return BLOCK_TYPE_REGISTRY[type];
}

export function getBlocksByCategory(category: BlockCategory): BlockTypeDefinition[] {
  return Object.values(BLOCK_TYPE_REGISTRY).filter((b) => b.category === category);
}

export function getCategoryDef(key: BlockCategory): CategoryDefinition | undefined {
  return BLOCK_CATEGORIES.find((c) => c.key === key);
}
