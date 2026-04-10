"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { Icons } from "@/config/icons";
import { cn } from "@/lib/cn";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { createProgram } from "@/services/api/programs";
import { formatNumber } from "@/lib/format";
import { streamScoring } from "@/services/api/cohortisation";
import { toast } from "sonner";
import { ProgramCard } from "./program-card";
import { BatchProgressBar } from "./batch-progress-bar";
import { RiskWorklist } from "./risk-worklist";
import type { SSEEvent } from "@/services/types/cohort";

const KPI_CELLS = [
  { key: "total_patients" as const, label: "Members", icon: Icons.patients, color: "text-indigo-500 dark:text-indigo-400" },
  { key: "active_programs" as const, label: "Programs", icon: Icons.cohortisation, color: "text-blue-500 dark:text-blue-400" },
  { key: "unassigned" as const, label: "Unassigned", icon: Icons.warning, color: "text-amber-500 dark:text-amber-400", warnWhen: (v: number) => v > 0 },
  { key: "pending_rescore" as const, label: "Pending Re-score", icon: Icons.recurring, color: "text-violet-500 dark:text-violet-400" },
];

export function PopulationDashboard() {
  const {
    stats, statsLoading, programs, programsLoading, distributions, loadPrograms,
    loadDashboard, loadAssignments,
    batchActive, batchTotal, batchProcessed, batchFailed,
    onBatchStarted, onItemsFlushed, onBatchComplete, onNarrativeReady,
    recalculate, recalculating,
  } = useCohortisationStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCondition, setFormCondition] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // SSE stream connection — buffer events and flush every 500ms to avoid jitter
  const disconnectRef = useRef<(() => void) | null>(null);
  const bufferRef = useRef<SSEEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const flushBuffer = () => {
      const events = bufferRef.current;
      if (events.length === 0) return;
      bufferRef.current = [];

      // Collect processed items and failed count for a single store update
      const processedItems: { entityId: string; data: Record<string, unknown> }[] = [];
      let failedCount = 0;

      for (const event of events) {
        switch (event.type) {
          case "batch_started": {
            const total = (event.data.total as number) ?? 0;
            onBatchStarted(total);
            toast.loading(`Scoring ${total} patients...`, { id: "scoring-progress", duration: Infinity });
            break;
          }
          case "item_processed":
            processedItems.push({ entityId: event.entity_id ?? "", data: event.data });
            break;
          case "item_failed":
            failedCount++;
            break;
          case "narrative_ready":
            onNarrativeReady(event.entity_id ?? "", (event.data.narrative as string) ?? "");
            break;
          case "batch_complete": {
            onBatchComplete();
            loadDashboard();
            loadAssignments();
            const proc = useCohortisationStore.getState().batchProcessed;
            const fail = useCohortisationStore.getState().batchFailed;
            toast.dismiss("scoring-progress");
            if (fail > 0) {
              toast.warning(`Scoring complete: ${proc} assigned, ${fail} failed`);
            } else {
              toast.success(`Scoring complete: ${proc} patients assigned`);
            }
            break;
          }
        }
      }

      // Single state update for all items in this flush window
      if (processedItems.length > 0 || failedCount > 0) {
        onItemsFlushed(processedItems, failedCount);
      }
    };

    const handleEvent = (event: SSEEvent) => {
      // batch_started and batch_complete flush immediately
      if (event.type === "batch_started" || event.type === "batch_complete") {
        flushBuffer();
        bufferRef.current = [event];
        flushBuffer();
        return;
      }
      bufferRef.current.push(event);
    };

    flushTimerRef.current = setInterval(flushBuffer, 500);
    disconnectRef.current = streamScoring(handleEvent);

    return () => {
      disconnectRef.current?.();
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      bufferRef.current = [];
    };
  }, [onBatchStarted, onItemsFlushed, onBatchComplete, onNarrativeReady, loadDashboard, loadAssignments]);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setCreating(true);
    try {
      await createProgram({
        name: formName.trim(),
        ...(formCondition.trim() && { condition: formCondition.trim() }),
        ...(formDescription.trim() && { description: formDescription.trim() }),
      });
      setDialogOpen(false);
      setFormName("");
      setFormCondition("");
      setFormDescription("");
      await loadPrograms();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cohortisation"
        description="Stratify patients into risk cohorts, assign scoring engines, and track population shifts"
        actions={
          <div className="flex items-center gap-2">
            <Select
              disabled={recalculating || batchActive}
              onValueChange={(scope) => recalculate(undefined, scope as "all" | "unassigned")}
            >
              <SelectTrigger className="h-9 w-fit gap-1.5 rounded-lg px-3 text-xs">
                {recalculating || batchActive ? (
                  <Icons.spinner className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icons.recurring className="h-3.5 w-3.5" />
                )}
                <span>Recalculate</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned Only</SelectItem>
                <SelectItem value="all">All Patients</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setDialogOpen(true)}>
              <Icons.plus className="mr-1.5 h-4 w-4" />
              Create Program
            </Button>
          </div>
        }
      />

      {/* KPI Strip — compact inline, matching command center */}
      <div className="flex gap-px overflow-hidden rounded-xl bg-border-default shadow-sm">
        {KPI_CELLS.map((cell) => {
          const raw = stats?.[cell.key] ?? 0;
          const Icon = cell.icon;
          const isWarn = cell.warnWhen?.(raw);
          return (
            <div key={cell.key} className="flex flex-1 items-center gap-2.5 bg-bg-primary px-3.5 py-2.5">
              <Icon className={cn("h-4 w-4 shrink-0", cell.color)} />
              <div>
                {statsLoading ? (
                  <Skeleton className="h-5 w-12" />
                ) : (
                  <span className={cn("text-xl font-bold tabular-nums", isWarn ? "text-amber-600 dark:text-amber-400" : "text-text-primary")}>
                    {formatNumber(raw)}
                  </span>
                )}
                <div className="text-[9px] font-medium uppercase tracking-[0.06em] text-text-muted">
                  {cell.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Batch Progress */}
      <BatchProgressBar
        processed={batchProcessed}
        failed={batchFailed}
        total={batchTotal}
        active={batchActive}
      />

      {/* Programs */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Programs</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Each program defines a condition-specific scoring engine and cohort tiers for patient stratification.
          </p>
        </div>
        {programsLoading && programs.length === 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : programs.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border-default py-10">
            <div className="space-y-2 text-center">
              <Icons.cohortisation className="mx-auto h-6 w-6 text-text-placeholder" />
              <p className="text-sm text-text-muted">No programs yet</p>
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                <Icons.plus className="mr-1.5 h-3.5 w-3.5" />
                Create your first program
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {programs.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                distribution={distributions[program.id]}
              />
            ))}
          </div>
        )}
      </section>

      {/* Risk Pool */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">At-Risk Patients</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Patients above the risk score threshold. Filter by program or cohort to drill down.
          </p>
        </div>
        <RiskWorklist />
      </section>

      {/* Create Program Sheet */}
      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Create Program</SheetTitle>
            <SheetDescription>
              Define a condition-specific cohortisation program with scoring criteria and cohort tiers.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4">
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">
                Name
              </span>
              <Input
                placeholder="e.g. Oncology Risk Stratification"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">
                Condition
              </span>
              <Input
                placeholder="e.g. Breast Cancer"
                value={formCondition}
                onChange={(e) => setFormCondition(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">
                Description
              </span>
              <Textarea
                placeholder="Optional description..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <SheetFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleCreate} disabled={!formName.trim() || creating}>
              {creating && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
