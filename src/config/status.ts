export interface StatusConfig {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
}

export const TIER_BADGE_STYLES: Record<number, { className: string }> = {
  0: { className: "border-green-300 bg-green-50 text-green-800" },
  1: { className: "border-blue-300 bg-blue-50 text-blue-800" },
  2: { className: "border-yellow-300 bg-yellow-50 text-yellow-800" },
  3: { className: "border-orange-300 bg-orange-50 text-orange-800" },
  4: { className: "border-red-300 bg-red-50 text-red-800" },
};

export const PROTOCOL_STEP_STATUS: Record<string, StatusConfig> = {
  completed: { label: "Completed", variant: "outline", className: "border-green-300 bg-green-50 text-green-700" },
  in_progress: { label: "In Progress", variant: "outline", className: "border-indigo-300 bg-indigo-50 text-indigo-700" },
  pending: { label: "Pending", variant: "outline", className: "border-slate-200 bg-slate-50 text-slate-500" },
  overdue: { label: "Overdue", variant: "outline", className: "border-red-300 bg-red-50 text-red-700" },
};

export const CLINICAL_STATUS: Record<string, StatusConfig> = {
  on_track: { label: "On track", variant: "outline", className: "border-yellow-300 bg-yellow-50 text-yellow-700" },
  behind: { label: "Behind", variant: "outline", className: "border-red-300 bg-red-50 text-red-700" },
  ahead: { label: "Ahead", variant: "outline", className: "border-green-300 bg-green-50 text-green-700" },
  at_risk: { label: "At Risk", variant: "outline", className: "border-red-300 bg-red-50 text-red-700" },
};

export const ORCHESTRATION_STATUS: Record<string, StatusConfig> = {
  idle: { label: "Idle", variant: "outline", className: "border-slate-200 bg-slate-50 text-slate-500" },
  sent: { label: "Sent", variant: "outline", className: "border-indigo-300 bg-indigo-50 text-indigo-700" },
  awaiting: { label: "Awaiting", variant: "outline", className: "border-indigo-300 bg-indigo-50 text-indigo-700" },
  confirmed: { label: "Confirmed", variant: "outline", className: "border-green-300 bg-green-50 text-green-700" },
  needs_review: { label: "Needs Review", variant: "outline", className: "border-yellow-300 bg-yellow-50 text-yellow-700" },
  escalated: { label: "Escalated", variant: "outline", className: "border-red-300 bg-red-50 text-red-700" },
  declined: { label: "Declined", variant: "outline", className: "border-slate-200 bg-slate-50 text-slate-500" },
};
