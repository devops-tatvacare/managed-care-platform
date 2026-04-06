import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";

export default function PatientsPage() {
  return (
    <div>
      <PageHeader title="Patients" description="Patient registry and search" />
      <EmptyState icon={Icons.patients} title="Patient Registry" description="Search and manage patients." className="mt-8" />
    </div>
  );
}
