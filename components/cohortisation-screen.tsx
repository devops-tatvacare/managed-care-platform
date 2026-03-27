"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts"
import { motion } from "framer-motion"
import { generatePatientsData, type CohortCode } from "@/lib/generate-patients-data"
import { cn } from "@/lib/utils"

// --- Cohort config (minimal) ---

const cohorts: { code: CohortCode; name: string; color: string; bg: string; ring: string }[] = [
  { code: "C1", name: "Paediatric", color: "#3b82f6", bg: "bg-blue-50", ring: "ring-blue-300" },
  { code: "C2", name: "Maternity", color: "#8b5cf6", bg: "bg-purple-50", ring: "ring-purple-300" },
  { code: "C3", name: "Complex Care", color: "#ef4444", bg: "bg-red-50", ring: "ring-red-300" },
  { code: "C4", name: "Prevention", color: "#22c55e", bg: "bg-green-50", ring: "ring-green-300" },
  { code: "C5", name: "Rising Risk", color: "#f59e0b", bg: "bg-amber-50", ring: "ring-amber-300" },
]

const riskColor = (s: number) => s >= 7 ? "#ef4444" : s >= 4 ? "#f59e0b" : "#22c55e"

const cohortPathways: Record<CohortCode, string[]> = {
  C1: ["P1 Screening", "P2 Lifestyle", "P8 Asthma", "P10 Mental Health"],
  C2: ["P1 Screening", "P2 Lifestyle", "P4 Hypertension", "P6 Diabetes", "P10 Mental Health"],
  C3: ["P4 Hypertension", "P6 Diabetes", "P7 CKD", "P10 Mental Health", "P12 Transitions", "P15 Cancer"],
  C4: ["P1 Screening", "P2 Lifestyle", "P4 Hypertension", "P11 Tobacco"],
  C5: ["P2 Lifestyle", "P3 Prediabetes", "P4 Hypertension", "P5 ASCVD", "P6 Diabetes"],
}

