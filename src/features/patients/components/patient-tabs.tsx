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
      <TabsList>
        <TabsTrigger value="care-protocols">Care Protocols</TabsTrigger>
        <TabsTrigger value="clinical-data">Clinical Data</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="communications">Communications</TabsTrigger>
        <TabsTrigger value="risk-crs">Risk & CRS</TabsTrigger>
        <TabsTrigger value="claims">Claims</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
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

      <TabsContent value="risk-crs" className="mt-4">
        <EmptyState
          icon={Icons.risk}
          title="Risk & CRS"
          description="Clinical risk score breakdown will appear here."
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
