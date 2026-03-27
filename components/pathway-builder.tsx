"use client"

import { useState } from "react"
import { ArrowLeft, Plus, X, Check, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

// --- Constants ---

const STEP_LABELS = ["Basics", "Entry Criteria", "Journey", "Care Team", "Modules & KPIs", "Review"]

const COHORTS = [
  { id: "C1", name: "Healthy", color: "#3b82f6" },
  { id: "C2", name: "At-Risk Women", color: "#8b5cf6" },
  { id: "C3", name: "Chronic", color: "#ef4444" },
  { id: "C4", name: "Lifestyle", color: "#22c55e" },
  { id: "C5", name: "Metabolic", color: "#f59e0b" },
]

const COHORT_MEMBER_COUNTS: Record<string, number> = {
  C1: 53, C2: 51, C3: 71, C4: 208, C5: 117,
}

const METRICS = ["HbA1c", "BMI", "BP Systolic", "BP Diastolic", "Step Count", "Claims Count", "Medication Count", "Age", "LDL", "eGFR"]
const OPERATORS = [">", "<", ">=", "<=", "between"]

const ACTOR_PRESETS = ["Data Engine", "Nurse", "Physician", "Nutritionist", "Coach", "Pharmacist", "Psychologist", "Endocrinologist", "Coordinator", "Oncologist", "Navigator", "Surgeon", "OT"]

const CARE_ROLES = [
  "Nurse Care Manager", "Nutritionist", "Exercise Coach", "Psychologist",
  "Endocrinologist", "Pharmacist", "Care Coordinator", "Oncologist",
  "Nurse Navigator", "Occupational Therapist", "Primary Care Physician", "Surgeon",
]

const MODULES_LIST = [
  "Teleconsultation", "CGM Monitoring", "Medication Packs", "Exercise Plans",
  "Nutrition Plans", "CBT/Psych Support", "Diagnostics", "Supplements",
  "Pain Management", "Return-to-Work", "Caregiver Education", "Second Opinion",
]

// --- Types ---

interface Criterion { metric: string; operator: string; value: string; value2: string }
interface JourneyStep { title: string; description: string; actors: string[] }
interface KPI { label: string; target: string }

interface FormData {
  code: string; name: string; description: string; status: "Active" | "Draft" | "Planned"
  cohorts: string[]
  criteria: Criterion[]
  journeySteps: JourneyStep[]
  careTeam: string[]
  modules: string[]
  kpis: KPI[]
}

const defaultForm: FormData = {
  code: "", name: "", description: "", status: "Draft",
  cohorts: [],
  criteria: [
    { metric: "HbA1c", operator: ">=", value: "7.0", value2: "" },
    { metric: "Medication Count", operator: ">=", value: "2", value2: "" },
  ],
  journeySteps: [
    { title: "Risk Assessment", description: "Initial evaluation and tier assignment", actors: ["Data Engine", "Nurse"] },
    { title: "Program Enrollment", description: "Welcome call and care plan creation", actors: ["Nurse"] },
    { title: "Ongoing Care", description: "Regular monitoring and coaching", actors: ["Nurse", "Coach"] },
  ],
  careTeam: ["Nurse Care Manager", "Nutritionist", "Exercise Coach"],
  modules: ["Teleconsultation", "Exercise Plans", "Nutrition Plans"],
  kpis: [
    { label: "Primary Outcome", target: "Measurable improvement" },
    { label: "Adherence", target: "> 80%" },
  ],
}

// --- Stepper ---

function Stepper({ current, completed }: { current: number; completed: number[] }) {
  return (
    <div className="flex items-start justify-center gap-0 mb-5">
      {STEP_LABELS.map((label, i) => {
        const isCompleted = completed.includes(i)
        const isCurrent = i === current
        return (
          <div key={i} className="flex items-start">
            <div className="flex flex-col items-center" style={{ width: 72 }}>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors",
                isCompleted && "bg-emerald-500 text-white",
                isCurrent && "text-white",
                !isCompleted && !isCurrent && "border border-gray-300 text-gray-400 bg-white"
              )} style={isCurrent ? { backgroundColor: "#00447C" } : undefined}>
                {isCompleted ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={cn(
                "text-[10px] mt-1 text-center leading-tight",
                isCurrent ? "font-medium text-[hsl(var(--text-100))]" : "text-[hsl(var(--text-80))]"
              )}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={cn(
                "h-px flex-shrink-0 mt-3",
                isCompleted ? "bg-emerald-400" : "bg-gray-200"
              )} style={{ width: 24 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// --- Step Components ---

function StepBasics({ form, update }: { form: FormData; update: (f: Partial<FormData>) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-medium text-[hsl(var(--text-80))] mb-1 block">Pathway Code</label>
          <Input value={form.code} onChange={e => update({ code: e.target.value })} placeholder="P16" className="h-8 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-medium text-[hsl(var(--text-80))] mb-1 block">Status</label>
          <div className="flex gap-2 mt-1.5">
            {(["Active", "Draft", "Planned"] as const).map(s => (
              <label key={s} className={cn(
                "text-[11px] px-2.5 py-1 rounded-full cursor-pointer border transition-colors",
                form.status === s ? "border-[#00447C] bg-[#00447C0a] text-[#00447C] font-medium" : "border-gray-200 text-[hsl(var(--text-80))]"
              )}>
                <input type="radio" className="sr-only" checked={form.status === s} onChange={() => update({ status: s })} />
                {s}
              </label>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-medium text-[hsl(var(--text-80))] mb-1 block">Pathway Name</label>
        <Input value={form.name} onChange={e => update({ name: e.target.value })} placeholder="e.g. Diabetes Management" className="h-8 text-xs" />
      </div>
      <div>
        <label className="text-[10px] font-medium text-[hsl(var(--text-80))] mb-1 block">Description</label>
        <Textarea value={form.description} onChange={e => update({ description: e.target.value })} placeholder="Brief description of the pathway..." className="text-xs min-h-[52px]" rows={2} />
      </div>
      <div>
        <label className="text-[10px] font-medium text-[hsl(var(--text-80))] mb-1.5 block">Target Cohorts</label>
        <div className="flex flex-wrap gap-2">
          {COHORTS.map(c => {
            const checked = form.cohorts.includes(c.id)
            return (
              <label key={c.id} className={cn(
                "flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded border cursor-pointer transition-colors",
                checked ? "border-[#00447C] bg-[#00447C0a]" : "border-gray-200"
              )}>
                <input type="checkbox" className="sr-only" checked={checked} onChange={() => {
                  update({ cohorts: checked ? form.cohorts.filter(x => x !== c.id) : [...form.cohorts, c.id] })
                }} />
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-[hsl(var(--text-100))]">{c.id} · {c.name}</span>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StepCriteria({ form, update }: { form: FormData; update: (f: Partial<FormData>) => void }) {
  const setCriterion = (idx: number, patch: Partial<Criterion>) => {
    const next = form.criteria.map((c, i) => i === idx ? { ...c, ...patch } : c)
    update({ criteria: next })
  }
  const removeCriterion = (idx: number) => update({ criteria: form.criteria.filter((_, i) => i !== idx) })
  const addCriterion = () => update({ criteria: [...form.criteria, { metric: "BMI", operator: ">", value: "", value2: "" }] })

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-[hsl(var(--text-100))]">Define who enters this pathway</p>
      <div className="space-y-2">
        {form.criteria.map((c, i) => (
          <div key={i} className="flex items-center gap-2 bg-white rounded border border-[hsl(var(--stroke-grey))] px-3 py-2">
            <select value={c.metric} onChange={e => setCriterion(i, { metric: e.target.value })}
              className="text-[11px] bg-transparent border-none outline-none text-[hsl(var(--text-100))] font-medium flex-shrink-0">
              {METRICS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={c.operator} onChange={e => setCriterion(i, { operator: e.target.value })}
              className="text-[11px] bg-transparent border-none outline-none text-[hsl(var(--text-80))] w-14 flex-shrink-0">
              {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <Input value={c.value} onChange={e => setCriterion(i, { value: e.target.value })}
              placeholder="Value" className="h-7 text-[11px] w-20" />
            {c.operator === "between" && (
              <>
                <span className="text-[10px] text-[hsl(var(--text-80))]">and</span>
                <Input value={c.value2} onChange={e => setCriterion(i, { value2: e.target.value })}
                  placeholder="Value" className="h-7 text-[11px] w-20" />
              </>
            )}
            <button onClick={() => removeCriterion(i)} className="ml-auto text-gray-400 hover:text-red-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button onClick={addCriterion} className="flex items-center gap-1 text-[11px] font-medium text-[#00447C] hover:underline">
        <Plus className="w-3 h-3" /> Add Criterion
      </button>
    </div>
  )
}

function StepJourney({ form, update }: { form: FormData; update: (f: Partial<FormData>) => void }) {
  const setStep = (idx: number, patch: Partial<JourneyStep>) => {
    const next = form.journeySteps.map((s, i) => i === idx ? { ...s, ...patch } : s)
    update({ journeySteps: next })
  }
  const removeStep = (idx: number) => update({ journeySteps: form.journeySteps.filter((_, i) => i !== idx) })
  const addStep = () => update({ journeySteps: [...form.journeySteps, { title: "", description: "", actors: [] }] })
  const toggleActor = (idx: number, actor: string) => {
    const s = form.journeySteps[idx]
    const actors = s.actors.includes(actor) ? s.actors.filter(a => a !== actor) : [...s.actors, actor]
    setStep(idx, { actors })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-[hsl(var(--text-100))]">Design the care journey</p>
      <div className="space-y-2">
        {form.journeySteps.map((s, i) => (
          <div key={i} className="bg-white rounded border border-[hsl(var(--stroke-grey))] px-3 py-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: "#00447C" }}>{i + 1}</span>
              <Input value={s.title} onChange={e => setStep(i, { title: e.target.value })}
                placeholder="Step title" className="h-7 text-[11px] flex-1" />
              <button onClick={() => removeStep(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <Input value={s.description} onChange={e => setStep(i, { description: e.target.value })}
              placeholder="Step description" className="h-7 text-[11px]" />
            <div>
              <span className="text-[10px] text-[hsl(var(--text-80))] mb-1 block">Actors</span>
              <div className="flex flex-wrap gap-1">
                {ACTOR_PRESETS.map(a => (
                  <button key={a} onClick={() => toggleActor(i, a)}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                      s.actors.includes(a) ? "border-[#00447C] bg-[#00447C] text-white" : "border-gray-200 text-[hsl(var(--text-80))] hover:border-gray-300"
                    )}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addStep} className="flex items-center gap-1 text-[11px] font-medium text-[#00447C] hover:underline">
        <Plus className="w-3 h-3" /> Add Step
      </button>
    </div>
  )
}

function StepCareTeam({ form, update }: { form: FormData; update: (f: Partial<FormData>) => void }) {
  const toggle = (role: string) => {
    update({ careTeam: form.careTeam.includes(role) ? form.careTeam.filter(r => r !== role) : [...form.careTeam, role] })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-[hsl(var(--text-100))]">Assign care team roles</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {CARE_ROLES.map(role => {
          const selected = form.careTeam.includes(role)
          return (
            <button key={role} onClick={() => toggle(role)}
              className={cn(
                "text-left px-3 py-2.5 rounded-lg border transition-all text-[11px]",
                selected ? "border-[#00447C] bg-[#00447C08] font-medium text-[hsl(var(--text-100))]" : "border-gray-200 text-[hsl(var(--text-80))] hover:border-gray-300"
              )}>
              <div className="flex items-center justify-between">
                <span>{role}</span>
                {selected && <Check className="w-3 h-3 text-[#00447C]" />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepModulesKPIs({ form, update }: { form: FormData; update: (f: Partial<FormData>) => void }) {
  const toggleModule = (m: string) => {
    update({ modules: form.modules.includes(m) ? form.modules.filter(x => x !== m) : [...form.modules, m] })
  }
  const setKPI = (idx: number, patch: Partial<KPI>) => {
    const next = form.kpis.map((k, i) => i === idx ? { ...k, ...patch } : k)
    update({ kpis: next })
  }
  const removeKPI = (idx: number) => update({ kpis: form.kpis.filter((_, i) => i !== idx) })
  const addKPI = () => update({ kpis: [...form.kpis, { label: "", target: "" }] })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-2">
        <p className="text-xs font-medium text-[hsl(var(--text-100))]">Modules</p>
        <div className="space-y-1">
          {MODULES_LIST.map(m => {
            const checked = form.modules.includes(m)
            return (
              <label key={m} className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded border cursor-pointer transition-colors text-[11px]",
                checked ? "border-[#00447C] bg-[#00447C08]" : "border-gray-100 hover:border-gray-200"
              )}>
                <input type="checkbox" checked={checked} onChange={() => toggleModule(m)} className="sr-only" />
                <div className={cn(
                  "w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0",
                  checked ? "bg-[#00447C] border-[#00447C]" : "border-gray-300"
                )}>
                  {checked && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-[hsl(var(--text-100))]">{m}</span>
              </label>
            )
          })}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-[hsl(var(--text-100))]">KPIs</p>
        <div className="space-y-2">
          {form.kpis.map((k, i) => (
            <div key={i} className="flex items-center gap-2 bg-white rounded border border-[hsl(var(--stroke-grey))] px-3 py-2">
              <Input value={k.label} onChange={e => setKPI(i, { label: e.target.value })}
                placeholder="Label" className="h-7 text-[11px] flex-1" />
              <Input value={k.target} onChange={e => setKPI(i, { target: e.target.value })}
                placeholder="Target" className="h-7 text-[11px] flex-1" />
              <button onClick={() => removeKPI(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addKPI} className="flex items-center gap-1 text-[11px] font-medium text-[#00447C] hover:underline">
          <Plus className="w-3 h-3" /> Add KPI
        </button>
      </div>
    </div>
  )
}

function StepReview({ form }: { form: FormData }) {
  return (
    <div className="space-y-3">
      {/* Basics */}
      <div className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#00447C14", color: "#00447C" }}>{form.code || "—"}</span>
          <span className="text-xs font-semibold text-[hsl(var(--text-100))]">{form.name || "Untitled"}</span>
          <span className={cn("text-[10px] font-medium px-1.5 py-px rounded-full ml-auto",
            form.status === "Active" ? "text-emerald-600 bg-emerald-50" : form.status === "Draft" ? "text-gray-500 bg-gray-50" : "text-blue-600 bg-blue-50"
          )}>{form.status}</span>
        </div>
        <p className="text-[11px] text-[hsl(var(--text-80))]">{form.description || "No description"}</p>
        {form.cohorts.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {form.cohorts.map(c => {
              const cohort = COHORTS.find(x => x.id === c)
              return (
                <span key={c} className="inline-flex items-center gap-1 text-[10px] font-medium text-[hsl(var(--text-100))]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cohort?.color }} />{c}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* Cohort Assignment */}
      {form.cohorts.length > 0 && (
        <div className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-3">
          <p className="text-[11px] font-medium text-[hsl(var(--text-80))] mb-2">Cohort Assignment</p>
          <div className="space-y-1.5">
            {form.cohorts.map(cId => {
              const cohort = COHORTS.find(x => x.id === cId)
              const count = COHORT_MEMBER_COUNTS[cId] ?? 0
              return (
                <div key={cId} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cohort?.color }} />
                  <span className="text-[11px] font-medium text-[hsl(var(--text-100))]">{cId}</span>
                  <span className="text-[11px] text-[hsl(var(--text-80))]">{cohort?.name}</span>
                  <span className="text-[10px] tabular-nums text-[hsl(var(--text-80))] ml-auto">{count} members</span>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-[hsl(var(--text-80))] mt-2">
            {form.cohorts.reduce((sum, cId) => sum + (COHORT_MEMBER_COUNTS[cId] ?? 0), 0)} members will be enrolled based on entry criteria
          </p>
        </div>
      )}

      {/* Entry Criteria */}
      {form.criteria.length > 0 && (
        <div className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-3">
          <p className="text-[11px] font-medium text-[hsl(var(--text-80))] mb-2">Entry Criteria</p>
          <div className="space-y-1">
            {form.criteria.map((c, i) => (
              <p key={i} className="text-[11px] text-[hsl(var(--text-100))]">
                {c.metric} {c.operator} {c.value}{c.operator === "between" ? ` and ${c.value2}` : ""}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Journey */}
      {form.journeySteps.length > 0 && (
        <div className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-3">
          <p className="text-[11px] font-medium text-[hsl(var(--text-80))] mb-3">Care Journey</p>
          <div className="relative">
            {form.journeySteps.map((s, i) => (
              <div key={i} className="flex gap-3 mb-3 last:mb-0">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0",
                    i === form.journeySteps.length - 1 ? "bg-emerald-500" : ""
                  )} style={{ backgroundColor: i < form.journeySteps.length - 1 ? "#00447C" : undefined }}>
                    {i === form.journeySteps.length - 1 ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
                  </div>
                  {i < form.journeySteps.length - 1 && <div className="w-px flex-1 min-h-[12px] bg-gray-200" />}
                </div>
                <div className="pt-0.5 pb-0.5">
                  <p className="text-[11px] font-semibold text-[hsl(var(--text-100))] leading-tight">{s.title || "Untitled"}</p>
                  <p className="text-[10px] text-[hsl(var(--text-80))] mt-0.5">{s.description}</p>
                  {s.actors.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {s.actors.map(a => (
                        <span key={a} className="text-[9px] px-1.5 py-px rounded bg-gray-100 text-gray-600">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Care Team */}
        {form.careTeam.length > 0 && (
          <div className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-3">
            <p className="text-[11px] font-medium text-[hsl(var(--text-80))] mb-2">Care Team</p>
            <div className="flex flex-wrap gap-1">
              {form.careTeam.map(r => (
                <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--bg-10))] text-[hsl(var(--text-100))]">{r}</span>
              ))}
            </div>
          </div>
        )}

        {/* Modules */}
        {form.modules.length > 0 && (
          <div className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-3">
            <p className="text-[11px] font-medium text-[hsl(var(--text-80))] mb-2">Modules</p>
            <div className="flex flex-wrap gap-1">
              {form.modules.map(m => (
                <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--bg-10))] text-[hsl(var(--text-80))]">{m}</span>
              ))}
            </div>
          </div>
        )}

        {/* KPIs */}
        {form.kpis.length > 0 && (
          <div className="bg-white rounded-lg border border-[hsl(var(--stroke-grey))] p-3">
            <p className="text-[11px] font-medium text-[hsl(var(--text-80))] mb-2">KPIs</p>
            {form.kpis.map((k, i) => (
              <div key={i} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                <span className="text-[11px] text-[hsl(var(--text-80))]">{k.label || "—"}</span>
                <span className="text-[11px] font-semibold" style={{ color: "#00447C" }}>{k.target || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Main Builder ---

export default function PathwayBuilder({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormData>({ ...defaultForm })
  const [success, setSuccess] = useState(false)

  const update = (patch: Partial<FormData>) => setForm(prev => ({ ...prev, ...patch }))

  const completedSteps = Array.from({ length: step }, (_, i) => i)

  const canProceed = () => {
    switch (step) {
      case 0: return form.code.trim() !== "" && form.name.trim() !== ""
      case 1: return form.criteria.length > 0
      case 2: return form.journeySteps.length > 0
      case 3: return form.careTeam.length > 0
      case 4: return form.modules.length > 0
      default: return true
    }
  }

  const handleCreate = () => {
    setSuccess(true)
    setTimeout(() => onClose(), 1800)
  }

  const fadeVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  }

  if (success) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[hsl(var(--bg-100))]">
        <div className="bg-white border-b border-[hsl(var(--stroke-grey))] px-5 py-3">
          <h1 className="text-base font-semibold text-[hsl(var(--text-100))]">Care Pathways</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-2"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-[hsl(var(--text-100))]">Pathway Created</p>
            <p className="text-[11px] text-[hsl(var(--text-80))]">{form.code} · {form.name} has been created successfully.</p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[hsl(var(--bg-100))]">
      {/* Header */}
      <div className="bg-white border-b border-[hsl(var(--stroke-grey))] px-5 py-3">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="flex items-center gap-1 text-xs text-[hsl(var(--text-80))] hover:text-[hsl(var(--text-100))] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <span className="text-xs text-gray-300">|</span>
          <h1 className="text-sm font-semibold text-[hsl(var(--text-100))]">Create Pathway</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-5 py-4">
        <Stepper current={step} completed={completedSteps} />

        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={fadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              {step === 0 && <StepBasics form={form} update={update} />}
              {step === 1 && <StepCriteria form={form} update={update} />}
              {step === 2 && <StepJourney form={form} update={update} />}
              {step === 3 && <StepCareTeam form={form} update={update} />}
              {step === 4 && <StepModulesKPIs form={form} update={update} />}
              {step === 5 && <StepReview form={form} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation - pinned to bottom */}
      <div className="border-t border-[hsl(var(--stroke-grey))] px-5 py-3 flex justify-between bg-white">
        {step > 0 ? (
          <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)} className="text-xs gap-1">
            <ArrowLeft className="w-3 h-3" /> Back
          </Button>
        ) : <div />}
        {step < 5 ? (
          <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canProceed()}
            className="text-xs text-white gap-1" style={{ backgroundColor: "#00447C" }}>
            Continue
          </Button>
        ) : (
          <Button size="sm" onClick={handleCreate}
            className="text-xs text-white gap-1" style={{ backgroundColor: "#00447C" }}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Create Pathway
          </Button>
        )}
      </div>
    </div>
  )
}
