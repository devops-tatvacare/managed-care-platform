export interface CohortSummary {
  id: string;
  name: string;
  slug: string;
  color: string;
  sort_order: number;
  review_cadence_days: number;
  score_range_min: number | null;
  score_range_max: number | null;
  member_count: number;
  pathway_id: string | null;
  pathway_name: string | null;
}

export interface ScoringEngineSummary {
  id: string;
  components: ScoringComponentConfig[];
  tiebreaker_rules: TiebreakerRule[];
  aggregation_method: string;
}

export interface ScoringComponentConfig {
  name: string;
  label?: string;
  data_source: string;
  weight: number;
  cap: number;
  field?: string;
  scoring_table: Array<{ criterion: string; points: number; [key: string]: unknown }>;
  bonus_table?: Array<{ criterion: string; points: number; [key: string]: unknown }>;
  aggregation?: "sum" | "max" | "first_match";
  [key: string]: unknown;
}

export interface TiebreakerRule {
  priority: number;
  rule: string;
  action: string;
  condition: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProgramListItem {
  id: string;
  name: string;
  slug: string;
  condition: string | null;
  status: string;
  version: number;
  cohort_count: number;
  has_scoring_engine: boolean;
}

export interface ProgramDetail {
  id: string;
  name: string;
  slug: string;
  condition: string | null;
  description: string | null;
  status: string;
  version: number;
  published_at: string | null;
  cohorts: CohortSummary[];
  scoring_engine: ScoringEngineSummary | null;
}

export interface ProgramCreate {
  name: string;
  slug?: string;
  condition?: string;
  description?: string;
}

export interface ProgramUpdate {
  name?: string;
  slug?: string;
  condition?: string;
  description?: string;
  status?: string;
}

export interface ProgramVersion {
  id: string;
  version: number;
  published_at: string;
  snapshot: Record<string, unknown>;
}

export interface CohortCreate {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  sort_order?: number;
  review_cadence_days?: number;
  score_range_min?: number;
  score_range_max?: number;
  pathway_id?: string | null;
}

export interface CohortUpdate {
  name?: string;
  slug?: string;
  description?: string;
  color?: string;
  sort_order?: number;
  review_cadence_days?: number;
  score_range_min?: number;
  score_range_max?: number;
  pathway_id?: string | null;
}

export interface CriteriaNode {
  group_operator?: string;
  rule_type?: string;
  config?: Record<string, unknown>;
  children?: CriteriaNode[];
}

export interface ScoringEngineUpsert {
  components: ScoringComponentConfig[];
  tiebreaker_rules?: TiebreakerRule[];
  aggregation_method?: string;
}
