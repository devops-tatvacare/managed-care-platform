"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { buildPath } from "@/config/routes";
import type { UpcomingReviewItem } from "@/services/types/command-center";

interface UpcomingReviewsProps {
  items: UpcomingReviewItem[];
  loading: boolean;
}

export function UpcomingReviews({ items, loading }: UpcomingReviewsProps) {
  const router = useRouter();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Icons.calendar className="h-4 w-4" />
            Upcoming Reviews
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icons.calendar className="h-4 w-4" />
          Upcoming Reviews
          <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-muted">No upcoming reviews</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Patient</TableHead>
                <TableHead className="text-xs">Program</TableHead>
                <TableHead className="text-xs">Cohort</TableHead>
                <TableHead className="text-xs">Due</TableHead>
                <TableHead className="text-right text-xs">Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={`${item.patient_id}-${item.program_id}`}
                  className="cursor-pointer"
                  onClick={() => router.push(buildPath("patientDetail", { id: item.patient_id }))}
                >
                  <TableCell className="text-sm font-medium">{item.patient_name}</TableCell>
                  <TableCell className="text-sm text-text-muted">{item.program_name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{ borderColor: item.cohort_color, color: item.cohort_color }}
                    >
                      {item.cohort_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-text-muted">
                    {new Date(item.review_due_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        item.days_until_due <= 3 ? "text-status-error" : item.days_until_due <= 7 ? "text-status-warning" : "text-text-muted"
                      )}
                    >
                      {item.days_until_due}d
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
