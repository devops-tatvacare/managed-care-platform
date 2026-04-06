import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";

export function TimelineTab() {
  return (
    <EmptyState
      icon={Icons.pending}
      title="Timeline"
      description="Timeline will show patient activity history."
    />
  );
}
