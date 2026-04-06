import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";

export default function CommunicationsPage() {
  return (
    <div>
      <PageHeader title="Communications" description="AI concierge and message threads" />
      <EmptyState icon={Icons.communications} title="Communications" description="AI orchestration and outreach threads." className="mt-8" />
    </div>
  );
}