export default function CohortisationScreen() {
  const patients = useMemo(() => generatePatientsData(500), [])
  const [selected, setSelected] = useState<CohortCode | null>(null)
  const [assignOpen, setAssignOpen] = useState<string | null>(null)
  const assignRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!assignOpen) return
    const handler = (e: MouseEvent) => {
      if (assignRef.current && !assignRef.current.contains(e.target as Node)) {
        setAssignOpen(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [assignOpen])

  const stats = useMemo(() => {
    const s: Record<CohortCode, { count: number; totalRisk: number }> = {
      C1: { count: 0, totalRisk: 0 }, C2: { count: 0, totalRisk: 0 },
      C3: { count: 0, totalRisk: 0 }, C4: { count: 0, totalRisk: 0 },
      C5: { count: 0, totalRisk: 0 },
    }
    for (const p of patients) { s[p.cohort].count++; s[p.cohort].totalRisk += p.riskScore }
    return s
  }, [patients])

  const chartData = cohorts.map(c => ({
    code: c.code, name: c.name, risk: stats[c.code].count > 0 ? +(stats[c.code].totalRisk / stats[c.code].count).toFixed(1) : 0, count: stats[c.code].count, color: c.color,
  }))

  const filtered = useMemo(() => selected ? patients.filter(p => p.cohort === selected) : patients, [patients, selected])
  const calcAge = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 31557600000)

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }
  const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } } }

  return (
    <div className="flex-1 flex flex-col h-full bg-[hsl(var(--bg-100))]">
      {/* Header */}
      <div className="bg-white border-b border-[hsl(var(--stroke-grey))] px-5 py-3">
        <h1 className="text-base font-semibold text-[hsl(var(--text-100))]">Cohorts</h1>
        <p className="text-[11px] text-[hsl(var(--text-80))]">{patients.length} members · 5 cohorts</p>
      </div>

      <motion.div className="flex-1 overflow-auto px-5 py-4 space-y-4" variants={stagger} initial="hidden" animate="visible">
        {/* Cohort pills row */}
        <motion.div variants={fadeUp} className="flex gap-2 flex-wrap">
          {cohorts.map(c => {
            const s = stats[c.code]
            const avg = s.count > 0 ? (s.totalRisk / s.count).toFixed(1) : "0"
            const active = selected === c.code
            return (
              <button
                key={c.code}
                onClick={() => setSelected(active ? null : c.code)}
                className={cn(
                  "flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-lg border transition-all text-left",
                  active
                    ? cn("ring-2 ring-offset-1", c.ring, c.bg, "border-transparent")
                    : "bg-white border-[hsl(var(--stroke-grey))] hover:border-gray-300"
                )}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[hsl(var(--text-100))]">{c.code}</span>
                    <span className="text-[11px] text-[hsl(var(--text-80))]">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] tabular-nums font-medium text-[hsl(var(--text-100))]">{s.count}</span>
                    <span className="text-[10px] text-[hsl(var(--text-80))]">risk {avg}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </motion.div>

        {/* Risk chart */}
        <motion.div variants={fadeUp} className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-4">
          <p className="text-xs font-medium text-[hsl(var(--text-100))] mb-3">Average Risk by Cohort</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ left: -8, right: 4, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--stroke-grey))" vertical={false} />
              <XAxis dataKey="code" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--text-80))" }} />
              <YAxis domain={[0, 10]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--text-80))" }} />
              <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(v: any, _: any, item: any) => [`${v}/10`, `${item.payload.name} (${item.payload.count})`]} />
              <Bar dataKey="risk" radius={[4, 4, 0, 0]} barSize={36}>
                {chartData.map(e => <Cell key={e.code} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Patient table */}
        <motion.div variants={fadeUp} className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))]">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-[hsl(var(--text-100))]">
              {selected ? `${cohorts.find(c => c.code === selected)?.name} (${selected})` : "All Members"}
            </p>
            <span className="text-[11px] tabular-nums text-[hsl(var(--text-80))]">{filtered.length}</span>
          </div>
          <div className="max-h-[380px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-[hsl(var(--bg-10))] z-10">
                <TableRow>
                  <TableHead className="text-[11px] py-2">Name</TableHead>
                  <TableHead className="text-[11px] py-2">Age</TableHead>
                  <TableHead className="text-[11px] py-2">City</TableHead>
                  <TableHead className="text-[11px] py-2">Cohort</TableHead>
                  <TableHead className="text-[11px] py-2">Risk</TableHead>
                  <TableHead className="text-[11px] py-2">Pathway</TableHead>
                  <TableHead className="text-[11px] py-2">Assign</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 80).map(p => (
                  <TableRow key={p.empiId} className="hover:bg-[hsl(var(--bg-10))] transition-colors">
                    <TableCell className="py-1.5 text-xs font-medium">{p.name}</TableCell>
                    <TableCell className="py-1.5 text-xs tabular-nums text-[hsl(var(--text-80))]">{calcAge(p.dateOfBirth)}</TableCell>
                    <TableCell className="py-1.5 text-xs text-[hsl(var(--text-80))]">{p.address.split(", ").slice(-2, -1)[0] || "-"}</TableCell>
                    <TableCell className="py-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cohorts.find(c => c.code === p.cohort)?.color }} />
                        {p.cohort}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-xs font-medium tabular-nums" style={{ color: riskColor(p.riskScore) }}>{p.riskScore}</span>
                    </TableCell>
                    <TableCell className="py-1.5 text-[11px] text-[hsl(var(--text-80))]">{p.programName}</TableCell>
                    <TableCell className="py-1.5">
                      <div className="relative" ref={assignOpen === p.empiId ? assignRef : undefined}>
                        <button
                          onClick={() => setAssignOpen(assignOpen === p.empiId ? null : p.empiId)}
                          className="text-[10px] font-medium px-2 py-0.5 rounded border border-[#00447C] text-[#00447C] hover:bg-[#00447C0a] transition-colors"
                        >
                          Assign
                        </button>
                        {assignOpen === p.empiId && (
                          <div className="absolute z-20 bg-white border rounded-lg shadow-lg mt-1 right-0 min-w-[160px] py-1">
                            {cohortPathways[p.cohort].map(pw => (
                              <button
                                key={pw}
                                onClick={() => setAssignOpen(null)}
                                className="w-full text-left text-[11px] px-3 py-1.5 hover:bg-[hsl(var(--bg-10))] text-[hsl(var(--text-100))] transition-colors"
                              >
                                {pw}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 80 && (
            <p className="text-[10px] text-[hsl(var(--text-80))] text-center py-2">Showing 80 of {filtered.length}</p>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
