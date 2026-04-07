"use client";

import { useState, useEffect } from "react";
import { fetchPrograms, fetchCohorts, fetchCriteria } from "@/services/api/programs";
import type { ProgramListItem, CohortSummary, CriteriaNode } from "@/services/types/program";
import { Icons } from "@/config/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CohortPickerProps {
  value: { cohort_id: string; program_version: number } | null;
  onChange: (ref: { cohort_id: string; program_version: number } | null) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CohortPicker({ value, onChange }: CohortPickerProps) {
  const [programs, setPrograms] = useState<ProgramListItem[]>([]);
  const [cohorts, setCohorts] = useState<CohortSummary[]>([]);
  const [criteria, setCriteria] = useState<CriteriaNode[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingCohorts, setLoadingCohorts] = useState(false);
  const [loadingCriteria, setLoadingCriteria] = useState(false);

  // Fetch programs on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingPrograms(true);
    fetchPrograms()
      .then((data) => {
        if (!cancelled) setPrograms(data);
      })
      .catch(() => {
        /* swallow — empty list is fine */
      })
      .finally(() => {
        if (!cancelled) setLoadingPrograms(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch cohorts when program changes
  useEffect(() => {
    if (!selectedProgramId) {
      setCohorts([]);
      return;
    }
    let cancelled = false;
    setLoadingCohorts(true);
    fetchCohorts(selectedProgramId)
      .then((data) => {
        if (!cancelled) setCohorts(data);
      })
      .catch(() => {
        if (!cancelled) setCohorts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCohorts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProgramId]);

  // Fetch criteria when cohort changes
  useEffect(() => {
    if (!selectedProgramId || !value?.cohort_id) {
      setCriteria([]);
      return;
    }
    let cancelled = false;
    setLoadingCriteria(true);
    fetchCriteria(selectedProgramId, value.cohort_id)
      .then((data) => {
        if (!cancelled) setCriteria(data);
      })
      .catch(() => {
        if (!cancelled) setCriteria([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCriteria(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProgramId, value?.cohort_id]);

  const selectedProgram = programs.find((p) => p.id === selectedProgramId);
  const selectedCohort = cohorts.find((c) => c.id === value?.cohort_id);

  // Build a flat text summary from the criteria tree
  const summarizeCriteria = (nodes: CriteriaNode[]): string => {
    const leafRuleTypes: string[] = [];
    const collect = (items: CriteriaNode[]) => {
      for (const node of items) {
        if (node.rule_type) {
          leafRuleTypes.push(node.rule_type.replace(/_/g, " "));
        }
        if (node.children?.length) {
          collect(node.children);
        }
      }
    };
    collect(nodes);
    if (leafRuleTypes.length === 0) return "";
    // Determine top-level operator
    const operator = nodes[0]?.group_operator?.toUpperCase() ?? "AND";
    return leafRuleTypes.join(` ${operator} `);
  };

  const handleProgramChange = (programId: string) => {
    setSelectedProgramId(programId);
    // Clear cohort selection when program changes
    onChange(null);
  };

  const handleCohortChange = (cohortId: string) => {
    if (!selectedProgram) return;
    onChange({ cohort_id: cohortId, program_version: selectedProgram.version });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Program select */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Program
        </label>
        {loadingPrograms ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Icons.spinner className="size-3.5 animate-spin" />
            Loading programs...
          </div>
        ) : (
          <Select value={selectedProgramId} onValueChange={handleProgramChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a program" />
            </SelectTrigger>
            <SelectContent>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Cohort select */}
      {selectedProgramId && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Cohort
          </label>
          {loadingCohorts ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Icons.spinner className="size-3.5 animate-spin" />
              Loading cohorts...
            </div>
          ) : cohorts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No cohorts found for this program.
            </p>
          ) : (
            <Select
              value={value?.cohort_id ?? ""}
              onValueChange={handleCohortChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a cohort" />
              </SelectTrigger>
              <SelectContent>
                {cohorts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span
                      className={cn(
                        "inline-block size-2 rounded-full mr-1.5",
                      )}
                      style={{ backgroundColor: c.color }}
                    />
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Criteria summary & version info */}
      {selectedCohort && selectedProgram && (
        <div className="flex flex-col gap-3 rounded-md border border-border-default bg-muted/50 p-3">
          {/* Criteria summary */}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium">Eligibility Criteria</p>
            {loadingCriteria ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icons.spinner className="size-3 animate-spin" />
                Loading criteria...
              </div>
            ) : criteria.length === 0 ? (
              <p className="text-xs text-muted-foreground">No criteria defined</p>
            ) : (
              <p className="text-xs text-muted-foreground">{summarizeCriteria(criteria)}</p>
            )}
          </div>

          <div className="h-px bg-border-default" />

          {/* Cohort details */}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium">Cohort Details</p>
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              {selectedCohort.score_range_min != null &&
                selectedCohort.score_range_max != null && (
                  <span>
                    Score range: {selectedCohort.score_range_min} &ndash;{" "}
                    {selectedCohort.score_range_max}
                  </span>
                )}
              <span>
                Review cadence: every {selectedCohort.review_cadence_days} days
              </span>
              <span>Members: {selectedCohort.member_count}</span>
            </div>
          </div>

          {/* Version info */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icons.saveDraft className="size-3" />
            <span>
              Program version: v{selectedProgram.version} ({selectedProgram.status})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
