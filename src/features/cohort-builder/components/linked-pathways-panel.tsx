"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchPathways } from "@/services/api/pathways";
import type { PathwayListItem } from "@/services/types/pathway";
import { useCohortBuilderStore } from "@/stores/cohort-builder-store";
import { toast } from "sonner";

const NONE_VALUE = "__none__";

export function LinkedPathwaysPanel() {
  const { program, updateCohort } = useCohortBuilderStore();
  const [pathways, setPathways] = useState<PathwayListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPathways()
      .then((data) => setPathways(data.items))
      .catch(() => setPathways([]))
      .finally(() => setLoading(false));
  }, []);

  if (!program) return null;

  const cohorts = program.cohorts.slice().sort((a, b) => a.sort_order - b.sort_order);

  const handleLink = async (cohortId: string, pathwayId: string | null) => {
    try {
      await updateCohort(cohortId, { pathway_id: pathwayId });
      toast.success(pathwayId ? "Pathway linked" : "Pathway unlinked");
    } catch {
      toast.error("Failed to update pathway link");
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Linked Pathways</h2>
        <p className="mt-0.5 text-xs text-text-muted">
          Each cohort can link to a care pathway. When patients are assigned to a cohort, they enter
          the linked pathway.
        </p>
      </div>

      {cohorts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-default py-10 text-center">
          <p className="text-sm text-text-muted">Create cohorts first to link pathways.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cohort</TableHead>
                <TableHead>Linked Pathway</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohorts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-sm font-medium text-text-primary">{c.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={c.pathway_id ?? NONE_VALUE}
                      onValueChange={(v) => handleLink(c.id, v === NONE_VALUE ? null : v)}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-8 w-64 text-xs">
                        <SelectValue placeholder="Select pathway..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>No pathway</SelectItem>
                        {pathways.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
