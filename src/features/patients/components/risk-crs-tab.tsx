"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { usePatientsStore } from "@/stores/patients-store";
import { getTier } from "@/config/tiers";

const COMPONENT_LABELS: Record<string, string> = {
  "Glycaemic Control": "Glycaemic Control",
  "Complication Burden": "Complication Burden",
  "Behavioural/Adherence": "Behavioural / Adherence",
  "Utilisation": "Utilisation",
  "SDOH Burden": "SDOH Burden",
};

const COMPONENT_WEIGHTS: Record<string, number> = {
  "Glycaemic Control": 35,
  "Complication Burden": 25,
  "Behavioural/Adherence": 20,
  "Utilisation": 15,
  "SDOH Burden": 5,
};

const COMPONENT_ORDER = [
  "Glycaemic Control",
  "Complication Burden",
  "Behavioural/Adherence",
  "Utilisation",
  "SDOH Burden",
];

interface ComponentEntry {
  key: string;
  label: string;
  raw: number;
  weighted: number;
  weight: number;
}

function parseBreakdown(
  breakdown: Record<string, unknown>
): ComponentEntry[] | null {
  const entries: ComponentEntry[] = [];

  for (const key of COMPONENT_ORDER) {
    const value = breakdown[key];
    if (value === undefined) continue;

    const weight = COMPONENT_WEIGHTS[key] ?? 0;
    const label = COMPONENT_LABELS[key] ?? key;

    if (typeof value === "object" && value !== null && "raw" in value) {
      const v = value as { raw: number; weighted: number };
      entries.push({ key, label, raw: v.raw, weighted: v.weighted, weight });
    } else if (typeof value === "number") {
      // Legacy format — treat as raw percentage, compute weighted
      entries.push({
        key,
        label,
        raw: value,
        weighted: Math.round((value * weight) / 100),
        weight,
      });
    }
  }

  return entries.length > 0 ? entries : null;
}

export function RiskCRSTab() {
  const patient = usePatientsStore((s) => s.selectedPatient);

  if (!patient) return null;

  const tier = getTier(patient.tier);
  const breakdown = patient.crs_breakdown
    ? parseBreakdown(patient.crs_breakdown as Record<string, unknown>)
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <CardTitle className="text-sm font-semibold">
          Composite Risk Score
        </CardTitle>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold leading-none text-text-primary">
            {patient.crs_score}
            <span className="text-base font-normal text-text-muted">/100</span>
          </span>
          <Badge
            style={{ backgroundColor: tier.colorVar, color: "#fff" }}
            className={cn("whitespace-nowrap")}
          >
            {tier.label} — {tier.name}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {breakdown ? (
          <div className="flex flex-col gap-4">
            {breakdown.map((entry) => (
              <div key={entry.key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text-primary">
                    {entry.label}
                  </span>
                  <div className="flex items-center gap-3 text-text-muted">
                    <span>
                      Raw:{" "}
                      <span className="font-medium text-text-primary">
                        {entry.raw}
                      </span>
                      /100
                    </span>
                    <span>
                      Weighted:{" "}
                      <span className="font-medium text-text-primary">
                        {entry.weighted}
                      </span>
                    </span>
                    <span className="text-text-subtle">
                      ({entry.weight}% weight)
                    </span>
                  </div>
                </div>
                <Progress value={entry.raw} className="h-2" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            No CRS breakdown available. Run cohortisation to calculate.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
