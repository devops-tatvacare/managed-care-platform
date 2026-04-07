"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Icons } from "@/config/icons";
import { PATHWAY_STATUS } from "@/config/status";
import { buildPath } from "@/config/routes";
import { formatDate } from "@/lib/format";
import { usePathwayBuilderStore } from "@/stores/pathway-builder-store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function PathwaysPage() {
  const router = useRouter();

  const { pathways, total, loading, error, loadPathways, createPathway } =
    usePathwayBuilderStore();

  useEffect(() => {
    loadPathways();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = useCallback(async () => {
    try {
      const id = await createPathway({ name: "Untitled Pathway" });
      router.push(buildPath("pathwayEditor", { id }));
    } catch {
      // error is set in store
    }
  }, [createPathway, router]);

  const handleRowClick = useCallback(
    (id: string) => {
      router.push(buildPath("pathwayEditor", { id }));
    },
    [router],
  );

  const Spinner = Icons.spinner;

  return (
    <div className="flex h-full flex-col">
      {/* Fixed top: header */}
      <div className="shrink-0">
        <PageHeader
          title="Pathway Builder"
          description={loading ? "Loading..." : `${total} pathways`}
          actions={
            <Button onClick={handleCreate}>
              <Icons.plus className="mr-1.5 h-4 w-4" />
              Create Pathway
            </Button>
          }
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 shrink-0 rounded-md border border-status-error-border bg-status-error-bg p-3 text-sm text-status-error">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-12 flex flex-1 items-center justify-center">
          <Spinner className="h-6 w-6 animate-spin text-text-muted" />
        </div>
      )}

      {/* Empty */}
      {!loading && !error && pathways.length === 0 && (
        <EmptyState
          icon={Icons.pathwayBuilder}
          title="No pathways yet"
          description="Create your first care pathway to get started."
          className="mt-8"
        />
      )}

      {/* Table — scrollable within remaining viewport */}
      {!loading && pathways.length > 0 && (
        <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border-default shadow-sm">
          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Tiers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Blocks</TableHead>
                  <TableHead className="text-right">Version</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pathways.map((p) => (
                  <TableRow
                    key={p.id}
                    onClick={() => handleRowClick(p.id)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium text-text-primary">
                      {p.name}
                    </TableCell>
                    <TableCell className="text-text-secondary text-sm">
                      {p.condition ?? "--"}
                    </TableCell>
                    <TableCell className="text-text-muted text-sm">
                      {p.target_tiers.length > 0 ? p.target_tiers.join(", ") : "--"}
                    </TableCell>
                    <TableCell>
                      {PATHWAY_STATUS[p.status] ? (
                        <StatusBadge config={PATHWAY_STATUS[p.status]} />
                      ) : (
                        p.status
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.block_count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      v{p.version}
                    </TableCell>
                    <TableCell className="text-text-muted text-sm">
                      {formatDate(p.updated_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
