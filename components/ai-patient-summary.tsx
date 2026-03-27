"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Brain, Sparkles, TrendingUp, TrendingDown, Target, Eye, EyeOff } from "lucide-react"
import { motion } from "framer-motion"
import RecommendedCarePathway from "./recommended-care-pathway"

interface PatientSummaryData {
  patientName: string
  empiId: string
  joinedVia: string
  yearsInNetwork: number
  primaryDoctor: string
  doctorSpecialty: string
  consultationCount: number
  mainConditions: string[]
  surgicalHistory: string[]
  claimsTotal: string
  claimsReimbursed: string
  riskFactor: "Low" | "Medium" | "High"
  recentTrend: "Improving" | "Stable" | "Declining"
  keyInsights: string[]
}

interface AIPatientSummaryProps {
  patientData: PatientSummaryData
  onAskTatvaAI?: (empiId: string) => void
  showControls?: boolean
}

const getRiskFactorColor = (riskFactor: string) => {
  switch (riskFactor) {
    case "Low":
      return "bg-green-100 text-green-800 border-green-200"
    case "Medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "High":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case "Improving":
      return <TrendingUp className="w-4 h-4 text-green-600" />
    case "Declining":
      return <TrendingDown className="w-4 h-4 text-red-600" />
    case "Stable":
      return <div className="w-4 h-4 bg-blue-600 rounded-full" />
    default:
      return null
  }
}

