export interface TierConfig {
  number: number;
  label: string;
  name: string;
  colorVar: string;
  reviewCadence: string;
}

export const TIERS: TierConfig[] = [
  { number: 0, label: "Tier 0", name: "Prevention Program", colorVar: "var(--color-tier-0)", reviewCadence: "Annual" },
  { number: 1, label: "Tier 1", name: "Pre-Diabetes Reversal Program", colorVar: "var(--color-tier-1)", reviewCadence: "Every 6 months" },
  { number: 2, label: "Tier 2", name: "Diabetes Wellness Program", colorVar: "var(--color-tier-2)", reviewCadence: "Quarterly" },
  { number: 3, label: "Tier 3", name: "Advanced Diabetes Care Program", colorVar: "var(--color-tier-3)", reviewCadence: "Monthly" },
  { number: 4, label: "Tier 4", name: "Comprehensive Diabetes Support", colorVar: "var(--color-tier-4)", reviewCadence: "Weekly" },
];

export function getTier(number: number): TierConfig {
  const tier = TIERS.find((t) => t.number === number);
  if (!tier) throw new Error(`Unknown tier: ${number}`);
  return tier;
}
