// Deprecated — cohort metadata now comes from the API.
// This file is a stub to prevent import errors during migration.
export interface TierConfig {
  number: number;
  label: string;
  name: string;
  colorVar: string;
  reviewCadence: string;
}

export const TIERS: TierConfig[] = [];

export function getTier(number: number): TierConfig {
  return { number, label: `Tier ${number}`, name: "", colorVar: "", reviewCadence: "" };
}
