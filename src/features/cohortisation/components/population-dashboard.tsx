"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Icons } from "@/config/icons";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { createProgram } from "@/services/api/programs";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ProgramCard } from "./program-card";
import { RiskPoolTable } from "./risk-pool-table";

export function PopulationDashboard() {
  const { stats, statsLoading, programs, programsLoading, distributions, loadPrograms } =
    useCohortisationStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCondition, setFormCondition] = useState("");
  const [formDescription, setFormDescription] = useState("");

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
    <div className="space-y-8">
      <PageHeader
        title="Cohortisation"
        description="Program-based cohort management and scoring"
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Total Members"
          value={statsLoading ? "--" : formatNumber(stats?.total_patients ?? 0)}
        />
        <KpiCard
          label="Active Programs"
          value={statsLoading ? "--" : formatNumber(stats?.active_programs ?? 0)}
        />
        <KpiCard
          label="Unassigned"
          value={statsLoading ? "--" : formatNumber(stats?.unassigned ?? 0)}
        />
        <KpiCard
          label="Pending Re-score"
          value={statsLoading ? "--" : formatNumber(stats?.pending_rescore ?? 0)}
        />
      </div>

      {/* Programs Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">Programs</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {programs.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              distribution={distributions[program.id]}
            />
          ))}

          {/* Create Program Card */}
          <Card
            className={cn(
              "cursor-pointer border-dashed transition-colors hover:border-border-strong",
            )}
            onClick={() => setDialogOpen(true)}
          >
            <CardContent className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 p-4 text-text-muted">
              <Icons.plus className="h-6 w-6" />
              <span className="text-sm font-medium">Create Program</span>
            </CardContent>
          </Card>
        </div>

        {programsLoading && programs.length === 0 && (
          <div className="flex justify-center py-8">
            <Icons.spinner className={cn("h-5 w-5 animate-spin text-text-muted")} />
          </div>
        )}
      </section>

      {/* Risk Pool Section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">Risk Pool</h2>
        <RiskPoolTable />
      </section>

      {/* Create Program Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Program</DialogTitle>
            <DialogDescription>
              Add a new cohortisation program for patient grouping and scoring.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Name</label>
              <Input
                placeholder="e.g. Oncology Risk Stratification"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Condition</label>
              <Input
                placeholder="e.g. Breast Cancer"
                value={formCondition}
                onChange={(e) => setFormCondition(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Description</label>
              <Textarea
                placeholder="Optional description..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formName.trim() || creating}>
              {creating && <Icons.spinner className={cn("mr-2 h-4 w-4 animate-spin")} />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
