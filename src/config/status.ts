export interface StatusConfig {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
}

export const TIER_BADGE_STYLES: Record<number, { className: string }> = {
  0: { className: "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950 dark:text-green-300" },
  1: { className: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  2: { className: "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  3: { className: "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  4: { className: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300" },
};

export const PROTOCOL_STEP_STATUS: Record<string, StatusConfig> = {
  completed: { label: "Completed", variant: "outline", className: "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300" },
  in_progress: { label: "In Progress", variant: "outline", className: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
  pending: { label: "Pending", variant: "outline", className: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400" },
  overdue: { label: "Overdue", variant: "outline", className: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300" },
};

export const CLINICAL_STATUS: Record<string, StatusConfig> = {
  on_track: { label: "On track", variant: "outline", className: "border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  behind: { label: "Behind", variant: "outline", className: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300" },
  ahead: { label: "Ahead", variant: "outline", className: "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300" },
  at_risk: { label: "At Risk", variant: "outline", className: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300" },
};

export const ORCHESTRATION_STATUS: Record<string, StatusConfig> = {
  idle: { label: "Idle", variant: "outline", className: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400" },
  sent: { label: "Sent", variant: "outline", className: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
  awaiting: { label: "Awaiting", variant: "outline", className: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
  confirmed: { label: "Confirmed", variant: "outline", className: "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300" },
  needs_review: { label: "Needs Review", variant: "outline", className: "border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  escalated: { label: "Escalated", variant: "outline", className: "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300" },
  declined: { label: "Declined", variant: "outline", className: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400" },
};

export const PATHWAY_STATUS: Record<string, StatusConfig> = {
  draft: { label: "Draft", variant: "outline", className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  review: { label: "Review", variant: "outline", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700" },
  published: { label: "Published", variant: "outline", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-700" },
  archived: { label: "Archived", variant: "outline", className: "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700" },
};

/* ── Patient pathway enrollment status ── */
export const PATIENT_PATHWAY_STATUS: Record<string, StatusConfig> = {
  active: { label: "Active", variant: "outline", className: "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300" },
  enrolled: { label: "Enrolled", variant: "outline", className: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
  pending: { label: "Pending", variant: "outline", className: "border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  completed: { label: "Completed", variant: "outline", className: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400" },
  discharged: { label: "Discharged", variant: "outline", className: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400" },
  paused: { label: "Paused", variant: "outline", className: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-300" },
};

/* ── Care gap severity (by count) ── */
export function careGapSeverity(count: number): { className: string; label: string } {
  if (count === 0) return { className: "text-text-muted", label: "0" };
  if (count <= 1) return { className: "text-yellow-700 dark:text-yellow-400", label: String(count) };
  if (count <= 3) return { className: "text-orange-600 dark:text-orange-400", label: String(count) };
  return { className: "text-red-600 dark:text-red-400 font-semibold", label: String(count) };
}

/* ── Cohort assignment type ── */
export const ASSIGNMENT_TYPE: Record<string, StatusConfig> = {
  auto: { label: "Auto", variant: "outline", className: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
  manual: { label: "Manual", variant: "outline", className: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400" },
  override: { label: "Override", variant: "outline", className: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300" },
};

/* ── Risk score coloring (for tables) ── */
export function scoreColor(score: number | null | undefined): string {
  if (score == null) return "text-text-muted";
  if (score >= 80) return "text-red-600 dark:text-red-400 font-semibold";
  if (score >= 60) return "text-orange-600 dark:text-orange-400";
  if (score >= 40) return "text-yellow-700 dark:text-yellow-400";
  return "text-green-700 dark:text-green-400";
}
