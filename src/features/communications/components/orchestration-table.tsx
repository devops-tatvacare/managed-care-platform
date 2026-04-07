"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
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
import { Icons } from "@/config/icons";
import { buildPath } from "@/config/routes";
import type { OrchestrationRow } from "@/services/types/communications";

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  whatsapp: Icons.send,
  sms: Icons.outreach,
  call: Icons.phone,
  app_push: Icons.notifications,
  system: Icons.ai,
};

const STATUS_STYLES: Record<string, string> = {
  pending: "border-yellow-300 text-yellow-700 bg-yellow-50",
  success: "border-green-300 text-green-700 bg-green-50",
  failed: "border-red-300 text-red-700 bg-red-50",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface OrchestrationTableProps {
  rows: OrchestrationRow[];
  loading: boolean;
  page: number;
  pages: number;
  onPageChangeAction: (page: number) => void;
}

export function OrchestrationTable({ rows, loading, page, pages, onPageChangeAction }: OrchestrationTableProps) {
  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-border-default">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Patient</TableHead>
              <TableHead className="text-[11px]">Program</TableHead>
              <TableHead className="text-[11px]">Cohort</TableHead>
              <TableHead className="text-[11px]">Pathway Step</TableHead>
              <TableHead className="text-[11px]">Channel</TableHead>
              <TableHead className="text-[11px]">Attempt</TableHead>
              <TableHead className="text-[11px]">State</TableHead>
              <TableHead className="text-[11px]">Last Activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-xs text-text-muted">
                  No orchestration data found
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const ChannelIcon = CHANNEL_ICONS[row.channel] ?? Icons.outreach;
              return (
                <TableRow key={row.action_id}>
                  <TableCell className="text-xs">
                    <Link
                      href={buildPath("patientDetail", { id: row.patient_id })}
                      className="font-medium text-brand-primary hover:underline"
                    >
                      {row.patient_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary">{row.program_name ?? "—"}</TableCell>
                  <TableCell>
                    {row.cohort_name ? (
                      <Badge variant="outline" className="text-[10px]">
                        {row.cohort_name}
                      </Badge>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary">{row.pathway_block_label ?? "—"}</TableCell>
                  <TableCell>
                    <ChannelIcon className="h-3.5 w-3.5 text-text-muted" />
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary">
                    {row.action_type.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", STATUS_STYLES[row.status] ?? "")}
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-text-muted">
                    {timeAgo(row.created_at)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={page <= 1}
            onClick={() => onPageChangeAction(page - 1)}
          >
            <Icons.chevronLeft className="h-3 w-3" />
            Prev
          </Button>
          <span className="text-xs text-text-muted">
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={page >= pages}
            onClick={() => onPageChangeAction(page + 1)}
          >
            Next
            <Icons.chevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
