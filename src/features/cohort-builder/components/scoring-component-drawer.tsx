"use client";

import { useEffect, useState } from "react";
import type { ScoringComponentConfig } from "@/services/types/program";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Icons } from "@/config/icons";

const DATA_SOURCES = [
  { value: "lab_range", label: "Lab Range" },
  { value: "diagnosis_match", label: "Diagnosis Match" },
  { value: "pharmacy_adherence", label: "Pharmacy Adherence" },
  { value: "utilisation", label: "Utilisation" },
  { value: "sdoh", label: "SDOH" },
];

interface ScoringComponentDrawerProps {
  component: ScoringComponentConfig | null;
  open: boolean;
  onClose: () => void;
  onSave: (component: ScoringComponentConfig) => void;
  onDelete: () => void;
}

export function ScoringComponentDrawer({ component, open, onClose, onSave, onDelete }: ScoringComponentDrawerProps) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [dataSource, setDataSource] = useState("lab_range");
  const [weight, setWeight] = useState(0);
  const [cap, setCap] = useState(100);
  const [scoringTable, setScoringTable] = useState<Array<{ criterion: string; points: number }>>([]);

  useEffect(() => {
    if (component) {
      setName(component.name);
      setLabel(component.label ?? "");
      setDataSource(component.data_source);
      setWeight(component.weight);
      setCap(component.cap);
      setScoringTable(
        (component.scoring_table ?? []).map((row) => ({
          criterion: String(row.criterion ?? ""),
          points: Number(row.points ?? 0),
        }))
      );
    }
  }, [component]);

  const handleSave = () => {
    onSave({
      ...component,
      name,
      label,
      data_source: dataSource,
      weight,
      cap,
      scoring_table: scoringTable,
    } as ScoringComponentConfig);
  };

  const addRow = () => {
    setScoringTable([...scoringTable, { criterion: "", points: 0 }]);
  };

  const updateRow = (index: number, field: "criterion" | "points", value: string | number) => {
    const updated = [...scoringTable];
    updated[index] = { ...updated[index], [field]: value };
    setScoringTable(updated);
  };

  const deleteRow = (index: number) => {
    setScoringTable(scoringTable.filter((_, i) => i !== index));
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Scoring Component</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Internal Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. hba1c_score" />
          </div>

          {/* Label */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Display Label</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. HbA1c Score" />
          </div>

          {/* Data Source */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Data Source</label>
            <Select value={dataSource} onValueChange={setDataSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATA_SOURCES.map((ds) => (
                  <SelectItem key={ds.value} value={ds.value}>{ds.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Weight */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Weight (%)</label>
            <div className="flex items-center gap-3">
              <Slider
                value={[weight]}
                onValueChange={([v]) => setWeight(v)}
                min={0}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="w-10 text-right text-sm font-medium text-text-primary">{weight}%</span>
            </div>
          </div>

          {/* Cap */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Point Cap</label>
            <Input type="number" value={cap} onChange={(e) => setCap(Number(e.target.value))} />
          </div>

          <Separator />

          {/* Scoring Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-text-muted">Scoring Rules</label>
              <Button variant="ghost" size="xs" onClick={addRow} className="text-text-muted">
                <Icons.plus className="mr-1 h-3 w-3" />
                Add Row
              </Button>
            </div>

            {scoringTable.length > 0 ? (
              <div className="rounded-lg border border-border-default">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Criterion</TableHead>
                      <TableHead className="w-20 text-xs">Points</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scoringTable.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="p-1.5">
                          <Input
                            value={row.criterion}
                            onChange={(e) => updateRow(i, "criterion", e.target.value)}
                            className="h-7 text-xs"
                            placeholder="e.g. HbA1c >= 10%"
                          />
                        </TableCell>
                        <TableCell className="p-1.5">
                          <Input
                            type="number"
                            value={row.points}
                            onChange={(e) => updateRow(i, "points", Number(e.target.value))}
                            className="h-7 text-xs"
                          />
                        </TableCell>
                        <TableCell className="p-1.5">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => deleteRow(i)}
                            className="text-text-placeholder hover:text-status-error"
                          >
                            <Icons.close className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border-default p-4 text-center text-xs text-text-muted">
                No scoring rules yet. Click "Add Row" to start.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Icons.close className="mr-1.5 h-3.5 w-3.5" />
            Remove
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
