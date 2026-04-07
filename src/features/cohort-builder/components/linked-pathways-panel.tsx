"use client";

import { Icons } from "@/config/icons";
import { EmptyState } from "@/components/shared/empty-state";

export function LinkedPathwaysPanel() {
  return (
    <EmptyState
      icon={Icons.pathwayBuilder}
      title="No pathways linked yet"
      description="Pathways that reference this program's cohorts will appear here. Pathway linking is available in Phase 4C."
    />
  );
}
