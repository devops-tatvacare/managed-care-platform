import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";

export default function CommandCenterPage() {
  return (
    <div>
      <PageHeader title="Command Center" description="AI-driven population overview" />
      <EmptyState icon={Icons.commandCenter} title="Command Center" description="AI action queue, population KPIs, and insights will appear here." className="mt-8" />
    </div>
  );
}
