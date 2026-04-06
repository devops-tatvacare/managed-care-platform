import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";

export default function PathwaysPage() {
  return (
    <div>
      <PageHeader title="Pathway Builder" description="Create and manage care pathways" />
      <EmptyState icon={Icons.pathwayBuilder} title="Pathway Builder" description="Design care pathways with AI or drag-and-drop." className="mt-8" />
    </div>
  );
}
