"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts"
import { Users, Building2, Stethoscope, Shield, TrendingUp, TrendingDown, Activity, Clock, AlertTriangle, CheckCircle } from "lucide-react"
import { generatePatientsData, type Patient } from "@/lib/generate-patients-data"
import DiabetesDrilldown from "./diabetes-drilldown"
// Static references used where no data source exists yet
const claimsBenchmarks = [
  { metric: "Denial Rate", value: 12.4, target: 15.0 },
  { metric: "Time to Payment", value: 18.5, target: 21.0 },
  { metric: "Pend Aging P95", value: 42.1, target: 45.0 },
  { metric: "Recovery Ratio", value: 67.8, target: 65.0 }
]


const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

// Format large numbers for display
function formatLargeNumber(num: number): { display: string; full: string } {
  const full = num.toLocaleString()
  if (num >= 1000000) {
    return { display: `${(num / 1000000).toFixed(1)}M`, full }
  } else if (num >= 1000) {
    return { display: `${(num / 1000).toFixed(1)}K`, full }
  }
  return { display: full, full }
}

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: number
  icon?: React.ComponentType<any>
  color?: string
  fullValue?: string
}

function KPICard({ title, value, subtitle, trend, icon: Icon, color = "text-[hsl(var(--brand-primary))]", fullValue }: KPICardProps) {
  return (
    <Card className="border border-[hsl(var(--stroke-grey))] hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-[hsl(var(--text-80))]">{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${color}`} />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-[hsl(var(--text-100))]" title={fullValue}>{value}</div>
        {subtitle && <p className="text-xs text-[hsl(var(--text-80))] mt-1">{subtitle}</p>}
        {trend !== undefined && (
          <div className={`flex items-center text-xs mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(trend)}% from last month
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function OverviewScreen() {
  const [activeTab, setActiveTab] = useState("ecosystem")
  const [showDiabetesDrilldown, setShowDiabetesDrilldown] = useState(false)

  // Source data used to power KPIs and charts - scaled up for larger numbers
  const patients: Patient[] = useMemo(() => generatePatientsData(1200), [])

  const kpis = useMemo(() => {
    // Scale up the numbers for more realistic enterprise values
    const scaleFactor = 1000
    const total = patients.length * scaleFactor
    const active = patients.filter(p => p.status === "Active").length * scaleFactor
    const insurersSet = new Set(patients.map(p => p.insuranceProvider).filter(p => p && p !== "None"))
    const doctorsSet = new Set(patients.map(p => p.doctorName))
    const hospitalsSet = new Set(patients.map(p => p.assigningAuthority))
    const insured = patients.filter(p => p.insuranceProvider && p.insuranceProvider !== "None").length * scaleFactor

    // Upcoming appointments within 7 days
    const now = new Date()
    const in7d = new Date(now)
    in7d.setDate(now.getDate() + 7)
    const upcoming7d = patients.filter(p => {
      const d = new Date(p.nextConsultation)
      return d >= now && d <= in7d
    }).length * Math.floor(scaleFactor / 10) // Scale down appointments

    // Claims in last 30 days - ensure we always have some claims
    const last30d = new Date(now)
    last30d.setDate(now.getDate() - 30)
    const baseClaims = patients.filter(p => p.lastClaimSubmissionDate && new Date(p.lastClaimSubmissionDate) >= last30d).length
    // Ensure minimum claims count even if no recent claims in data
    const claims30d = Math.max(baseClaims * Math.floor(scaleFactor / 5), 48500) // Scale down claims with minimum threshold

    return {
      totalPatients: total,
      totalHospitals: hospitalsSet.size * 15, // Scale up hospitals
      totalDoctors: doctorsSet.size * 50, // Scale up doctors
      totalInsurers: insurersSet.size * 3, // Scale up insurers
      activePatients: active,
      coverageRate: 20, // Fixed at 20% as requested
      upcoming7d,
      claims30d,
    }
  }, [patients])

  // Aggregations for charts
  const channelMix = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of patients) map.set(p.source, (map.get(p.source) || 0) + 1)
    return Array.from(map.entries())
      .map(([channel, starts]) => ({ channel, starts }))
      .sort((a, b) => b.starts - a.starts)
      .slice(0, 6)
  }, [patients])

  const programMix = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of patients) map.set(p.programName, (map.get(p.programName) || 0) + 1)
    const total = patients.length || 1
    
    // Create more varied data by applying multipliers to different programs
    const variationMultipliers: Record<string, number> = {
      "Diabetes Management": 3.2,
      "Hypertension Control": 2.8,
      "Cancer Care": 2.3,
      "Mental Health": 1.9,
      "Cardiac Rehab": 1.7,
      "Maternity Care": 1.5,
      "Pediatric Health": 1.3,
      "Respiratory Care": 1.1,
      "Orthopedic Recovery": 0.9,
      "Preventive Care": 0.8,
      "Ayushman Bharat": 0.7,
      "Nutrition Counseling": 0.6
    }
    
    return Array.from(map.entries())
      .map(([area, patientsCount]) => {
        const multiplier = variationMultipliers[area] || 1
        const adjustedCount = Math.round(patientsCount * multiplier)
        return { 
          area, 
          patients: adjustedCount, 
          percentage: Math.round((adjustedCount / total) * 1000) / 10 
        }
      })
      .sort((a, b) => b.patients - a.patients)
      .slice(0, 12) // Get more to account for filtering
  }, [patients])

  const topDoctors = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of patients) map.set(p.doctorName, (map.get(p.doctorName) || 0) + 1)
    
    // Apply variation multipliers to create more realistic distribution
    const entries = Array.from(map.entries())
    return entries
      .map(([name, patientsCount], index) => {
        // Create a declining multiplier based on doctor ranking
        const rankMultiplier = Math.max(0.3, 1 - (index * 0.08))
        // Add some randomization for more natural variation
        const randomFactor = 0.8 + Math.random() * 0.4
        const adjustedCount = Math.round(patientsCount * rankMultiplier * randomFactor * 2.5)
        return { name, patients: adjustedCount }
      })
      .sort((a, b) => b.patients - a.patients)
      .slice(0, 10)
  }, [patients])

  const insuranceMix = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of patients) map.set(p.insuranceProvider || "None", (map.get(p.insuranceProvider || "None") || 0) + 1)
    return Array.from(map.entries())
      .map(([provider, count]) => ({ provider, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [patients])

  const claimsByMonth = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of patients) {
      if (!p.lastClaimSubmissionDate) continue
      const d = new Date(p.lastClaimSubmissionDate)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      map.set(key, (map.get(key) || 0) + 1)
    }
    const entries = Array.from(map.entries()).sort(([a], [b]) => (a > b ? 1 : -1))
    return entries.map(([month, count]) => ({ month, count }))
  }, [patients])

  // Chronic vs Non-Chronic distribution
  const chronicDistribution = useMemo(() => {
    const chronicCount = Math.round(patients.length * 0.65) // 65% chronic
    const nonChronicCount = patients.length - chronicCount
    return [
      { 
        category: "Chronic Conditions", 
        count: chronicCount,
        subcategories: {
          "Diabetes": Math.round(chronicCount * 0.35),
          "Hypertension": Math.round(chronicCount * 0.28),
          "Heart Disease": Math.round(chronicCount * 0.15),
          "COPD": Math.round(chronicCount * 0.12),
          "Others": Math.round(chronicCount * 0.10)
        }
      },
      { 
        category: "Non-Chronic Conditions", 
        count: nonChronicCount,
        subcategories: {
          "Acute Infections": Math.round(nonChronicCount * 0.30),
          "Injuries": Math.round(nonChronicCount * 0.25),
          "Preventive Care": Math.round(nonChronicCount * 0.20),
          "Mental Health": Math.round(nonChronicCount * 0.15),
          "Others": Math.round(nonChronicCount * 0.10)
        }
      }
    ]
  }, [patients])

  const tabs = [
    { id: "ecosystem", label: "Ecosystem" },
    { id: "patients", label: "Patients" },
    { id: "doctors", label: "Doctors" },
    { id: "claims", label: "Claims" }
  ]

  // Handle drilldown click
  const handleChronicDrilldown = (data: any) => {
    if (data && data.category === "Chronic Conditions") {
      setShowDiabetesDrilldown(true)
    }
  }

  if (showDiabetesDrilldown) {
    return <DiabetesDrilldown onBack={() => setShowDiabetesDrilldown(false)} />
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[hsl(var(--bg-100))]">
      {/* Header */}
      <div className="bg-card border-b border-[hsl(var(--stroke-grey))] p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-[hsl(var(--text-100))]">Admin Overview Dashboard</h1>
            <p className="text-sm text-[hsl(var(--text-80))] mt-1">Real-time insights and key performance indicators</p>
          </div>
          <Badge variant="outline" className="text-[hsl(var(--brand-primary))] border-[hsl(var(--brand-primary))] text-xs">
            Live Data
          </Badge>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-sm h-8 ${
                activeTab === tab.id 
                  ? "bg-[hsl(var(--brand-primary))] text-white hover:bg-[hsl(var(--brand-primary))]" 
                  : "text-[hsl(var(--text-80))] hover:text-[hsl(var(--text-100))] hover:bg-[hsl(var(--bg-10))]"
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "patients" && (
          <div className="space-y-6">
            {/* Top KPIs - Only showing Total Patients and Active Patients */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <KPICard 
                title="Total Patients" 
                value={formatLargeNumber(kpis.totalPatients).display} 
                fullValue={formatLargeNumber(kpis.totalPatients).full}
                icon={Users}
              />
              <KPICard 
                title="Active Patients" 
                value={formatLargeNumber(kpis.activePatients).display} 
                fullValue={formatLargeNumber(kpis.activePatients).full}
                subtitle={`${Math.round((kpis.activePatients / Math.max(kpis.totalPatients,1)) * 1000) / 10}% of total`}
                icon={Activity}
                color="text-blue-600"
              />
            </div>

            {/* Charts Row 1 - Patient Distribution and Channel Mix side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chronic vs Non-Chronic Distribution */}
              <Card className="border border-[hsl(var(--stroke-grey))]">
                <CardHeader>
                  <CardTitle className="text-[hsl(var(--text-100))]">Patient Distribution by Condition Type</CardTitle>
                  <p className="text-xs text-[hsl(var(--text-60))]">Click on Chronic Conditions for detailed analysis</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chronicDistribution} margin={{ left: 8, right: 8, bottom: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--stroke-grey))" />
                      <XAxis dataKey="category" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }} />
                      <Tooltip 
                        content={({ active, payload }: any) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white p-3 border border-gray-200 rounded shadow-md">
                                <p className="font-medium text-sm">{data.category}</p>
                                <p className="text-sm">Total: {data.count.toLocaleString()} patients</p>
                                {data.subcategories && (
                                  <div className="mt-2 pt-2 border-t text-xs space-y-1">
                                    {Object.entries(data.subcategories).map(([key, value]: [string, any]) => (
                                      <div key={key} className="flex justify-between gap-4">
                                        <span>{key}:</span>
                                        <span className="font-medium">{value.toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]}
                        onClick={handleChronicDrilldown}
                        style={{ cursor: 'pointer' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Channel Mix */}
              <Card className="border border-[hsl(var(--stroke-grey))]">
                <CardHeader>
                  <CardTitle className="text-[hsl(var(--text-100))]">Patient Acquisition Channel Mix</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={channelMix} margin={{ left: 8, right: 8, bottom: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--stroke-grey))" />
                      <XAxis dataKey="channel" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }} />
                      <Tooltip />
                      <Bar dataKey="starts" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top 10 Programs - standalone */}
            <Card className="border border-[hsl(var(--stroke-grey))]">
              <CardHeader>
                <CardTitle className="text-[hsl(var(--text-100))]">Top 10 Programs</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={programMix.filter(p => p.area !== "Ayushman Bharat").slice(0, 10).map(p => ({ name: p.area, count: p.patients }))}
                    margin={{ left: 8, right: 8, bottom: 40, top: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--stroke-grey))" />
                    <XAxis 
                      dataKey="name" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--text-80))' }} 
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

          </div>
        )}

        {activeTab === "doctors" && (
          <div className="space-y-6">
            {/* Doctor KPIs - Moved to top */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPICard 
                title="Coach Response SLA" 
                value="24.5 mins" 
                subtitle="Median response time"
                trend={-5.2}
                icon={Clock}
                color="text-blue-600"
              />
              <KPICard 
                title="Escalations (KRI)" 
                value={formatLargeNumber(12700).display} 
                fullValue={formatLargeNumber(12700).full}
                subtitle="This month"
                trend={12.4}
                icon={AlertTriangle}
                color="text-red-600"
              />
              <KPICard 
                title="NBRx Rate" 
                value="34.7%" 
                subtitle="New-to-brand prescriptions"
                trend={7.8}
                icon={TrendingUp}
                color="text-green-600"
              />
            </div>

            {/* Top Doctors */}
            <Card className="border border-[hsl(var(--stroke-grey))]">
              <CardHeader>
                <CardTitle className="text-[hsl(var(--text-100))]">Top 10 Doctors by Patient Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topDoctors} layout="vertical" margin={{ left: 100, right: 8, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--stroke-grey))" />
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }} />
                    <YAxis dataKey="name" type="category" width={96} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }} />
                    <Tooltip />
                    <Bar dataKey="patients" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "claims" && (
          <div className="space-y-6">
            {/* Claims KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {claimsBenchmarks.map((item) => (
                <KPICard 
                  key={item.metric}
                  title={item.metric} 
                  value={item.metric.includes("Rate") || item.metric.includes("Ratio") ? `${item.value}%` : `${item.value} days`}
                  subtitle={`Target: ${item.target}${item.metric.includes("Rate") || item.metric.includes("Ratio") ? "%" : " days"}`}
                  trend={item.value < item.target ? 5.2 : -3.1}
                  icon={item.value < item.target ? CheckCircle : AlertTriangle}
                  color={item.value < item.target ? "text-green-600" : "text-red-600"}
                />
              ))}
            </div>

            {/* Insurance Coverage by Provider */}
            <Card className="border border-[hsl(var(--stroke-grey))]">
              <CardHeader>
                <CardTitle className="text-[hsl(var(--text-100))]">Insurance Coverage by Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={insuranceMix} margin={{ left: 40, right: 8, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--stroke-grey))" />
                    <XAxis dataKey="provider" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }} interval={0} angle={-30} textAnchor="end" height={70} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Claims Submitted by Month */}
            <Card className="border border-[hsl(var(--stroke-grey))]">
              <CardHeader>
                <CardTitle className="text-[hsl(var(--text-100))]">Claims Submitted by Month</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={claimsByMonth} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--stroke-grey))" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "ecosystem" && (
          <div className="space-y-6">
            {/* Top KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard 
                title="Total Patients" 
                value={formatLargeNumber(kpis.totalPatients).display} 
                fullValue={formatLargeNumber(kpis.totalPatients).full}
                icon={Users}
              />
              <KPICard 
                title="Active Patients" 
                value={formatLargeNumber(kpis.activePatients).display} 
                fullValue={formatLargeNumber(kpis.activePatients).full}
                subtitle={`${Math.round((kpis.activePatients / Math.max(kpis.totalPatients,1)) * 1000) / 10}% of total`}
                icon={Activity}
                color="text-blue-600"
              />
              <KPICard 
                title="Unique Doctors" 
                value={formatLargeNumber(kpis.totalDoctors).display} 
                fullValue={formatLargeNumber(kpis.totalDoctors).full}
                icon={Stethoscope}
              />
              <KPICard 
                title="Insurance Coverage" 
                value={`${kpis.coverageRate}%`} 
                subtitle="Patients with any insurance"
                icon={Shield}
                color="text-green-600"
              />
            </div>

            {/* Operational KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard 
                title="Hospitals" 
                value={formatLargeNumber(kpis.totalHospitals).display} 
                fullValue={formatLargeNumber(kpis.totalHospitals).full}
                icon={Building2}
              />
              <KPICard 
                title="Upcoming Appointments (7d)" 
                value={formatLargeNumber(kpis.upcoming7d).display} 
                fullValue={formatLargeNumber(kpis.upcoming7d).full}
                icon={Clock}
                color="text-purple-600"
              />
              <KPICard 
                title="Claims (30d)" 
                value={formatLargeNumber(kpis.claims30d).display} 
                fullValue={formatLargeNumber(kpis.claims30d).full}
                icon={TrendingUp}
                color="text-orange-600"
              />
              <KPICard 
                title="Insurers" 
                value={formatLargeNumber(kpis.totalInsurers).display} 
                fullValue={formatLargeNumber(kpis.totalInsurers).full}
                icon={Shield}
              />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Program Mix (acts as therapy areas) */}
              <Card className="border border-[hsl(var(--stroke-grey))]">
                <CardHeader>
                  <CardTitle className="text-[hsl(var(--text-100))]">Top Programs</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={programMix}
                        cx="50%"
                        cy="50%"
                        outerRadius={86}
                        dataKey="patients"
                        labelLine={false}
                        label={({ area }) => area}
                      >
                        {programMix.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any, _n: any, p: any) => [`${v}`, `${p && p.payload ? p.payload.area : ""}`]} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Channel Mix */}
              <Card className="border border-[hsl(var(--stroke-grey))]">
                <CardHeader>
                  <CardTitle className="text-[hsl(var(--text-100))]">Patient Acquisition Channel Mix</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={channelMix} margin={{ left: 8, right: 8, bottom: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--stroke-grey))" />
                      <XAxis dataKey="channel" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--text-80))' }} />
                      <Tooltip />
                      <Bar dataKey="starts" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
