"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { formatDate, formatPercent } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { Icons } from "@/config/icons";
import type { PatientDetail, PatientLabRecord } from "@/services/types/patient";

interface ClinicalDataTabProps {
  patient: PatientDetail;
  labs: PatientLabRecord[];
}

function labValueColor(testType: string, value: number): string | undefined {
  const t = testType.toLowerCase();
  if (t.includes("hba1c") && value > 7) return "text-red-700 font-semibold";
  if (t.includes("egfr") && value < 60) return "text-yellow-700 font-semibold";
  if (t.includes("ldl") && value > 100) return "text-red-700 font-semibold";
  if (t.includes("creatinine") && value > 1.2) return "text-yellow-700 font-semibold";
  return undefined;
}

function pdcColor(pdc: number): string {
  if (pdc >= 0.8) return "text-green-700";
  if (pdc >= 0.6) return "text-yellow-700";
  return "text-red-700";
}

export function ClinicalDataTab({ patient, labs }: ClinicalDataTabProps) {
  const medications = patient.active_medications ?? [];

  return (
    <div className="space-y-8">
      {/* Key Labs */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Key Labs</h3>
        {labs.length === 0 ? (
          <EmptyState
            icon={Icons.health}
            title="No lab records"
            description="Lab results will appear here once available."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Type</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labs.map((lab) => (
                  <TableRow key={lab.id}>
                    <TableCell className="font-medium text-text-primary">
                      {lab.test_type}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        labValueColor(lab.test_type, lab.value),
                      )}
                    >
                      {lab.value}
                    </TableCell>
                    <TableCell className="text-text-muted">{lab.unit}</TableCell>
                    <TableCell className="text-text-muted">
                      {formatDate(lab.recorded_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Active Medications */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Active Medications</h3>
        {medications.length === 0 ? (
          <EmptyState
            icon={Icons.health}
            title="No active medications"
            description="Medication data will appear here once available."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-default shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead className="text-right">PDC (90d)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medications.map((med, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-text-primary">
                      {med.name}
                    </TableCell>
                    <TableCell className="text-text-secondary">{med.dose}</TableCell>
                    <TableCell className="text-text-muted">{med.frequency}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums font-semibold",
                        pdcColor(med.pdc_90day),
                      )}
                    >
                      {formatPercent(med.pdc_90day * 100, 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
