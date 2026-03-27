"use client"

import { useState } from "react"
import { ArrowLeft, ChevronRight, CheckCircle2, Plus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import PathwayBuilder from "@/components/pathway-builder"

// --- Types ---

type PathwayStatus = "Active" | "Draft" | "Planned"

interface Pathway {
  code: string; name: string; description: string; status: PathwayStatus
  cohorts: string[]; members?: number; hasDetail?: boolean
}

interface TimelineNode {
  title: string; description: string; actors: string[]; dataInputs?: string[]
}

interface PathwayDetail {
  code: string; name: string; target: string
  kpis: { label: string; value: string }[]
  modules: string[]; cohorts: string[]
  careTeam?: string[]; tiers?: { name: string; desc: string }[]
  timeline: TimelineNode[]
}

// --- Data ---

const pathways: Pathway[] = [
  { code: "P1", name: "Preventive Screening", description: "Vaccination compliance & screening schedules", status: "Active", cohorts: ["C1", "C4", "C5"], members: 2341 },
  { code: "P2", name: "Lifestyle Optimisation", description: "Behavioural interventions for at-risk members", status: "Active", cohorts: ["C4", "C5"], members: 1847, hasDetail: true },
  { code: "P3", name: "Prediabetes Prevention", description: "Prevent progression to Type 2 diabetes", status: "Active", cohorts: ["C5"], members: 623 },
  { code: "P4", name: "Hypertension Control", description: "BP management & medication adherence", status: "Active", cohorts: ["C4", "C5"], members: 892 },
  { code: "P5", name: "ASCVD Risk", description: "Cardiovascular disease risk reduction", status: "Active", cohorts: ["C3", "C5"], members: 341 },
  { code: "P6", name: "Diabetes Management", description: "Tiered chronic diabetes care", status: "Active", cohorts: ["C3", "C5"], members: 1204, hasDetail: true },
  { code: "P7", name: "CKD Slowing", description: "Kidney disease staging & referral", status: "Active", cohorts: ["C3"], members: 187 },
  { code: "P8", name: "Asthma Control", description: "Inhaler technique & trigger management", status: "Active", cohorts: ["C1", "C3"], members: 456 },
  { code: "P9", name: "COPD Maintenance", description: "Pulmonary rehab & prevention", status: "Planned", cohorts: ["C3"] },
  { code: "P10", name: "Mental Health", description: "Screening, CBT & psychiatric coordination", status: "Active", cohorts: ["C1", "C2", "C3"], members: 734 },
  { code: "P11", name: "Tobacco Cessation", description: "NRT, counselling & digital coaching", status: "Draft", cohorts: ["C4", "C5"] },
  { code: "P12", name: "Care Transitions", description: "Post-discharge readmission prevention", status: "Active", cohorts: ["C3"], members: 298 },
  { code: "P13", name: "PCOS Management", description: "PCOS screening & management", status: "Planned", cohorts: ["C2"] },
  { code: "P14", name: "Liver Care", description: "NAFLD/NASH screening & referral", status: "Draft", cohorts: ["C3"] },
  { code: "P15", name: "Cancer Navigation", description: "End-to-end oncology coordination", status: "Active", cohorts: ["C3"], members: 89, hasDetail: true },
]

const statusStyle: Record<PathwayStatus, string> = {
  Active: "text-emerald-600 bg-emerald-50",
  Draft: "text-gray-500 bg-gray-50",
  Planned: "text-blue-600 bg-blue-50",
}

const cohortDot: Record<string, string> = {
  C1: "#3b82f6", C2: "#8b5cf6", C3: "#ef4444", C4: "#22c55e", C5: "#f59e0b",
}

// --- Detail data ---

const details: Record<string, PathwayDetail> = {
  P2: {
    code: "P2", name: "Lifestyle Optimisation",
    target: "BMI ≥ 25 · Steps < 5k/day · Borderline BP/lipids",
    kpis: [{ label: "BMI Reduction", value: "≥ 3%" }, { label: "Activity", value: "≥ 150 min/wk" }, { label: "OPD Claims", value: "-8–12%" }],
    modules: ["Teleconsult", "Exercise Plans", "Nutrition", "CBT", "Supplements"],
    cohorts: ["C4", "C5"],
    timeline: [
      { title: "Silent Identification", description: "Claims + wearable data flags eligible members", actors: ["Data Engine"] },
      { title: "Entry Trigger", description: "App or SMS invitation to member", actors: ["Coordinator"] },
      { title: "Medical Safety Gate", description: "Physician review for contraindications", actors: ["Physician"] },
      { title: "Personalisation", description: "AI-generated plan based on risk and preferences", actors: ["AI Engine", "Nutritionist"] },
      { title: "Daily Engagement", description: "Nudges, step goals, micro-coaching", actors: ["Coach", "App"] },
      { title: "Monthly Review", description: "Coach + physician adjust targets", actors: ["Coach", "Physician"] },
      { title: "Annual Outcome", description: "Full clinical review: BMI, HbA1c, lipids, BP", actors: ["Physician"] },
    ],
  },
  P6: {
    code: "P6", name: "Diabetes Management",
    target: "HbA1c 7–10% · ≥ 1 diabetes claim · ≥ 2 chronic meds",
    kpis: [{ label: "HbA1c", value: "↓ 1–1.5%" }, { label: "Med Adherence", value: "> 80%" }, { label: "Screening", value: "> 70%" }],
    modules: ["CGM Monitoring", "Medication Packs", "Diagnostics", "Nurse Check-ins"],
    cohorts: ["C3", "C5"],
    careTeam: ["Nurse Care Manager", "Nutritionist", "Exercise Coach", "Psychologist", "Endocrinologist"],
    tiers: [
      { name: "Tier 1 · Stable", desc: "Standard nutrition & exercise coaching" },
      { name: "Tier 2 · Uncontrolled", desc: "CGM + intensive nutrition + frequent check-ins" },
      { name: "Tier 3 · High-risk", desc: "Endocrinologist + advanced diagnostics" },
    ],
    timeline: [
      { title: "Risk Stratification", description: "Tier assignment from HbA1c, claims, Rx count", actors: ["Data Engine", "Nurse"] },
      { title: "Program Activation", description: "Welcome call, device dispatch, care plan", actors: ["Nurse"] },
      { title: "Continuous Care", description: "Weekly coaching, meals, exercise", actors: ["Nutritionist", "Coach"] },
      { title: "CGM Monitoring", description: "Real-time glucose for Tier 2–3", actors: ["Nurse", "Endo"] },
      { title: "Medication Adherence", description: "Pre-sorted packs, refill reminders", actors: ["Pharmacist", "Nurse"] },
      { title: "Preventive Screening", description: "Eye, foot, kidney, cardiac screening", actors: ["Coordinator"] },
      { title: "Escalation", description: "Specialist referral if targets unmet 3+ months", actors: ["Endo", "Nurse"] },
    ],
  },
  P15: {
    code: "P15", name: "Cancer Navigation",
    target: "Suspected · Newly diagnosed · Active treatment · Survivors",
    kpis: [{ label: "Interruptions", value: "↓" }, { label: "Unplanned Admits", value: "↓" }, { label: "Caregiver Distress", value: "↓" }],
    modules: ["Diagnosis Explanation", "2nd Opinion", "Treatment Coordination", "Pain Mgmt", "Return-to-Work"],
    cohorts: ["C3"],
    careTeam: ["Nurse Navigator 1:1", "Oncologist", "Psychologist", "Caregiver Support"],
    timeline: [
      { title: "Suspicion Detection", description: "Abnormal screening or imaging triggers entry", actors: ["PCP", "Data Engine"] },
      { title: "Navigator Assignment", description: "1:1 nurse navigator within 48 hours", actors: ["Navigator"] },
      { title: "Treatment Orchestration", description: "MDT plan, facility and surgeon coordination", actors: ["Oncologist", "Navigator"] },
      { title: "Active Support", description: "Scheduling, side-effect triage, nutrition", actors: ["Navigator", "Pharmacist"] },
      { title: "Psych Support", description: "Patient and caregiver emotional support", actors: ["Psychologist"] },
      { title: "Recovery & Return", description: "Rehab, return-to-work planning", actors: ["Navigator", "OT"] },
      { title: "Survivorship", description: "Recurrence surveillance, wellness planning", actors: ["Oncologist", "PCP"] },
    ],
  },
}

// --- Detail view ---

function DetailView({ d, onBack }: { d: PathwayDetail; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-[hsl(var(--text-80))] hover:text-[hsl(var(--text-100))] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#00447C14", color: "#00447C" }}>{d.code}</span>
          <h2 className="text-base font-semibold text-[hsl(var(--text-100))]">{d.name}</h2>
        </div>
        <p className="text-[11px] text-[hsl(var(--text-80))] mt-1">{d.target}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-4">
          <p className="text-xs font-medium text-[hsl(var(--text-100))] mb-4">Care Journey</p>
          <div className="relative">
            {d.timeline.map((n, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.25 }}
                className="flex gap-3 mb-4 last:mb-0"
              >
                {/* Step indicator */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                    i === d.timeline.length - 1 ? "bg-emerald-500" : ""
                  )} style={{ backgroundColor: i < d.timeline.length - 1 ? "#00447C" : undefined }}>
                    {i === d.timeline.length - 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  {i < d.timeline.length - 1 && <div className="w-px flex-1 min-h-[16px] bg-gray-200" />}
                </div>
                {/* Content */}
                <div className="pt-0.5 pb-1">
                  <p className="text-xs font-semibold text-[hsl(var(--text-100))] leading-tight">{n.title}</p>
                  <p className="text-[11px] text-[hsl(var(--text-80))] mt-0.5 leading-snug">{n.description}</p>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {n.actors.map(a => (
                      <span key={a} className="text-[10px] px-1.5 py-px rounded bg-gray-100 text-gray-600">{a}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-3">
          {/* KPIs */}
          <div className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-3">
            <p className="text-[11px] font-medium text-[hsl(var(--text-80))] mb-2">KPIs</p>
            {d.kpis.map(k => (
              <div key={k.label} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                <span className="text-[11px] text-[hsl(var(--text-80))]">{k.label}</span>
                <span className="text-[11px] font-semibold" style={{ color: "#00447C" }}>{k.value}</span>
              </div>
            ))}
          </div>

          {/* Modules */}
          <div className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-3">
            <p className="text-[11px] font-medium text-[hsl(var(--text-80))] mb-2">Modules</p>
            <div className="flex flex-wrap gap-1">
              {d.modules.map(m => (
                <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--bg-10))] text-[hsl(var(--text-80))]">{m}</span>
              ))}
            </div>
          </div>

          {/* Cohorts */}
          <div className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-3">
            <p className="text-[11px] font-medium text-[hsl(var(--text-80))] mb-2">Cohorts</p>
            <div className="flex gap-1.5">
              {d.cohorts.map(c => (
                <span key={c} className="inline-flex items-center gap-1 text-[11px] font-medium text-[hsl(var(--text-100))]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cohortDot[c] }} />{c}
                </span>
              ))}
            </div>
          </div>

          {/* Care Team */}
          {d.careTeam && (
            <div className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-3">
              <p className="text-[11px] font-medium text-[hsl(var(--text-80))] mb-2">Care Team</p>
              <div className="space-y-1">
                {d.careTeam.map(m => (
                  <p key={m} className="text-[11px] text-[hsl(var(--text-100))] flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-[#00447C]" />{m}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Tiers */}
          {d.tiers && (
            <div className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-3">
              <p className="text-[11px] font-medium text-[hsl(var(--text-80))] mb-2">Support Tiers</p>
              <div className="space-y-1.5">
                {d.tiers.map(t => (
                  <div key={t.name} className="px-2 py-1.5 rounded bg-[hsl(var(--bg-10))]">
                    <p className="text-[11px] font-semibold text-[hsl(var(--text-100))]">{t.name}</p>
                    <p className="text-[10px] text-[hsl(var(--text-80))] mt-0.5">{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// --- Main screen ---

export default function CarePathwaysScreen() {
  const [detailCode, setDetailCode] = useState<string | null>(null)
  const [builderMode, setBuilderMode] = useState(false)

  const activeCount = pathways.filter(p => p.status === "Active").length
  const totalMembers = pathways.reduce((s, p) => s + (p.members || 0), 0)

  if (builderMode) {
    return <PathwayBuilder onClose={() => setBuilderMode(false)} />
  }

  if (detailCode && details[detailCode]) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[hsl(var(--bg-100))]">
        <div className="bg-white border-b border-[hsl(var(--stroke-grey))] px-5 py-3">
          <h1 className="text-base font-semibold text-[hsl(var(--text-100))]">Care Pathways</h1>
        </div>
        <div className="flex-1 overflow-auto px-5 py-4">
          <AnimatePresence mode="wait">
            <DetailView key={detailCode} d={details[detailCode]} onBack={() => setDetailCode(null)} />
          </AnimatePresence>
        </div>
      </div>
    )
  }

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.03 } } }
  const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

  return (
    <div className="flex-1 flex flex-col h-full bg-[hsl(var(--bg-100))]">
      <div className="bg-white border-b border-[hsl(var(--stroke-grey))] px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-[hsl(var(--text-100))]">Care Pathways</h1>
            <p className="text-[11px] text-[hsl(var(--text-80))]">Vias de Cuidado · {activeCount} active · {totalMembers.toLocaleString()} members</p>
          </div>
          <Button size="sm" className="gap-1 text-xs text-white" style={{ backgroundColor: "#00447C" }} onClick={() => setBuilderMode(true)}>
            <Plus className="w-3.5 h-3.5" /> Create Pathway
          </Button>
        </div>
      </div>

      <motion.div className="flex-1 overflow-auto px-5 py-4 space-y-4" variants={stagger} initial="hidden" animate="visible">
        {/* Stats row */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-3">
          {[
            { label: "Active", value: `${activeCount}/${pathways.length}` },
            { label: "Enrolled", value: totalMembers.toLocaleString() },
            { label: "Adherence", value: "78%" },
            { label: "Claims", value: "-12%" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))] px-3 py-2.5">
              <p className="text-[10px] text-[hsl(var(--text-80))]">{s.label}</p>
              <p className="text-sm font-semibold text-[hsl(var(--text-100))] mt-0.5">{s.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Pathway grid */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {pathways.map((pw) => (
            <div
              key={pw.code}
              onClick={() => pw.hasDetail && setDetailCode(pw.code)}
              className={cn(
                "bg-white rounded-lg border border-[hsl(var(--stroke-grey))] px-3 py-3 flex flex-col transition-all",
                pw.hasDetail ? "cursor-pointer hover:shadow-sm hover:border-gray-300" : ""
              )}
            >
              {/* Top row: code + status */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono font-bold text-[hsl(var(--text-100))]">{pw.code}</span>
                <span className={cn("text-[10px] font-medium px-1.5 py-px rounded-full", statusStyle[pw.status])}>
                  {pw.status}
                </span>
              </div>

              {/* Name */}
              <p className="text-xs font-semibold text-[hsl(var(--text-100))] leading-tight">{pw.name}</p>
              <p className="text-[11px] text-[hsl(var(--text-80))] mt-0.5 leading-snug line-clamp-2 flex-1">{pw.description}</p>

              {/* Footer */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                <div className="flex items-center gap-1">
                  {pw.cohorts.map(c => (
                    <span key={c} className="w-2 h-2 rounded-full" style={{ backgroundColor: cohortDot[c] }} title={c} />
                  ))}
                </div>
                {pw.members !== undefined ? (
                  <span className="text-[10px] tabular-nums text-[hsl(var(--text-80))]">{pw.members.toLocaleString()}</span>
                ) : (
                  <span className="text-[10px] text-[hsl(var(--text-80))]">—</span>
                )}
                {pw.hasDetail && <ChevronRight className="w-3 h-3 text-[hsl(var(--text-80))]" />}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}
