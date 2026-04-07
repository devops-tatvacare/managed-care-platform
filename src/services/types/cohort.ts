export interface CRSScoringRow {
  criterion: string;
  points: number;
  [key: string]: unknown;
}

export interface CRSBonusRow {
  criterion: string;
  field: string;
  points: number;
  [key: string]: unknown;
}

export interface CRSComponent {
  name: string;
  label?: string;
  weight: number;
  cap: number;
  scoring_table: CRSScoringRow[];
  bonus_table?: CRSBonusRow[];
}

export interface TierThreshold {
  tier: number;
  label: string;
  crs_min: number;
  crs_max: number;
  prereq: string;
}

export interface TiebreakerRule {
  priority: number;
  rule: string;
  action: string;
  [key: string]: unknown;
}

export interface CRSConfigResponse {
  id: string;
  components: CRSComponent[];
  tier_thresholds: TierThreshold[];
  tiebreaker_rules: TiebreakerRule[];
}

export interface CRSConfigUpdate {
  components?: CRSComponent[];
  tier_thresholds?: TierThreshold[];
  tiebreaker_rules?: TiebreakerRule[];
}

export interface CRSBreakdownComponent {
  raw: number;
  weighted: number;
}

export interface AssignmentRecord {
  id: string;
  patient_id: string;
  patient_name: string;
  tier_number: number;
  previous_tier: number | null;
  crs_score: number;
  crs_breakdown: Record<string, CRSBreakdownComponent>;
  assignment_type: string;
  reason: string | null;
  assigned_at: string;
  review_due_at: string | null;
}

export interface AssignmentListResponse {
  items: AssignmentRecord[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface TierDistributionItem {
  tier: number;
  count: number;
}

export interface TierDistributionResponse {
  distribution: TierDistributionItem[];
  total: number;
}

export interface RecalculateResponse {
  processed: number;
  tier_changes: number;
}
