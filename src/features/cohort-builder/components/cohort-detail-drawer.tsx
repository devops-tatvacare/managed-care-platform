"use client";

import { useEffect, useState } from "react";
import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Icons } from "@/config/icons";

const REVIEW_CADENCE_OPTIONS = [
  { value: "7", label: "Weekly" },
  { value: "14", label: "Bi-weekly" },
  { value: "30", label: "Monthly" },
  { value: "90", label: "Quarterly" },
  { value: "180", label: "6-month" },
  { value: "365", label: "Annual" },
];

const COLOR_SWATCHES = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#14b8a6",
];

export function CohortDetailDrawer() {
  const { program, selectedCohortId, selectCohort, updateCohort, deleteCohort } = useCohortBuilderStore();

  const cohort = program?.cohorts.find((c) => c.id === selectedCohortId) ?? null;
  const open = !!cohort;

  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [reviewCadence, setReviewCadence] = useState("30");
  const [scoreMin, setScoreMin] = useState("");
  const [scoreMax, setScoreMax] = useState("");

  useEffect(() => {
    if (cohort) {
      setName(cohort.name);
      setColor(cohort.color);
      setDescription("");
      setSortOrder(cohort.sort_order);
      setReviewCadence(String(cohort.review_cadence_days));
      setScoreMin(cohort.score_range_min != null ? String(cohort.score_range_min) : "");
      setScoreMax(cohort.score_range_max != null ? String(cohort.score_range_max) : "");
    }
  }, [cohort]);

  const handleSave = async () => {
    if (!selectedCohortId) return;
    await updateCohort(selectedCohortId, {
      name,
      color,
      sort_order: sortOrder,
      review_cadence_days: Number(reviewCadence),
      score_range_min: scoreMin ? Number(scoreMin) : undefined,
      score_range_max: scoreMax ? Number(scoreMax) : undefined,
    });
    selectCohort(null);
  };

  const handleDelete = async () => {
    if (!selectedCohortId) return;
    await deleteCohort(selectedCohortId);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) selectCohort(null); }}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Cohort</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: c === color ? "var(--brand-primary)" : "transparent",
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <Separator />

          {/* Sort Order */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Sort Order</label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
          </div>

          {/* Review Cadence */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Review Cadence</label>
            <Select value={reviewCadence} onValueChange={setReviewCadence}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REVIEW_CADENCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Score Range */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Score Range</label>
            <div className="flex items-center gap-2">
              <Input type="number" placeholder="Min" value={scoreMin} onChange={(e) => setScoreMin(e.target.value)} />
              <span className="text-text-muted">to</span>
              <Input type="number" placeholder="Max" value={scoreMax} onChange={(e) => setScoreMax(e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* Criteria placeholder */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Criteria</label>
            <div className="rounded-lg border border-dashed border-border-default p-4 text-center text-xs text-text-muted">
              Criteria editor coming in next task
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Icons.close className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
