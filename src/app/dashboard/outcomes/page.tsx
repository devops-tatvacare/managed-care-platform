import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";

export default function OutcomesPage() {
  return (
    <div>
      <PageHeader title="Outcomes" description="Clinical metrics, HEDIS, and ROI" />
      <EmptyState icon={Icons.outcomes} title="Outcomes Dashboard" description="Clinical and financial outcome tracking." className="mt-8" />
    </div>
  );
}
