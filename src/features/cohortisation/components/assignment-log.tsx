"use client";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useCohortisationStore } from "@/stores/cohortisation-store";
import { getTier } from "@/config/tiers";

const formatDate = (iso: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function TierChange({
  current,
  previous,
}: {
  current: number;
  previous: number | null;
}) {
  if (previous === null) {
    return <span className="text-xs text-muted-foreground">New</span>;
  }
  if (current > previous) {
    return (
      <ArrowUpRight className="h-4 w-4 text-destructive" aria-label="Tier increased" />
    );
  }
  if (current < previous) {
    return (
      <ArrowDownRight className="h-4 w-4 text-green-600" aria-label="Tier decreased" />
    );
  }
  return <Minus className="h-4 w-4 text-muted-foreground" aria-label="No change" />;
}

export function AssignmentLog() {
  const {
    assignments,
    assignmentsTotal,
    assignmentsPage,
    assignmentsPages,
    assignmentsLoading,
    loadAssignments,
  } = useCohortisationStore();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold">
          Assignment Audit Log
        </CardTitle>
        <span
          className={cn(
            "text-sm text-muted-foreground",
            assignmentsLoading && "opacity-50"
          )}
        >
          {assignmentsTotal} records
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {assignments.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">
            No assignments yet. Run &ldquo;Recalculate All&rdquo; to generate.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>CRS</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((record) => {
                  const tierConfig = getTier(record.tier_number);
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.patient_name}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {record.crs_score}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tierConfig.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <TierChange
                          current={record.tier_number}
                          previous={record.previous_tier}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.assignment_type === "auto"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {record.assignment_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="block max-w-48 truncate text-sm text-muted-foreground">
                          {record.reason ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(record.assigned_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t px-6 py-3">
              <Button
                variant="outline"
                size="sm"
                disabled={assignmentsPage <= 1 || assignmentsLoading}
                onClick={() => loadAssignments(assignmentsPage - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {assignmentsPage} of {assignmentsPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  assignmentsPage >= assignmentsPages || assignmentsLoading
                }
                onClick={() => loadAssignments(assignmentsPage + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
