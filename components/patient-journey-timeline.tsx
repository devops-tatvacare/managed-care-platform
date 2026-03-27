"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Stethoscope, FlaskConical, Filter, ChevronDown, ChevronUp } from "lucide-react"

type Consultation = {
  date: string
  type: string
  duration: string
  status: string
  doctorName: string
  clinic: string
  notes: string
  referredBy?: string
}

type LabReport = {
  date: string
  testName: string
  category: string
  diagnosticsName: string
  document: string
  summary: string
  prescribedBy?: string
}

type JourneyEvent = {
  id: string
  date: string
  kind: "consultation" | "lab"
  title: string
  subtitle?: string
  metaRight?: string
  raw: Consultation | LabReport
}

interface PatientJourneyTimelineProps {
  consultations: Consultation[]
  labReports: LabReport[]
  onOpenConsultation?: (date: string, c: Consultation) => void
  onOpenLab?: (date: string, r: LabReport) => void
}

export default function PatientJourneyTimeline({
  consultations,
  labReports,
  onOpenConsultation,
  onOpenLab,
}: PatientJourneyTimelineProps) {
  const [filter, setFilter] = useState<"all" | "consultation" | "lab">("all")
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})
  const [labsExpanded, setLabsExpanded] = useState<Record<string, boolean>>({})

  const resolveSpeciality = (doctorName: string, fallback: string) => {
    const n = (doctorName || "").toLowerCase()
    if (n.includes("sophie")) return "Consultant Gynaecologist"
    if (n.includes("philip")) return "Senior Specialist Gynaecologist"
    if (n.includes("peter")) return "Diabetologist"
    return fallback
  }

  const events = useMemo<JourneyEvent[]>(() => {
    const cEvents: JourneyEvent[] = consultations.map((c, idx) => ({
      id: `c-${c.date}-${idx}`,
      date: c.date,
      kind: "consultation",
      title: `${c.type}`,
      subtitle: `${c.doctorName} • ${c.clinic}`,
      metaRight: c.status,
      raw: c,
    }))
    const lEvents: JourneyEvent[] = labReports.map((r, idx) => ({
      id: `l-${r.date}-${idx}`,
      date: r.date,
      kind: "lab",
      title: `${r.testName}`,
      subtitle: `${r.diagnosticsName} • ${r.category}`,
      metaRight: r.prescribedBy ? `By ${r.prescribedBy}` : undefined,
      raw: r,
    }))
    const all = [...cEvents, ...lEvents]
    all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return all
  }, [consultations, labReports])

  const filtered = useMemo(() => {
    if (filter === "all") return events
    return events.filter((e) => e.kind === filter)
  }, [events, filter])

  const groupedByDate = useMemo(() => {
    const map = new Map<string, JourneyEvent[]>()
    for (const e of filtered) {
      if (!map.has(e.date)) map.set(e.date, [])
      map.get(e.date)!.push(e)
    }
    // sort events per date: consultations first, then labs
    for (const [d, arr] of map) {
      arr.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "consultation" ? -1 : 1))
      map.set(d, arr)
    }
    // descending by date (present at top → past)
    return Array.from(map.entries()).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
  }, [filtered])

  const toggleDate = (date: string) => setExpandedDates((s) => ({ ...s, [date]: !s[date] }))
  const toggleLabs = (date: string) => setLabsExpanded((s) => ({ ...s, [date]: !s[date] }))

  return (
    <div className="space-y-4">
      <Card className="border border-[hsl(var(--stroke-grey))]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[hsl(var(--text-100))] flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Journey Timeline
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[hsl(var(--text-80))]" />
              <div className="flex rounded-md overflow-hidden border border-[hsl(var(--stroke-grey))]">
                <Button variant={filter === "all" ? "default" : "ghost"} size="sm" onClick={() => setFilter("all")}>
                  All
                </Button>
                <Button variant={filter === "consultation" ? "default" : "ghost"} size="sm" onClick={() => setFilter("consultation")}>
                  Consultations
                </Button>
                <Button variant={filter === "lab" ? "default" : "ghost"} size="sm" onClick={() => setFilter("lab")}>
                  Labs
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {groupedByDate.length === 0 ? (
            <div className="text-sm text-[hsl(var(--text-80))]">No journey events to display.</div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[hsl(var(--stroke-grey))]" />
              <ul className="space-y-4">
                {groupedByDate.map(([date, items]) => {
                  const expanded = expandedDates[date] ?? true
                  return (
                    <li key={date} className="relative pl-10">
                      {/* Date marker */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-[hsl(var(--brand-primary))] relative left-[-10px]" />
                        <button className="text-sm font-semibold text-[hsl(var(--text-100))] hover:underline" onClick={() => toggleDate(date)}>
                          {new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </button>
                        <Badge variant="outline" className="text-xs">{items.length} events</Badge>
                        <span className="ml-auto text-[hsl(var(--text-60))]">
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>

                      {expanded && (
                        <div className="space-y-2">
                          {/* Consultations (render as individual items) */}
                          {items
                            .filter((e) => e.kind === "consultation")
                            .map((e) => (
                              <div
                                key={e.id}
                                className="flex items-start gap-3 p-3 rounded-lg border border-[hsl(var(--stroke-grey))] hover:bg-[hsl(var(--bg-10))] cursor-pointer"
                                onClick={() => onOpenConsultation?.(e.date, e.raw as Consultation)}
                                title="Open consultation details"
                              >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[hsl(var(--bg-10))] border border-[hsl(var(--stroke-grey))]">
                                  <Stethoscope className="w-4 h-4 text-[hsl(var(--brand-primary))]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="truncate">
                                      <div className="text-sm font-medium text-[hsl(var(--text-100))] truncate">
                                        {(() => {
                                          const c = e.raw as Consultation
                                          const baseName = (c.doctorName || '').replace(/\s*\(.+\)$/, '')
                                          return `Consultation: ${baseName}`
                                        })()}
                                      </div>
                                      <div className="text-xs text-[hsl(var(--text-80))] truncate">
                                        {(() => {
                                          const c = e.raw as Consultation
                                          const speciality = resolveSpeciality(c.doctorName, c.type)
                                          return `${speciality}, ${c.clinic}`
                                        })()}
                                      </div>
                                    </div>
                                    {e.metaRight && (
                                      <Badge variant="secondary" className="text-[10px] whitespace-nowrap">{e.metaRight}</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}

                          {/* Labs (collapsed under a parent row) */}
                          {(() => {
                            const labItems = items.filter((e) => e.kind === "lab")
                            if (labItems.length === 0) return null
                            const isOpen = labsExpanded[date] ?? false
                            const labNames = Array.from(new Set(labItems.map((li) => (li.raw as LabReport).diagnosticsName).filter(Boolean)))
                            const labNameDisplay = labNames.length === 1 ? labNames[0] : (labNames.length > 1 ? "Multiple labs" : "Labs")
                            return (
                              <div className="space-y-2">
                                {/* Parent row */}
                                <div
                                  className="flex items-start gap-3 p-3 rounded-lg border border-[hsl(var(--stroke-grey))] bg-[hsl(var(--bg-10))] hover:bg-[hsl(var(--bg-10))]/80 cursor-pointer"
                                  onClick={() => toggleLabs(date)}
                                  title={isOpen ? "Hide lab tests" : "Show lab tests"}
                                >
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-[hsl(var(--stroke-grey))]">
                                    <FlaskConical className="w-4 h-4 text-[hsl(var(--info))]" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="truncate">
                                        <div className="text-sm font-medium text-[hsl(var(--text-100))] truncate">Labs</div>
                                        <div className="text-xs text-[hsl(var(--text-80))] truncate">{labNameDisplay} • {labItems.length} tests</div>
                                      </div>
                                      <Badge variant="outline" className="text-[10px]">{isOpen ? "Collapse" : "Expand"}</Badge>
                                    </div>
                                  </div>
                                </div>

                                {/* Children */}
                                {isOpen && (
                                  <div className="ml-8 space-y-2">
                                    {labItems.map((e) => (
                                      <div
                                        key={e.id}
                                        className="flex items-start gap-3 p-3 rounded-lg border border-[hsl(var(--stroke-grey))] hover:bg-[hsl(var(--bg-10))] cursor-pointer"
                                        onClick={() => onOpenLab?.(e.date, e.raw as LabReport)}
                                        title="Open lab report details"
                                      >
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[hsl(var(--bg-10))] border border-[hsl(var(--stroke-grey))] mt-0.5">
                                          <FlaskConical className="w-3 h-3 text-[hsl(var(--info))]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="truncate">
                                              <div className="text-sm text-[hsl(var(--text-100))] truncate">Lab: {e.title}</div>
                                              {e.subtitle && (
                                                <div className="text-xs text-[hsl(var(--text-80))] truncate">{e.subtitle}</div>
                                              )}
                                            </div>
                                            {e.metaRight && (
                                              <Badge variant="secondary" className="text-[10px] whitespace-nowrap">{e.metaRight}</Badge>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
