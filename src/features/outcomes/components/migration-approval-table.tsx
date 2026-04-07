"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";
import type { PendingOverrideItem } from "@/services/types/outcomes";

interface MigrationApprovalTableProps {
  items: PendingOverrideItem[];
  loading: boolean;
  onApprove: (assignmentId: string) => void;
  onReject: (assignmentId: string) => void;
}

export function MigrationApprovalTable({ items, loading, onApprove, onReject }: MigrationApprovalTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">
        No pending cohort overrides to review
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patient</TableHead>
          <TableHead>From</TableHead>
          <TableHead>To</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.assignment_id}>
            <TableCell className="font-medium">{item.patient_name}</TableCell>
            <TableCell>
              <Badge variant="outline" style={{ borderColor: item.from_cohort_color }} className="text-xs">
                {item.from_cohort_name}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline" style={{ borderColor: item.to_cohort_color }} className="text-xs">
                {item.to_cohort_name}
              </Badge>
            </TableCell>
            <TableCell>{item.score ?? "—"}</TableCell>
            <TableCell className="max-w-[200px] truncate text-sm text-text-muted">
              {item.reason || "—"}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onApprove(item.assignment_id)}
                  className="h-7 w-7 p-0 text-status-success hover:bg-status-success-bg"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReject(item.assignment_id)}
                  className="h-7 w-7 p-0 text-status-error hover:bg-status-error-bg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
