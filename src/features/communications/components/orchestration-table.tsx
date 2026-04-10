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

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  call: "Call",
  app_push: "Push",
  system: "System",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "border-yellow-300 text-yellow-700 bg-yellow-50 dark:border-yellow-700 dark:text-yellow-300 dark:bg-yellow-950",
  success: "border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-950",
  failed: "border-red-300 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-300 dark:bg-red-950",
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
  total?: number;
  onPageChangeAction: (page: number) => void;
}

export function OrchestrationTable({ rows, loading, page, pages, total, onPageChangeAction }: OrchestrationTableProps) {
  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-[calc(var(--radius-panel)-6px)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead>Pathway Step</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Attempt</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Last Activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-text-muted">
                  No orchestration data found
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const ChannelIcon = CHANNEL_ICONS[row.channel] ?? Icons.outreach;
              return (
                <TableRow key={row.action_id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <Link
                        href={buildPath("patientDetail", { id: row.patient_id })}
                        className="text-sm font-medium text-brand-primary hover:underline"
                      >
                        {row.patient_name}
                      </Link>
                      {row.template_name && (
                        <p className="text-[11px] text-text-muted">{row.template_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">
                    {row.program_name ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Icons.cohortisation className="h-3 w-3 shrink-0 text-text-placeholder" />
                        {row.program_name}
                      </span>
                    ) : (
                      <span className="text-text-placeholder">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.cohort_name ? (
                      <Badge variant="outline" className="text-[10px]">
                        {row.cohort_name}
                      </Badge>
                    ) : (
                      <span className="text-sm text-text-placeholder">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">
                    {row.pathway_block_label ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Icons.pathwayBuilder className="h-3 w-3 shrink-0 text-text-placeholder" />
                        {row.pathway_block_label}
                      </span>
                    ) : (
                      <span className="text-text-placeholder">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <ChannelIcon className="h-3.5 w-3.5 text-text-muted" />
                      <span className="text-sm text-text-secondary">
                        {CHANNEL_LABELS[row.channel] ?? row.channel}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">
                    {row.action_type.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] capitalize", STATUS_STYLES[row.status] ?? "")}
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-text-muted">
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
        <div className="flex items-center justify-between pb-1">
          <p className="text-sm text-text-muted">
            Page {page} of {pages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChangeAction(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => onPageChangeAction(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
