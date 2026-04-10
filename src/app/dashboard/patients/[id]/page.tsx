"use client";

import { useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePatientsStore } from "@/stores/patients-store";
import { ROUTES } from "@/config/routes";
import { Icons } from "@/config/icons";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { PatientHeader } from "@/features/patients/components/patient-header";
import { PatientKpiStrip } from "@/features/patients/components/patient-kpi-strip";
import { AISummaryCard } from "@/features/patients/components/ai-summary-card";
import { PatientTabs } from "@/features/patients/components/patient-tabs";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PatientDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? undefined;
  const {
    selectedPatient,
    labs,
    diagnoses,
    detailLoading,
    error,
    loadPatient,
    loadLabs,
    loadDiagnoses,
  } = usePatientsStore();

  useEffect(() => {
    loadPatient(id);
    loadLabs(id);
    loadDiagnoses(id);
  }, [id, loadPatient, loadLabs, loadDiagnoses]);

  const Spinner = Icons.spinner;

  if (detailLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!selectedPatient) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Icons.patients className="h-10 w-10 text-text-placeholder" />
        <h3 className="mt-3 text-sm font-semibold text-text-primary">
          {error ? "Error loading patient" : "Patient not found"}
        </h3>
        {error && <p className="mt-1 text-xs text-status-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={ROUTES.patients.path}>Patients</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {selectedPatient.first_name} {selectedPatient.last_name}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PatientHeader patient={selectedPatient} diagnoses={diagnoses} />
      <PatientKpiStrip patient={selectedPatient} />
      <AISummaryCard patientId={id} />
      <PatientTabs patient={selectedPatient} labs={labs} initialTab={initialTab} />
    </div>
  );
}
