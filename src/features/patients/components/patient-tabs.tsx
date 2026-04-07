"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CareProtocolsTab } from "@/features/patients/components/care-protocols-tab";
import { ClinicalDataTab } from "@/features/patients/components/clinical-data-tab";
import { TimelineTab } from "@/features/patients/components/timeline-tab";
import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";
import type { PatientDetail, PatientLabRecord } from "@/services/types/patient";

interface PatientTabsProps {
  patient: PatientDetail;
  labs: PatientLabRecord[];
}

export function PatientTabs({ patient, labs }: PatientTabsProps) {
  return (
    <Tabs defaultValue="care-protocols" className="mt-6">
      <TabsList
        variant="line"
        className="w-full justify-start gap-0 rounded-none border-b border-border-default bg-bg-primary px-0"
      >
        {[
          { value: "care-protocols", label: "Care Protocols" },
          { value: "clinical-data", label: "Clinical Data" },
          { value: "timeline", label: "Timeline" },
          { value: "communications", label: "Communications" },
          { value: "claims", label: "Claims" },
          { value: "documents", label: "Documents" },
        ].map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-none px-4 py-2.5 text-xs font-semibold text-text-muted data-[state=active]:text-brand-primary data-[state=active]:shadow-none data-[state=active]:after:bg-brand-primary"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="care-protocols" className="mt-4">
        <CareProtocolsTab patient={patient} />
      </TabsContent>

      <TabsContent value="clinical-data" className="mt-4">
        <ClinicalDataTab patient={patient} labs={labs} />
      </TabsContent>

      <TabsContent value="timeline" className="mt-4">
        <TimelineTab />
      </TabsContent>

      <TabsContent value="communications" className="mt-4">
        <EmptyState
          icon={Icons.communications}
          title="Communications"
          description="Patient communication history will appear here."
        />
      </TabsContent>

      <TabsContent value="claims" className="mt-4">
        <EmptyState
          icon={Icons.claims}
          title="Claims"
          description="Claims data will appear here."
        />
      </TabsContent>

      <TabsContent value="documents" className="mt-4">
        <EmptyState
          icon={Icons.documents}
          title="Documents"
          description="Patient documents will appear here."
        />
      </TabsContent>
    </Tabs>
  );
}