export default function AIPatientSummary({ patientData, onAskTatvaAI, showControls = true }: AIPatientSummaryProps) {
  const [isCarePathwayOpen, setIsCarePathwayOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  const {
    patientName,
    empiId,
    joinedVia,
    yearsInNetwork,
    primaryDoctor,
    doctorSpecialty,
    consultationCount,
    mainConditions,
    surgicalHistory,
    claimsTotal,
    claimsReimbursed,
    riskFactor,
    recentTrend,
    keyInsights
  } = patientData

  return (
    <Card className="border border-[hsl(var(--stroke-grey))] rounded-lg overflow-hidden">
      <CardHeader className="bg-white rounded-t-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium text-[hsl(var(--text-100))]">
            <Sparkles className="w-4 h-4 text-purple-500" />
            Patient Summary
          </CardTitle>
          {showControls && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                aria-expanded={!isCollapsed}
                aria-controls="patient-summary-content"
                className="text-xs"
                title={isCollapsed ? "Show Patient Summary" : "Hide Patient Summary"}
              >
                {isCollapsed ? (
                  <>
                    <Eye className="w-3 h-3 mr-1" /> Show
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" /> Hide
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCarePathwayOpen(true)}
                className="text-[hsl(var(--brand-primary))] hover:text-[hsl(var(--brand-primary))]/80 border-[hsl(var(--brand-primary))]/20 hover:border-[hsl(var(--brand-primary))]/40 bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-xs shadow-sm"
              >
                <Target className="w-3 h-3 mr-1" />
                Recommended Care Pathway
              </Button>
              {onAskTatvaAI && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAskTatvaAI(empiId)}
                  className="text-purple-600 hover:text-purple-700 border-purple-200 hover:border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-xs shadow-sm"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Ask Tatva AI
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent id="patient-summary-content">
          {/* Main Summary */}
          <div className="bg-[hsl(var(--bg-10))] rounded-lg p-4 border border-[hsl(var(--stroke-grey))]">
            <div className="space-y-3">
            {/* Patient Overview */}
            <p className="text-sm leading-relaxed text-[hsl(var(--text-100))]">
              <span className="font-semibold text-[hsl(var(--text-100))]">{patientName}</span> (EMPI: {empiId}) joined the healthcare network via{" "}
              <span className="font-medium text-[hsl(var(--brand-primary))]">{joinedVia}</span> approximately{" "}
              <span className="font-medium">{yearsInNetwork} years ago</span>. The patient most frequently consults with{" "}
              <span className="font-medium text-[hsl(var(--text-100))]">{primaryDoctor}</span> ({doctorSpecialty}) with{" "}
              <span className="font-medium">{consultationCount}+ consultations</span> recorded.
            </p>

            {/* Health Conditions & History */}
            {(mainConditions.length > 0 || surgicalHistory.length > 0) && (
              <div className="space-y-2">
                {mainConditions.length > 0 && (
                  <p className="text-sm text-[hsl(var(--text-100))]">
                    <span className="font-medium">Primary health conditions:</span> {mainConditions.join(", ")}.
                  </p>
                )}
                {surgicalHistory.length > 0 && (
                  <p className="text-sm text-[hsl(var(--text-100))]">
                    <span className="font-medium">Surgical history:</span> {surgicalHistory.join("; ")}.
                  </p>
                )}
              </div>
            )}

            {/* Claims Information */}
            <p className="text-sm text-[hsl(var(--text-100))]">
              <span className="font-medium">Insurance claims:</span> Total <span className="font-medium text-[hsl(var(--success))]">{claimsTotal}</span> with{" "}
              <span className="font-medium text-[hsl(var(--success))]">{claimsReimbursed} reimbursed</span> successfully.
            </p>

            {/* Clinical Insights */}
            {keyInsights.length > 0 && (
              <div className="pt-2 border-t border-[hsl(var(--stroke-grey))]/50">
                <p className="text-sm font-medium text-[hsl(var(--text-100))] mb-2">Clinical Insights:</p>
                <ul className="space-y-1">
                  {keyInsights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-[hsl(var(--text-80))]">
                      <div className="w-1 h-1 bg-[hsl(var(--brand-primary))] rounded-full mt-2 flex-shrink-0"></div>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        </CardContent>
      )}
      
      {/* Recommended Care Pathway Modal */}
      {showControls && (
        <RecommendedCarePathway
          isOpen={isCarePathwayOpen}
          onClose={() => setIsCarePathwayOpen(false)}
          patientData={patientData}
          empiId={empiId}
        />
      )}
    </Card>
  )
}

// Helper function to generate seeded random numbers for consistency
function seededRandom(seed: string): () => number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return function() {
    hash = ((hash * 9301 + 49297) % 233280)
    return hash / 233280
  }
}

// Generate AI summary from patient data
export function generatePatientSummary(info: any): PatientSummaryData {
  const parsePHP = (v: string) => Number(String(v || '0').replace(/[^0-9]/g, ''))
  const toDate = (s: string) => new Date(s)
  const fmtMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`

  const consultationHistory: any[] = info.consultationHistory || []
  const labReports: any[] = info.labReports || []
  const healthMarkers: any[] = info.healthMarkers || []
  const claims: any[] = info.claims || []

  const patientName = info.name || "Patient"
  const empiId = info.empiId || ""
  const joinedVia = info.source || info.assigningAuthority || "Referral"
  const primaryDoctor = (info.doctorName || '').replace(/, .+$/, '')
  const doctorSpecialty = (() => {
    const n = (primaryDoctor || '').toLowerCase()
    if (n.includes('sophie')) return 'Consultant Gynaecologist'
    if (n.includes('philip')) return 'Senior Specialist Gynaecologist'
    if (n.includes('peter')) return 'Diabetologist'
    return 'Primary Physician'
  })()

  // Years in network
  let yearsInNetwork = 1
  if (consultationHistory.length) {
    const earliest = consultationHistory.reduce((min, c) => (toDate(c.date) < toDate(min.date) ? c : min), consultationHistory[0])
    const diff = Date.now() - toDate(earliest.date).getTime()
    yearsInNetwork = Math.max(1, Math.round((diff / (1000*60*60*24*365)) * 10) / 10)
  }

  const consultationCount = consultationHistory.length
  const mainConditions: string[] = info.program ? [info.program] : []
  const surgicalHistory: string[] = []

  // Claims totals
  const claimsTotalNum = claims.reduce((s,c)=> s + parsePHP(c.amountClaimed), 0)
  const claimsReimbursedNum = claims.reduce((s,c)=> s + parsePHP(c.amountReimbursed), 0)
  const claimsTotal = claimsTotalNum ? `₱${claimsTotalNum.toLocaleString('en-PH')}` : '₱0'
  const claimsReimbursed = claimsReimbursedNum ? `₱${claimsReimbursedNum.toLocaleString('en-PH')}` : '₱0'

  // Insights per provided bullet points
  const recentConsults = [...consultationHistory].sort((a,b)=> toDate(b.date).getTime()-toDate(a.date).getTime()).slice(0,3)
  const needsAttention = recentConsults.some(c => /follow[-\s]?up/i.test(c.status || '') || /(worsen|new symptom|acute)/i.test(c.notes || ''))
  const careProgress = needsAttention
    ? 'Care progress (Consultations): Needs attention — recent consults flagged follow-up or worsening/new symptom.'
    : 'Care progress (Consultations): Good — recent consults completed with stable notes; no acute concerns.'

  const referralCountNum = consultationHistory.filter(c => !!c.referredBy).length
  const typesSet = new Set(consultationHistory.map(c => (c.type || '').toLowerCase()))
  const careCoordination = (referralCountNum >= 2 || typesSet.size > 1)
    ? 'Care coordination: Escalation/complexity rising; multiple referrals/specialties involved.'
    : 'Care coordination: Stabilizing care; referrals tapering/limited specialty switches.'

  const notesText = consultationHistory.map(c => c.notes || '').join(' \n ')
  const adherenceGood = /(adherent|tolerating|compliant|exercises)/i.test(notesText)
  const adherenceBad = /(missed dose|missed doses|non[-\s]?adherence|side[-\s]?effects|intolerant)/i.test(notesText)
  const adherence = adherenceBad
    ? 'Adherence & plan clarity: Bad — missed doses/non-adherence/side-effects.'
    : adherenceGood
      ? 'Adherence & plan clarity: Good — adherent/tolerating as documented.'
      : 'Adherence & plan clarity: Not explicitly documented; no adherence concerns noted.'

  // Health marker aggregation
  const byCategory: Record<string, { total: number; abnormal: number; worsened: number }> = {}
  const latestStatuses: Array<{ marker: string; category: string; status: string; latest: any; prev: any }> = []
  healthMarkers.forEach((m: any) => {
    const hist = (m.history || []).sort((a: any,b: any)=> toDate(a.date).getTime()-toDate(b.date).getTime())
    if (!hist.length) return
    const latest = hist[hist.length-1]
    const prev = hist.length>1 ? hist[hist.length-2] : null
    const status = String(latest.status || m.status || 'normal')
    const category = m.category || 'General'
    if (!byCategory[category]) byCategory[category] = { total: 0, abnormal: 0, worsened: 0 }
    byCategory[category].total++
    if (/(high|low|critical)/i.test(status)) byCategory[category].abnormal++
    if (prev && latest && typeof prev.value === 'number' && typeof latest.value === 'number') {
      if (latest.value > prev.value && /(HbA1c|LDL|Triglycerides|Glucose)/i.test(m.healthMarker || '')) byCategory[category].worsened++
    }
    latestStatuses.push({ marker: m.healthMarker, category, status, latest, prev })
  })

  const metabolicCat = byCategory['Diabetes'] || byCategory['Metabolic'] || byCategory['Lipid'] || byCategory['Lipids'] || { total: 0, abnormal: 0, worsened: 0 }
  const labMetabolic = metabolicCat.total === 0
    ? 'Metabolic markers (Labs): No recent metabolic panel available.'
    : (metabolicCat.abnormal === 0 && metabolicCat.worsened === 0)
      ? 'Metabolic markers (Labs): Good — within range / improved vs prior.'
      : 'Metabolic markers (Labs): Needs action — elevated HbA1c/LDL/Triglycerides or worsened trend.'

  const organAbnormal = ['Nephrology','Liver','Thyroid'].some(cat => (byCategory[cat]?.abnormal || 0) > 0)
  const organHealth = organAbnormal
    ? 'Organ health flags (Labs): Abnormal signal (liver enzymes/renal function/thyroid).'
    : 'Organ health flags (Labs): Normalized/stable.'

  const infectionReports = labReports.filter(r => /hiv|culture|crp|pcr/i.test((r.testName||'') + ' ' + (r.summary||'')))
  const infectionInflammation = infectionReports.length
    ? (infectionReports.some(r => /positive|elevated|high/i.test(r.summary || ''))
        ? 'Infection/inflammation (Labs): Positive/elevated finding — investigate.'
        : 'Infection/inflammation (Labs): Negative/ruled out — reassuring.')
    : 'Infection/inflammation (Labs): Not indicated in recent reports.'

  // Trend direction
  const abnByMonth: Record<string, number> = {}
  latestStatuses.forEach(({ latest }) => {
    const k = fmtMonth(new Date(latest.date))
    abnByMonth[k] = (abnByMonth[k] || 0) + (/(high|low|critical)/i.test(String(latest.status)) ? 1 : 0)
  })
  const months = Object.keys(abnByMonth).sort()
  const recent = months.slice(-3)
  const prev = months.slice(-6, -3)
  const recentAbn = recent.reduce((s,m)=> s + (abnByMonth[m]||0), 0)
  const prevAbn = prev.reduce((s,m)=> s + (abnByMonth[m]||0), 0)
  const recentConsultsCompletedRatio = (() => {
    const rec = consultationHistory.filter(c => recent.includes(fmtMonth(new Date(c.date))))
    if (!rec.length) return 1
    return rec.filter(c => /completed/i.test(c.status||'')) .length / rec.length
  })()
  const improving = (recentAbn <= prevAbn) && (recentConsultsCompletedRatio >= 0.5)
  const recentTrend: 'Improving' | 'Stable' | 'Declining' = improving ? (recentAbn < prevAbn ? 'Improving' : 'Stable') : 'Declining'

  const doctorSet = new Set(consultationHistory.map(c => c.doctorName))
  const clinicSet = new Set(consultationHistory.map(c => c.clinic))
  const clinicianConsensus = (doctorSet.size <= 3 && clinicSet.size <= 3)
    ? 'Clinician consensus (Consultations): Stable plan; consistent doctors/clinics.'
    : 'Clinician consensus (Consultations): Monitor closely — frequent changes detected.'

  const followUps = consultationHistory.filter(c => /follow[-\s]?up/i.test((c.status||'') + ' ' + (c.notes||'')))
  const labTodos = labReports.filter(r => /repeat|confirmatory|recheck|follow[-\s]?up/i.test(r.summary || ''))
  const nextSteps = (followUps.length || labTodos.length)
    ? 'Immediate next steps: To-do — upcoming follow-up or repeat testing indicated.'
    : 'Immediate next steps: Routine monitoring.'

  // Risk factor from abnormalities/referrals
  const totalAbn = Object.values(byCategory).reduce((s:any,c:any)=> s + (c.abnormal||0), 0)
  const riskFactor: 'Low' | 'Medium' | 'High' =
    totalAbn >= 3 || referralCountNum >= 3
      ? 'High'
      : totalAbn >= 1 || referralCountNum >= 1
        ? 'Medium'
        : 'Low'

  const keyInsights = [
    careProgress,
    careCoordination,
    adherence,
    labMetabolic,
    organHealth,
    infectionInflammation,
    `Trend direction (All events): ${recentTrend} — abnormal labs ${recentAbn <= prevAbn ? 'not increasing' : 'increasing'}; consult completion ${(recentConsultsCompletedRatio*100).toFixed(0)}%.`,
    clinicianConsensus,
    nextSteps,
  ]

  return {
    patientName,
    empiId,
    joinedVia,
    yearsInNetwork,
    primaryDoctor,
    doctorSpecialty,
    consultationCount,
    mainConditions,
    surgicalHistory,
    claimsTotal,
    claimsReimbursed,
    riskFactor,
    recentTrend,
    keyInsights,
  }
}

// Export mock data for the current patient
export const mockPatientSummaryData: PatientSummaryData = {
  patientName: "Default Patient",
  empiId: "EMPI0000000",
  joinedVia: "System Default",
  yearsInNetwork: 1,
  primaryDoctor: "Dr. Default",
  doctorSpecialty: "General Medicine",
  consultationCount: 1,
  mainConditions: [],
  surgicalHistory: [],
  claimsTotal: "0",
  claimsReimbursed: "0",
  riskFactor: "Low",
  recentTrend: "Stable",
  keyInsights: ["No data available"]
}
