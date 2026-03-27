"use client"

import { useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, Area, AreaChart } from "recharts"
import { TrendingUp, TrendingDown, Users, Activity, BarChart3, Heart, Zap } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

// --- Data ---

const cohortDistribution = [
  { cohort: "C1", name: "Paediatric", count: 1285, color: "#3b82f6" },
  { cohort: "C2", name: "Maternity", count: 1285, color: "#8b5cf6" },
  { cohort: "C3", name: "Complex", count: 1927, color: "#ef4444" },
  { cohort: "C4", name: "Prevention", count: 5139, color: "#22c55e" },
  { cohort: "C5", name: "Cardio-met", count: 3211, color: "#f59e0b" },
]

const enrollmentTrend = [
  { month: "Apr", members: 4200 },
  { month: "May", members: 4890 },
  { month: "Jun", members: 5430 },
  { month: "Jul", members: 6120 },
  { month: "Aug", members: 6780 },
  { month: "Sep", members: 7210 },
  { month: "Oct", members: 7650 },
  { month: "Nov", members: 8100 },
  { month: "Dec", members: 8540 },
  { month: "Jan", members: 9020 },
  { month: "Feb", members: 9450 },
  { month: "Mar", members: 9812 },
]

const riskDistribution = [
  { score: "1", count: 520 }, { score: "2", count: 890 }, { score: "3", count: 1450 },
  { score: "4", count: 1820 }, { score: "5", count: 2100 }, { score: "6", count: 1950 },
  { score: "7", count: 1630 }, { score: "8", count: 1210 }, { score: "9", count: 780 },
  { score: "10", count: 497 },
]

const pathwayOutcomes = [
  { pathway: "P2 Lifestyle", enrolled: 1847, adherence: 82, kpi: "3.1% BMI ↓", claims: "-11%" },
  { pathway: "P3 Prediabetes", enrolled: 623, adherence: 76, kpi: "0.4% HbA1c ↓", claims: "-8%" },
  { pathway: "P4 Hypertension", enrolled: 892, adherence: 79, kpi: "12mmHg BP ↓", claims: "-9%" },
  { pathway: "P6 Diabetes", enrolled: 1204, adherence: 74, kpi: "1.2% HbA1c ↓", claims: "-15%" },
  { pathway: "P8 Asthma", enrolled: 456, adherence: 81, kpi: "40% fewer events", claims: "-7%" },
  { pathway: "P10 Mental Health", enrolled: 734, adherence: 68, kpi: "PHQ-9 +4pts", claims: "-5%" },
  { pathway: "P12 Transitions", enrolled: 298, adherence: 85, kpi: "22% fewer readmit", claims: "-18%" },
  { pathway: "P15 Cancer", enrolled: 89, adherence: 91, kpi: "35% fewer gaps", claims: "-14%" },
]

// --- Metric pill ---

