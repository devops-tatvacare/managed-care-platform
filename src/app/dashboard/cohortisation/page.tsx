import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";

export default function CohortisationPage() {
  return (
    <div>
      <PageHeader title="Cohortisation" description="Tier definitions, CRS weights, and scoring" />
      <EmptyState icon={Icons.cohortisation} title="Cohortisation Engine" description="Configure risk tiers and scoring." className="mt-8" />
    </div>
  );
}