function Metric({ label, value, trend, icon: Icon, accent }: {
  label: string; value: string; trend?: number; icon: React.ComponentType<any>; accent: string
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white border border-[hsl(var(--stroke-grey))]">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}12` }}>
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-[hsl(var(--text-80))] leading-none mb-1 truncate">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold text-[hsl(var(--text-100))] leading-none">{value}</span>
          {trend !== undefined && (
            <span className={cn("text-[10px] flex items-center gap-0.5 font-medium leading-none",
              trend >= 0 ? "text-emerald-600" : "text-red-500"
            )}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Adherence bar ---

function AdherenceBar({ value }: { value: number }) {
  const color = value >= 80 ? "#22c55e" : value >= 70 ? "#f59e0b" : "#ef4444"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium tabular-nums" style={{ color }}>{value}%</span>
    </div>
  )
}

// --- Chart label ---

const chartLabel = (text: string) => (
  <p className="text-xs font-medium text-[hsl(var(--text-100))] mb-3">{text}</p>
)

// --- Screen ---

export default function InsurerOverviewScreen() {
  const [activeTab, setActiveTab] = useState<"overview" | "outcomes">("overview")

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }
  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[hsl(var(--bg-100))]">
      {/* Compact header */}
      <div className="bg-white border-b border-[hsl(var(--stroke-grey))] px-5 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-[hsl(var(--text-100))]">Care Operations</h1>
          <p className="text-[11px] text-[hsl(var(--text-80))]">Population health · Pathway performance</p>
        </div>
        <div className="flex rounded-lg border border-[hsl(var(--stroke-grey))] overflow-hidden">
          {(["overview", "outcomes"] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                activeTab === t
                  ? "bg-[hsl(var(--brand-primary))] text-white"
                  : "text-[hsl(var(--text-80))] hover:bg-[hsl(var(--bg-10))]"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        className="flex-1 overflow-auto px-5 py-4 space-y-4"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {activeTab === "overview" && (
          <>
            {/* KPI row */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <Metric label="Total Members" value="12,847" trend={3.2} icon={Users} accent="#00447C" />
              <Metric label="Active Pathways" value="8 / 15" icon={Activity} accent="#22c55e" />
              <Metric label="Avg Risk Score" value="4.2" icon={BarChart3} accent="#f59e0b" />
              <Metric label="Claims Impact" value="-12%" trend={-12} icon={Zap} accent="#CC092F" />
              <Metric label="Engagement" value="73%" trend={5.1} icon={Heart} accent="#8b5cf6" />
            </motion.div>

            {/* Charts row */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-5 gap-3">
              {/* Cohort bar — 2 cols */}
              <div className="lg:col-span-2 bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-4">
                {chartLabel("Members by Cohort")}
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={cohortDistribution} margin={{ left: -8, right: 4, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--stroke-grey))" vertical={false} />
                    <XAxis dataKey="cohort" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--text-80))" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--text-80))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      formatter={(value: any, _: any, item: any) => [`${Number(value).toLocaleString()}`, item.payload.name]}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={32}>
                      {cohortDistribution.map((e) => <Cell key={e.cohort} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Enrollment trend — 3 cols */}
              <div className="lg:col-span-3 bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-4">
                {chartLabel("Enrollment Trend")}
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={enrollmentTrend} margin={{ left: -8, right: 4, top: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00447C" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#00447C" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--stroke-grey))" vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--text-80))" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--text-80))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(v: any) => [`${Number(v).toLocaleString()}`, "Members"]} />
                    <Area type="monotone" dataKey="members" stroke="#00447C" strokeWidth={2} fill="url(#enrollGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Risk distribution */}
            <motion.div variants={fadeUp} className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-4">
              {chartLabel("Risk Score Distribution")}
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={riskDistribution} margin={{ left: -8, right: 4, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--stroke-grey))" vertical={false} />
                  <XAxis dataKey="score" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--text-80))" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--text-80))" }} />
                  <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} formatter={(v: any) => [`${Number(v).toLocaleString()}`, "Members"]} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} barSize={28}>
                    {riskDistribution.map((e) => {
                      const s = Number(e.score)
                      return <Cell key={e.score} fill={s <= 3 ? "#22c55e" : s <= 6 ? "#f59e0b" : "#ef4444"} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </>
        )}

        {activeTab === "outcomes" && (
          <motion.div variants={fadeUp} className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))]">
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs font-medium text-[hsl(var(--text-100))]">Pathway Outcomes</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[hsl(var(--stroke-grey))] bg-[hsl(var(--bg-10))]">
                    <th className="text-left py-2 px-4 font-medium text-[hsl(var(--text-80))]">Pathway</th>
                    <th className="text-right py-2 px-4 font-medium text-[hsl(var(--text-80))]">Enrolled</th>
                    <th className="text-left py-2 px-4 font-medium text-[hsl(var(--text-80))] w-32">Adherence</th>
                    <th className="text-left py-2 px-4 font-medium text-[hsl(var(--text-80))]">Key Outcome</th>
                    <th className="text-right py-2 px-4 font-medium text-[hsl(var(--text-80))]">Claims</th>
                  </tr>
                </thead>
                <tbody>
                  {pathwayOutcomes.map((r) => (
                    <tr key={r.pathway} className="border-b border-[hsl(var(--stroke-grey))] last:border-0 hover:bg-[hsl(var(--bg-10))] transition-colors">
                      <td className="py-2.5 px-4 font-medium text-[hsl(var(--text-100))]">{r.pathway}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-[hsl(var(--text-80))]">{r.enrolled.toLocaleString()}</td>
                      <td className="py-2.5 px-4"><AdherenceBar value={r.adherence} /></td>
                      <td className="py-2.5 px-4 text-[hsl(var(--text-80))]">{r.kpi}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-emerald-600">{r.claims}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
