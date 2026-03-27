"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  X,
  Calendar,
  FileText,
  Video,
  Thermometer,
  CigaretteIcon as Cough,
  Brain,
  Heart,
  Zap,
  Dumbbell,
  Utensils,
  Footprints,
  Pill,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  Clock,
  Sparkles,
  Target,
  User,
} from "lucide-react"

// Import the new HourlyTimelineView component at the top
import HourlyTimelineView from "./hourly-timeline-view"
import MonthlyTimelineView from "./monthly-timeline-view"
import PatientJourneyTimeline from "./patient-journey-timeline"
import AIPatientSummary, { generatePatientSummary } from "./ai-patient-summary"
import { generateRecommendations } from "./recommended-care-pathway"
import { generatePatientsData } from "@/lib/generate-patients-data"
import { generatePatientDetailsData } from "@/lib/generate-patient-details-data"

import type { ViewMode } from "@/types/timeline"
import TimelineViewSelector from "./timeline-view-selector"
import MonthlyCalendarView from "./monthly-calendar-view"
import MonthlySummaryView from "./monthly-summary-view"
import CarePlans from "./care-plans"
import { ResponsiveContainer, LineChart as RLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { toast } from "sonner"

interface PatientDetailTabsProps {
  patientId: string
  onNavigateToTatvaAI?: (empiId: string) => void
}

// Cache for generated patient data - clear cache when logic changes
const patientDataCache = new Map()
const allPatientsData = generatePatientsData(1000)

// Clear cache to force regeneration with new condition-aware logic
patientDataCache.clear()

// Function to force refresh patient data
const forceRefreshPatientData = (empiId: string) => {
  patientDataCache.delete(empiId)
}

// Function to get patient data with caching
function getPatientData(empiId: string) {
  if (patientDataCache.has(empiId)) {
    return patientDataCache.get(empiId)
  }
  
  const basePatient = allPatientsData.find(p => p.empiId === empiId)
  if (!basePatient) {
    return null
  }
  
  const patientData = generatePatientDetailsData(empiId, basePatient)
  
  // Debug logging
  console.log(`Generated patient data for ${empiId} (${basePatient.programName}):`, {
    symptomsCount: patientData.symptoms?.length || 0,
    activitiesCount: patientData.activityLogs?.length || 0,
    firstFewSymptoms: patientData.symptoms?.slice(0, 3) || []
  })
  
  patientDataCache.set(empiId, patientData)
  return patientData
}








const detailTabs = [
  { id: "journey", label: "Journey" },
  { id: "consultation", label: "Consultation History" },
  { id: "allergies", label: "Allergies" },
  { id: "medications", label: "Medications" },
  { id: "symptoms", label: "Symptoms" },
  { id: "lab-reports", label: "Lab Reports" },
  { id: "health-markers", label: "Health Markers" },
  { id: "claims", label: "Claims" },
  { id: "plans", label: "Plans" },
  { id: "activity", label: "Activity Logs" },
]

const symptomIcons = {
  Fatigue: Zap,
  Headache: Brain,
  Nausea: Heart,
  Fever: Thermometer,
  Cough: Cough,
}

const activityIcons = {
  Exercise: Dumbbell,
  Food: Utensils,
  Steps: Footprints,
  Medication: Pill,
}




export default function PatientDetailTabs({ patientId, onNavigateToTatvaAI }: PatientDetailTabsProps) {
  const [activeDetailTab, setActiveDetailTab] = useState("journey")
  const [openDetailTabs, setOpenDetailTabs] = useState<string[]>([])
  const [activeDetailSubTab, setActiveDetailSubTab] = useState("")
  const [selectedFilter, setSelectedFilter] = useState("ALL")
  const [symptomDateFilter, setSymptomDateFilter] = useState("")
  const [activityDateFilter, setActivityDateFilter] = useState("")
  const [isPatientInfoExpanded, setIsPatientInfoExpanded] = useState(false)
  const [showAIPatientSummary, setShowAIPatientSummary] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  
  // Health Marker drilldown state - removed modal approach
  
  // Get dynamic patient data
  const patientData = getPatientData(patientId)
  const patientInfo = patientData?.patientInfo

  const [symptomViewMode, setSymptomViewMode] = useState<ViewMode>("daily-list")
  const [activityViewMode, setActivityViewMode] = useState<ViewMode>("daily-list")

  // Health Markers view state
  const [healthMarkersView, setHealthMarkersView] = useState<"data" | "trends">("data")
  const [selectedHealthMarker, setSelectedHealthMarker] = useState("")
  const [healthMarkerTimeFilter, setHealthMarkerTimeFilter] = useState("6M")
  const [healthMarkerCategoryFilter, setHealthMarkerCategoryFilter] = useState("all")
  
  // Set initial health marker when data is available
  useEffect(() => {
    if (patientData?.healthMarkers?.length && !selectedHealthMarker) {
      setSelectedHealthMarker(patientData.healthMarkers[0].healthMarker)
    }
  }, [patientData?.healthMarkers, selectedHealthMarker])
  
  // Lab Reports filter state
  const [labReportsCategoryFilter, setLabReportsCategoryFilter] = useState("all")
  
  // Medications filter state
  const [medicationsPrescribedByFilter, setMedicationsPrescribedByFilter] = useState("all")
  const [medicationsMedicationFilter, setMedicationsMedicationFilter] = useState("all")

  // Tab overflow management
  const [visibleTabsCount, setVisibleTabsCount] = useState(0)
  const [showTabDropdown, setShowTabDropdown] = useState(false)
  const tabContainerRef = useRef<HTMLDivElement>(null)

  // Dynamic tab width calculation similar to worklist screen
  useEffect(() => {
    const estimateWidth = (label: string) => {
      // Estimate character width (11px per char) + padding + close button + border
      const labelPx = label.length * 11
      const padding = 32 // px-4 = 16px each side
      const closeBtn = 24 // Close button width
      const border = 2
      return Math.round(labelPx + padding + closeBtn + border)
    }

    const recalculateVisibleTabs = () => {
      const container = tabContainerRef.current
      if (!container) return

      const totalWidth = container.clientWidth
      
      // Calculate width taken by main detail tabs
      let mainTabsWidth = 0
      detailTabs.forEach(tab => {
        mainTabsWidth += estimateWidth(tab.label)
      })

      // Account for "More" dropdown button width when needed
      const moreButtonWidth = 80
      let availableWidth = totalWidth - mainTabsWidth

      // Calculate how many sub-tabs can fit
      let count = 0
      let usedWidth = 0

      for (let i = 0; i < openDetailTabs.length; i++) {
        const tabLabel = getDetailTabLabel(openDetailTabs[i])
        const tabWidth = estimateWidth(tabLabel)
        
        // Check if we need to reserve space for "More" button
        const needsMoreButton = (i + 1) < openDetailTabs.length
        const reservedWidth = needsMoreButton ? moreButtonWidth : 0
        
        if (usedWidth + tabWidth + reservedWidth <= availableWidth) {
          usedWidth += tabWidth
          count++
        } else {
          break
        }
      }

      setVisibleTabsCount(Math.max(0, count))
    }

    // Initial calculation
    recalculateVisibleTabs()
    
    // Recalculate on resize
    window.addEventListener('resize', recalculateVisibleTabs)
    
    return () => window.removeEventListener('resize', recalculateVisibleTabs)
  }, [openDetailTabs, detailTabs])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTabDropdown) {
        setShowTabDropdown(false)
      }
    }

    if (showTabDropdown) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showTabDropdown])

  // Helper function to aggregate symptoms by date
  const aggregateSymptomsByDate = () => {
    if (!patientData?.symptoms) return []
    
    const symptomsByDate = patientData.symptoms.reduce((acc, symptom) => {
      if (!acc[symptom.date]) acc[symptom.date] = []
      acc[symptom.date].push(symptom)
      return acc
    }, {} as Record<string, any[]>)
    
    const aggregated = Object.entries(symptomsByDate).map(([date, symptoms]) => {
      const uniqueSymptoms = [...new Set(symptoms.map((s) => s.symptom))]
      const severities = symptoms.map((s) => s.severity)
      const hasSevere = severities.includes("Severe")
      const hasModerate = severities.includes("Moderate")

      let notes = `${symptoms.length} episodes recorded: ${uniqueSymptoms.join(", ")}`
      if (hasSevere) notes += " (Severe episodes noted)"
      else if (hasModerate) notes += " (Moderate episodes noted)"

      return { date, notes }
    })

    // Filter by date if filter is applied
    if (symptomDateFilter) {
      return aggregated.filter((item) => item.date.includes(symptomDateFilter))
    }

    return aggregated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // Helper function to aggregate activities by date
  const aggregateActivitiesByDate = () => {
    if (!patientData?.activityLogs) return []
    
    const activitiesByDate = patientData.activityLogs.reduce((acc, activity) => {
      if (!acc[activity.date]) acc[activity.date] = []
      acc[activity.date].push(activity)
      return acc
    }, {} as Record<string, any[]>)
    
    const aggregated = Object.entries(activitiesByDate).map(([date, activities]) => {
      const typeCounts = activities.reduce(
        (acc, activity) => {
          const type = activity.activity || "Activity"
          acc[type] = (acc[type] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      const typeStrings = Object.entries(typeCounts).map(([type, count]) => `${count} ${type}`)
      const notes = `${activities.length} activities logged: ${typeStrings.join(", ")}`

      return { date, notes }
    })

    // Filter by date if filter is applied
    if (activityDateFilter) {
      return aggregated.filter((item) => item.date.includes(activityDateFilter))
    }

    return aggregated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // Get unique dates for filter options
  const getSymptomFilterDates = () => {
    if (!patientData?.symptoms) return { dates: [], months: [] }
    const dates = [...new Set(patientData.symptoms.map(s => s.date))]
    const months = [...new Set(dates.map((date) => date.substring(0, 7)))]
    return { dates, months }
  }

  const getActivityFilterDates = () => {
    if (!patientData?.activityLogs) return { dates: [], months: [] }
    const dates = [...new Set(patientData.activityLogs.map(a => a.date))]
    const months = [...new Set(dates.map((date) => date.substring(0, 7)))]
    return { dates, months }
  }

  const handleDetailRowDoubleClick = (type: string, date: string, data: any) => {
    let tabId = ""

    if (type === "consultation") {
      tabId = `consultation-${date}`
    } else if (type === "symptoms") {
      tabId = `symptoms-${date}`
    } else if (type === "activity") {
      tabId = `activity-${date}`
    } else if (type === "labs") {
      const labSlug = (data?.diagnosticsName || "lab").toString().toLowerCase().replace(/\s+/g, '-')
      tabId = `labs-${date}-${labSlug}`
    }

    if (!openDetailTabs.includes(tabId)) {
      setOpenDetailTabs((prev) => [...prev, tabId])
    }
    setActiveDetailSubTab(tabId)
  }
  
  const handleHealthMarkerDoubleClick = (healthMarker: any) => {
    const tabId = `health-marker-${healthMarker.healthMarker.replace(/\s+/g, '-').toLowerCase()}`
    
    if (!openDetailTabs.includes(tabId)) {
      setOpenDetailTabs((prev) => [...prev, tabId])
    }
    setActiveDetailSubTab(tabId)
  }

  const handleMonthDoubleClick = (type: string, year: number, month: number) => {
    const monthStr = `${year}-${month.toString().padStart(2, "0")}`
    const tabId = `${type}-month-${monthStr}`

    if (!openDetailTabs.includes(tabId)) {
      setOpenDetailTabs((prev) => [...prev, tabId])
    }
    setActiveDetailSubTab(tabId)
  }

  const handleCloseDetailTab = (tabId: string) => {
    setOpenDetailTabs((prev) => prev.filter((id) => id !== tabId))
    if (activeDetailSubTab === tabId) {
      setActiveDetailSubTab("")
    }
  }

  const getDetailTabLabel = (tabId: string) => {
    const parts = tabId.split("-")
    const type = parts[0]

    if (parts[1] === "month") {
      const monthStr = parts.slice(2).join("-")
      const [year, month] = monthStr.split("-")
      const monthName = new Date(Number.parseInt(year), Number.parseInt(month) - 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
      return `${type === "symptoms" ? "Symptoms" : "Activity"} - ${monthName}`
    } else if (type === "health" && parts[1] === "marker") {
      const markerName = parts.slice(2).join(" ")
      return markerName.charAt(0).toUpperCase() + markerName.slice(1)
    } else if (type === "labs") {
      const date = parts[1]
      return `Labs-${date}`
    } else {
      const date = parts.slice(1).join("-")
      switch (type) {
        case "consultation":
          return `Consultation ${date}`
        case "symptoms":
          return `Symptoms-${date}`
        case "activity":
          return `Activity-${date}`
        default:
          return tabId
      }
    }
  }

  const renderHealthMarkersTrendsView = () => {
    if (!patientData?.healthMarkers) return null
    const selectedMarkerData = patientData.healthMarkers.find((m) => m.healthMarker === selectedHealthMarker)
    if (!selectedMarkerData) return null

    const getFilteredData = () => {
      const now = new Date()
      const startDate = new Date()

      switch (healthMarkerTimeFilter) {
        case "7D":
          startDate.setDate(now.getDate() - 7)
          break
        case "30D":
          startDate.setDate(now.getDate() - 30)
          break
        case "6M":
          startDate.setMonth(now.getMonth() - 6)
          break
        case "1Y":
          startDate.setFullYear(now.getFullYear() - 1)
          break
        default:
          return selectedMarkerData.history
      }

      return selectedMarkerData.history.filter((item) => new Date(item.date) >= startDate)
    }

    const filteredData = getFilteredData()

    // Fix the chart calculation logic
    if (filteredData.length === 0) {
      return <div className="p-6 text-center text-text80">No data available for selected time period</div>
    }

    const values = filteredData.map((d) => d.value)
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)
    const range = maxValue - minValue

    // Handle case where all values are the same
    const chartRange = range === 0 ? 1 : range
    const chartMin = range === 0 ? minValue - 0.5 : minValue
    const chartMax = range === 0 ? maxValue + 0.5 : maxValue

    return (
      <div className="space-y-6">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              {selectedMarkerData.healthMarker} Trend Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Chart Area - Recharts */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RLineChart
                    data={filteredData.map(p => ({
                      label: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      value: p.value,
                      date: p.date,
                    }))}
                    margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--stroke-grey))" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--text-80))' }} />
                    <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--text-80))' }} domain={[chartMin, chartMax]} />
                    <Tooltip formatter={(v: any) => [`${v} ${selectedMarkerData.units}`, selectedMarkerData.healthMarker]} labelFormatter={(l: any, p: any) => p?.[0]?.payload?.date || l} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--brand-primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </RLineChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-brand/10 p-3 rounded-lg">
                  <label className="text-sm font-medium text-brand">Current Value</label>
                  <p className="text-lg font-semibold text-brand">
                    {selectedMarkerData.latestValue} {selectedMarkerData.units}
                  </p>
                </div>
                <div className="bg-success/10 p-3 rounded-lg">
                  <label className="text-sm font-medium text-success">Trend</label>
                  <p className="text-lg font-semibold text-success capitalize">{selectedMarkerData.trend}</p>
                </div>
                <div className="bg-info/10 p-3 rounded-lg">
                  <label className="text-sm font-medium text-info">Category</label>
                  <p className="text-lg font-semibold text-info">{selectedMarkerData.category}</p>
                </div>
                <div className="bg-warning/10 p-3 rounded-lg">
                  <label className="text-sm font-medium text-warning">Data Points</label>
                  <p className="text-lg font-semibold text-warning">{filteredData.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!patientData || !patientInfo) {
    return <div className="p-6">Patient not found</div>
  }
  
  const consultationHistory = patientData.consultationHistory || []
  const symptoms = patientData.symptoms || []
  const claims = patientData.claims || []
  const healthMarkers = patientData.healthMarkers || []
  const labReports = patientData.labReports || []
  const medications = patientData.medications || []

  const renderMainTabContent = () => {
    switch (activeDetailTab) {
      case "journey":
        return (
          <PatientJourneyTimeline
            consultations={consultationHistory}
            labReports={labReports}
            onOpenConsultation={(date, c) => handleDetailRowDoubleClick("consultation", date, c)}
            onOpenLab={(date, r) => handleDetailRowDoubleClick("labs", date, r)}
          />
        )
      case "allergies":
        return renderAllergiesTab()
      case "consultation":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Referred By</TableHead>
                <TableHead>Clinic/Hospital</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultationHistory.map((consultation, index) => (
                <TableRow
                  key={index}
                  className="cursor-pointer hover:bg-bg10"
                  onDoubleClick={() => handleDetailRowDoubleClick("consultation", consultation.date, consultation)}
                >
                  <TableCell>{consultation.date}</TableCell>
                  <TableCell>{consultation.type}</TableCell>
                  <TableCell>{consultation.duration}</TableCell>
                  <TableCell>{consultation.doctorName}</TableCell>
                  <TableCell>{consultation.referredBy || '-'}</TableCell>
                  <TableCell>{consultation.clinic}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="secondary" className="text-xs px-2 py-1 whitespace-nowrap">{consultation.status}</Badge>
                  </TableCell>
                  <TableCell>{consultation.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )

      case "symptoms":
        const symptomFilterOptions = getSymptomFilterDates()
        const aggregatedSymptoms = aggregateSymptomsByDate()

        return (
          <div className="space-y-4">
            {/* View and Filter Controls */}
            <div className="flex items-center justify-between gap-4 p-4 bg-bg10 rounded-lg">
              <TimelineViewSelector
                viewMode={symptomViewMode}
                onViewModeChange={setSymptomViewMode}
                availableViews={["daily-list", "monthly-summary", "monthly-calendar"]}
              />

              {symptomViewMode === "daily-list" && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-text80" />
                    <span className="text-sm font-medium text-text100">Filter by:</span>
                  </div>
                  <Select value={symptomDateFilter || "ALL"} onValueChange={setSymptomDateFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select date/month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All dates</SelectItem>
                      {symptomFilterOptions.months.map((month) => (
                        <SelectItem key={month} value={month}>
                          {month} (Month)
                        </SelectItem>
                      ))}
                      {symptomFilterOptions.dates.map((date) => (
                        <SelectItem key={date} value={date}>
                          {date}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {symptomDateFilter && (
                    <Button variant="outline" size="sm" onClick={() => setSymptomDateFilter("")} className="h-9">
                      Clear
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Render based on view mode */}
            {symptomViewMode === "daily-list" && (
              <>
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-text80 mb-2 p-2 bg-bg10 rounded">
                    Debug: Showing {symptoms.length} symptoms for {patientInfo?.program}
                  </div>
                )}
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {symptoms.map((symptom, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer hover:bg-bg10"
                      onDoubleClick={() => handleDetailRowDoubleClick("symptoms", symptom.date, symptom)}
                    >
                      <TableCell className="font-medium">{symptom.date}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={symptom.reporter === "Doctor" ? "default" : "outline"}
                          className="text-xs px-2 py-1 whitespace-nowrap"
                        >
                          {symptom.reporter}
                        </Badge>
                      </TableCell>
                      <TableCell>{symptom.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </>
            )}

            {symptomViewMode === "monthly-summary" && (
              <MonthlySummaryView
                dataType="symptoms"
                onMonthClick={(year, month) => handleMonthDoubleClick("symptoms", year, month)}
              />
            )}

            {symptomViewMode === "monthly-calendar" && (
              <MonthlyCalendarView
                dataType="symptoms"
                onDateClick={(date) => handleDetailRowDoubleClick("symptoms", date, { date })}
              />
            )}
          </div>
        )

      case "activity":
        const activityFilterOptions = getActivityFilterDates()
        const aggregatedActivities = aggregateActivitiesByDate()

        return (
          <div className="space-y-4">
            {/* View and Filter Controls */}
            <div className="flex items-center justify-between gap-4 p-4 bg-bg10 rounded-lg">
              <TimelineViewSelector
                viewMode={activityViewMode}
                onViewModeChange={setActivityViewMode}
                availableViews={["daily-list", "monthly-summary", "monthly-calendar"]}
              />

              {activityViewMode === "daily-list" && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-text80" />
                    <span className="text-sm font-medium text-text100">Filter by:</span>
                  </div>
                  <Select value={activityDateFilter || "ALL"} onValueChange={setActivityDateFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select date/month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All dates</SelectItem>
                      {activityFilterOptions.months.map((month) => (
                        <SelectItem key={month} value={month}>
                          {month} (Month)
                        </SelectItem>
                      ))}
                      {activityFilterOptions.dates.map((date) => (
                        <SelectItem key={date} value={date}>
                          {date}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activityDateFilter && (
                    <Button variant="outline" size="sm" onClick={() => setActivityDateFilter("")} className="h-9">
                      Clear
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Render based on view mode */}
            {activityViewMode === "daily-list" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregatedActivities.map((activity, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer hover:bg-bg10"
                      onDoubleClick={() => handleDetailRowDoubleClick("activity", activity.date, activity)}
                    >
                      <TableCell className="font-medium">{activity.date}</TableCell>
                      <TableCell>
                        <Badge variant={activity.reporter === "Doctor" ? "default" : "outline"}>
                          {activity.reporter || "Patient"}
                        </Badge>
                      </TableCell>
                      <TableCell>{activity.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {activityViewMode === "monthly-summary" && (
              <MonthlySummaryView
                dataType="activity"
                onMonthClick={(year, month) => handleMonthDoubleClick("activity", year, month)}
              />
            )}

            {activityViewMode === "monthly-calendar" && (
              <MonthlyCalendarView
                dataType="activity"
                onDateClick={(date) => handleDetailRowDoubleClick("activity", date, { date })}
              />
            )}
          </div>
        )

      case "health-markers":
        return (
          <div className="space-y-4">
            {/* View Selector */}
            <div className="flex items-center justify-between gap-4 p-4 bg-bg10 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text100">View:</span>
                <Select
                  value={healthMarkersView}
                  onValueChange={(value: "data" | "trends") => setHealthMarkersView(value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data">Data</SelectItem>
                    <SelectItem value="trends">Trends</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {healthMarkersView === "data" && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-text80" />
                    <span className="text-sm font-medium text-text100">Category:</span>
                    <Select value={healthMarkerCategoryFilter} onValueChange={setHealthMarkerCategoryFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Diabetes">Diabetes</SelectItem>
                        <SelectItem value="Heart">Heart</SelectItem>
                        <SelectItem value="Kidney">Kidney</SelectItem>
                        <SelectItem value="Liver">Liver</SelectItem>
                        <SelectItem value="Thyroid">Thyroid</SelectItem>
                        <SelectItem value="Body Composition">Body Composition</SelectItem>
                      </SelectContent>
                    </Select>
                    {healthMarkerCategoryFilter !== "all" && (
                      <Button variant="outline" size="sm" onClick={() => setHealthMarkerCategoryFilter("all")} className="h-9">
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {healthMarkersView === "trends" && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text100">Health Marker:</span>
                    <Select value={selectedHealthMarker} onValueChange={setSelectedHealthMarker}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {healthMarkers.map((marker) => (
                          <SelectItem key={marker.healthMarker} value={marker.healthMarker}>
                            {marker.healthMarker}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text100">Time Period:</span>
                    <Select value={healthMarkerTimeFilter} onValueChange={setHealthMarkerTimeFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7D">7 Days</SelectItem>
                        <SelectItem value="30D">30 Days</SelectItem>
                        <SelectItem value="6M">6 Months</SelectItem>
                        <SelectItem value="1Y">1 Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Render based on view */}
            {healthMarkersView === "data" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Health Marker</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Latest Value</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthMarkers
                    .filter(marker => healthMarkerCategoryFilter === "all" || marker.category === healthMarkerCategoryFilter)
                    .map((marker, index) => (
                    <TableRow 
                      key={index} 
                      className="hover:bg-bg10 cursor-pointer"
                      onDoubleClick={() => handleHealthMarkerDoubleClick(marker)}
                      title="Double-click to view detailed trend chart"
                    >
                      <TableCell className="font-medium">{marker.healthMarker}</TableCell>
                      <TableCell>{marker.category}</TableCell>
                      <TableCell>{marker.latestValue}</TableCell>
                      <TableCell>{marker.units}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {marker.trend === "increasing" ? (
                            <TrendingUp className="w-4 h-4 text-success" />
                          ) : marker.trend === "decreasing" ? (
                            <TrendingDown className="w-4 h-4 text-danger" />
                          ) : (
                            <Minus className="w-4 h-4 text-text80" />
                          )}
                          <span className="capitalize text-sm">{marker.trend}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              renderHealthMarkersTrendsView()
            )}
          </div>
        )

      case "claims":
        // Summary for biweekly lab claims (urine tests)
        const parsePHP = (v: string) => Number(String(v || '0').replace(/[^0-9]/g, ''))
        const biweeklyLabClaims = claims.filter(c => (c.claimType || '').toLowerCase() === 'lab tests (urine)')
        const biweeklyCount = biweeklyLabClaims.length
        const biweeklyTotalClaimed = biweeklyLabClaims.reduce((sum, c) => sum + parsePHP(c.amountClaimed), 0)
        const biweeklyTotalReimbursed = biweeklyLabClaims.reduce((sum, c) => sum + parsePHP(c.amountReimbursed), 0)

        return (
          <div className="space-y-3">
            {biweeklyCount > 0 && (
              <div className="flex flex-wrap items-center gap-3 p-3 bg-[hsl(var(--bg-10))] border border-[hsl(var(--stroke-grey))] rounded-lg">
                <span className="text-sm font-medium text-[hsl(var(--text-100))]">Biweekly Lab Claims Summary:</span>
                <Badge variant="outline" className="text-xs">Count: {biweeklyCount}</Badge>
                <Badge variant="outline" className="text-xs">
                  Total Claimed: ₱{biweeklyTotalClaimed.toLocaleString('en-PH')}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Total Reimbursed: ₱{biweeklyTotalReimbursed.toLocaleString('en-PH')}
                </Badge>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Claim ID</TableHead>
                    <TableHead className="w-24">Date</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead className="w-28">Hospital</TableHead>
                    <TableHead className="w-24">Insurance</TableHead>
                    <TableHead className="w-20">Claimed</TableHead>
                    <TableHead className="w-20">Reimbursed</TableHead>
                    <TableHead className="w-24">Reviewed By</TableHead>
                    <TableHead className="w-16">Docs</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
            <TableBody>
              {claims.map((claim, index) => (
                <TableRow key={index} className="hover:bg-bg10">
                  <TableCell className="font-medium">{claim.id}</TableCell>
                  <TableCell className="whitespace-nowrap">{claim.submissionDate}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge 
                      variant={
                        claim.status === "Approved" ? "default" :
                        claim.status === "Reimbursed" ? "default" :
                        claim.status === "Submitted" ? "outline" :
                        "secondary"
                      }
                      className="text-xs px-2 py-1 whitespace-nowrap"
                    >
                      {claim.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{claim.claimType}</TableCell>
                  <TableCell>{claim.hospital}</TableCell>
                  <TableCell>{claim.insuranceProvider}</TableCell>
                  <TableCell>{claim.amountClaimed}</TableCell>
                  <TableCell>{claim.amountReimbursed}</TableCell>
                  <TableCell>{claim.reviewedBy}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                        {claim.documents.length} docs
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                        Download
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
              </Table>
            </div>
          </div>
        )

      case "lab-reports":
        // Group lab reports by visit (date + diagnosticsName)
        const groupedLabVisits = Object.values(
          labReports
            .filter(report => labReportsCategoryFilter === "all" || report.category === labReportsCategoryFilter)
            .reduce((acc: Record<string, any>, r) => {
              const key = `${r.date}|${r.diagnosticsName}`
              if (!acc[key]) {
                acc[key] = {
                  date: r.date,
                  diagnosticsName: r.diagnosticsName,
                  tests: [] as { name: string; category: string }[],
                  prescribedBySet: new Set<string>(),
                }
              }
              acc[key].tests.push({ name: r.testName, category: r.category })
              if ((r as any).prescribedBy) acc[key].prescribedBySet.add((r as any).prescribedBy as string)
              return acc
            }, {})
        ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

        return (
          <div className="space-y-4">
            {/* Filter Controls */}
            <div className="flex items-center gap-4 p-4 bg-bg10 rounded-lg">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-text80" />
                <span className="text-sm font-medium text-text100">Category:</span>
                <Select value={labReportsCategoryFilter} onValueChange={setLabReportsCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Diabetes">Diabetes</SelectItem>
                    <SelectItem value="Cardiovascular">Cardiovascular</SelectItem>
                    <SelectItem value="Nephrology">Nephrology</SelectItem>
                    <SelectItem value="Ophthalmology">Ophthalmology</SelectItem>
                  </SelectContent>
                </Select>
                {labReportsCategoryFilter !== "all" && (
                  <Button variant="outline" size="sm" onClick={() => setLabReportsCategoryFilter("all")} className="h-9">
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Diagnostics Name</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Prescribed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedLabVisits.map((visit: any, index: number) => {
                  const testsLabel = `${visit.tests.length} test${visit.tests.length !== 1 ? 's' : ''}`
                  const prescribedBy = Array.from(visit.prescribedBySet).join(', ') || '-'
                  return (
                    <TableRow
                      key={`${visit.date}-${visit.diagnosticsName}-${index}`}
                      className="hover:bg-bg10 cursor-pointer"
                      onDoubleClick={() => handleDetailRowDoubleClick("labs", visit.date, visit)}
                      title="Double-click to view visit details"
                    >
                      <TableCell className="font-medium whitespace-nowrap">{visit.date}</TableCell>
                      <TableCell className="whitespace-nowrap">{visit.diagnosticsName}</TableCell>
                      <TableCell className="whitespace-nowrap">{testsLabel}</TableCell>
                      <TableCell className="whitespace-nowrap">{prescribedBy}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )

      case "medications":
        return (
          <div className="space-y-4">
            {/* Filter Controls */}
            <div className="flex items-center gap-4 p-4 bg-bg10 rounded-lg">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-text80" />
                <span className="text-sm font-medium text-text100">Prescribed By:</span>
                <Select value={medicationsPrescribedByFilter} onValueChange={setMedicationsPrescribedByFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Doctors</SelectItem>
                    <SelectItem value="Dr. Priya Gupta, MD">Dr. Priya Gupta, MD</SelectItem>
                  </SelectContent>
                </Select>
                {medicationsPrescribedByFilter !== "all" && (
                  <Button variant="outline" size="sm" onClick={() => setMedicationsPrescribedByFilter("all")} className="h-9">
                    Clear
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text100">Medication:</span>
                <Select value={medicationsMedicationFilter} onValueChange={setMedicationsMedicationFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Medications</SelectItem>
                    <SelectItem value="Metformin">Metformin</SelectItem>
                    <SelectItem value="Glimepiride">Glimepiride</SelectItem>
                    <SelectItem value="Aspirin">Aspirin</SelectItem>
                    <SelectItem value="Atorvastatin">Atorvastatin</SelectItem>
                    <SelectItem value="Vitamin D3">Vitamin D3</SelectItem>
                  </SelectContent>
                </Select>
                {medicationsMedicationFilter !== "all" && (
                  <Button variant="outline" size="sm" onClick={() => setMedicationsMedicationFilter("all")} className="h-9">
                    Clear
                  </Button>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Medication</TableHead>
                    <TableHead className="w-20">Dosage</TableHead>
                    <TableHead className="w-24">Frequency</TableHead>
                    <TableHead className="w-16">Route</TableHead>
                    <TableHead className="w-24">Start Date</TableHead>
                    <TableHead className="w-24">End Date</TableHead>
                    <TableHead className="w-28">Prescribed By</TableHead>
                    <TableHead className="w-24">Purpose</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-36">Notes</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {medications
                  .filter(medication => 
                    (medicationsPrescribedByFilter === "all" || medication.prescribedBy === medicationsPrescribedByFilter) &&
                    (medicationsMedicationFilter === "all" || medication.medicationName === medicationsMedicationFilter)
                  )
                  .map((medication, index) => (
                  <TableRow key={index} className="hover:bg-bg10">
                    <TableCell className="font-medium">{medication.medicationName}</TableCell>
                    <TableCell>{medication.dosage}</TableCell>
                    <TableCell>{medication.frequency}</TableCell>
                    <TableCell>{medication.route}</TableCell>
                    <TableCell className="whitespace-nowrap">{medication.startDate}</TableCell>
                    <TableCell className="whitespace-nowrap">{medication.endDate}</TableCell>
                    <TableCell className="truncate max-w-32">{medication.prescribedBy}</TableCell>
                    <TableCell className="truncate max-w-24">{medication.purpose}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge
                        variant={
                          medication.status === "Active"
                            ? "default"
                            : medication.status === "Discontinued"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs px-2 py-1 whitespace-nowrap"
                      >
                        {medication.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="truncate max-w-40">{medication.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          </div>
        )

      case "plans":
        return (
          <CarePlans 
            patientConditions={patientInfo?.program ? [patientInfo.program] : []}
            patientId={patientId}
          />
        )

      default:
        return null
    }
  }

  const renderAllergiesTab = () => {
    // Default allergies for Maria (EMPI999901), recorded by Dr. Sophie on first visit
    const isMaria = (patientInfo?.empiId || '').toUpperCase() === 'EMPI999901'
    const recordedBy = 'Dr. Sophie'
    const recordedOn = '2024-09-02'
    const medicalAllergies = isMaria
      ? [
          { name: 'Penicillin', reaction: 'Rash / urticaria', severity: 'Moderate', status: 'Active' },
          { name: 'NSAIDs (Ibuprofen)', reaction: 'Gastric upset', severity: 'Mild', status: 'Caution' },
        ]
      : []
    const personalAllergies = isMaria
      ? [
          { name: 'Latex', reaction: 'Contact dermatitis', severity: 'Moderate', status: 'Active' },
          { name: 'Seafood (Shrimp)', reaction: 'Urticaria', severity: 'Mild', status: 'Active' },
        ]
      : []

    if (!isMaria) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-text100">Allergies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text80">No documented allergies for this patient.</p>
          </CardContent>
        </Card>
      )
    }

    const BadgePill = ({ text, tone = 'default' }: { text: string; tone?: 'default' | 'danger' | 'warning' | 'success' }) => (
      <span
        className={`inline-block text-[10px] px-2 py-0.5 rounded border ${
          tone === 'danger'
            ? 'bg-red-50 text-red-700 border-red-200'
            : tone === 'warning'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : tone === 'success'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-slate-50 text-slate-700 border-slate-200'
        }`}
      >
        {text}
      </span>
    )

    const renderList = (items: any[]) => (
      <div className="divide-y divide-stroke">
        {items.map((a, idx) => (
          <div key={idx} className="py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text100 truncate">{a.name}</span>
                <BadgePill text={a.severity} tone={a.severity === 'Moderate' ? 'warning' : a.severity === 'Severe' ? 'danger' : 'default'} />
                <BadgePill text={a.status} tone={a.status === 'Active' ? 'danger' : a.status === 'Caution' ? 'warning' : 'success'} />
              </div>
              <p className="text-sm text-text80 mt-0.5">Reaction: {a.reaction}</p>
            </div>
          </div>
        ))}
      </div>
    )

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-text80">Recorded on <span className="font-medium text-text100">{recordedOn}</span> by <span className="font-medium text-text100">{recordedBy}</span></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border border-[hsl(var(--stroke-grey))]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text100">Medical Allergies</CardTitle>
            </CardHeader>
            <CardContent>{renderList(medicalAllergies)}</CardContent>
          </Card>
          <Card className="border border-[hsl(var(--stroke-grey))]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-text100">Personal / Environmental</CardTitle>
            </CardHeader>
            <CardContent>{renderList(personalAllergies)}</CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // AI toolbar state
  const [showCarePathway, setShowCarePathway] = useState(false)
  const [isGeneratingCare, setIsGeneratingCare] = useState(false)
  const [selectedCareProgram, setSelectedCareProgram] = useState<string>("")

  const renderDetailSubTabContent = (tabId: string) => {
    const parts = tabId.split("-")
    const type = parts[0]

    if (parts[1] === "month") {
      // Handle month drill-down - show monthly timeline view for that specific month
      const monthStr = parts.slice(2).join("-")
      const [year, month] = monthStr.split("-")

      return (
        <MonthlyTimelineView
          dataType={type as "symptoms" | "activity"}
          initialYear={Number.parseInt(year)}
          initialMonth={Number.parseInt(month)}
          onDateClick={(date) => handleDetailRowDoubleClick(type, date, { date })}
        />
      )
    } else {
      // For lab details, the tab id encodes date and diagnostics slug
      if (type === 'labs') {
        const date = parts[1]
        const labSlug = parts.slice(2).join("-")
        return renderLabVisitDetails(date, labSlug)
      }
      const date = parts.slice(1).join("-")
      switch (type) {
        case "consultation":
          return renderConsultationDetail(date)
        case "symptoms":
          return renderSymptomTimeline(date)
        case "activity":
          return renderActivityTimeline(date)
        case "health":
          // Handle health marker drilldown
          if (parts[1] === "marker") {
            const markerName = parts.slice(2).join("-").replace(/-/g, ' ')
            const markerData = healthMarkers.find(m => 
              m.healthMarker.toLowerCase().replace(/\s+/g, '-') === markerName.toLowerCase().replace(/\s+/g, '-')
            )
            if (markerData) {
              return renderHealthMarkerTrend(markerData)
            }
          }
          return <div className="p-6 text-center text-text80">Health marker not found</div>
        default:
          return <div className="p-6 text-center text-text80">Unknown tab type: {type}</div>
      }
    }
  }

  const renderConsultationDetail = (date: string) => {
    const consultation = consultationHistory.find(c => c.date === date)
    if (!consultation) return <div className="p-6 text-center text-text80">Consultation details not found</div>

    // Find nearest prior lab date (prefer same diagnostics window 2–3 days before)
    const toDate = (s: string) => new Date(s)
    const priorLab = (() => {
      const past = labReports
        .filter(r => toDate(r.date) <= toDate(date))
        .sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime())
      return past[0] || null
    })()

    const priorLabDate = priorLab?.date
    const priorLabDiag = priorLab?.diagnosticsName

    // Build marker snapshot for that lab date (pull from healthMarkers history)
    const markerKeys = [
      'HbA1c', 'Fasting Glucose', 'Post-Meal Glucose', 'Urine Protein',
      'TSH', 'Vitamin D', 'Vitamin B12', 'Hemoglobin', 'WBC Count'
    ]
    const labSnapshot: Array<{ name: string; value: string; units: string; status: string }> = []
    if (priorLabDate && healthMarkers?.length) {
      for (const key of markerKeys) {
        const m = healthMarkers.find((hm: any) => hm.healthMarker === key)
        if (!m) continue
        const hit = (m.history || []).find((h: any) => h.date === priorLabDate)
        if (!hit) continue
        labSnapshot.push({ name: key, value: String(hit.value), units: m.units, status: String(hit.status || 'normal') })
      }
    }

    // Date-specific narrative stitching for Maria’s journey
    const narrative = (() => {
      const d = date
      const dr = consultation.doctorName || ''
      if (d === '2024-09-02') {
        return 'Pregnancy identified and baseline antenatal plan initiated. Education on nutrition, folate, and routine labs. No acute concerns.'
      }
      if (d === '2024-10-02') {
        return 'Antenatal follow-up: vitals stable, ultrasound schedule confirmed. Notes indicate stable progress; no acute findings.'
      }
      if (d === '2024-11-02') {
        return 'Antenatal follow-up: monitoring continues with stable trends. Reinforced adherence to supplements and exercise.'
      }
      if (d === '2024-12-02') {
        return 'Third trimester planning. No acute findings. Baseline for next trimester laboratories captured prior to specialist review.'
      }
      if (d === '2025-01-02') {
        return 'Consultation with Dr. Philip (Senior Specialist – Gynaecology) for early warning indicators. Review pre-visit labs for risk screening; plan closer surveillance.'
      }
      if (d === '2025-02-02') {
        return 'Follow-up after specialist review: care plan clarified; adherence reinforced. Stable clinical exam.'
      }
      if (d === '2025-03-02') {
        return 'Consultation with Dr. Peter (Diabetologist): gestational glucose risk addressed. Therapy and monitoring tightened based on labs; counselling provided.'
      }
      if (d === '2025-05-25') {
        return 'Peripartum evaluation and delivery: Status improved and stable; proceeding with normal delivery as clinically appropriate.'
      }
      // Default for biweekly routine touchpoints
      return 'Routine antenatal touchpoint: vitals reviewed; no new red flags. Continue current plan.'
    })()

    return (
      <div className="space-y-6">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Consultation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-text80">Date</label>
                <p className="text-sm font-semibold">{consultation.date}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Type</label>
                <p className="text-sm font-semibold">{consultation.type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Duration</label>
                <p className="text-sm font-semibold">{consultation.duration}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Status</label>
                <Badge variant="secondary" className="text-xs px-2 py-1 whitespace-nowrap">{consultation.status}</Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-text80">Doctor</label>
              <p className="text-sm font-semibold">{consultation.doctorName}</p>
            </div>

            {consultation.referredBy && (
              <div>
                <label className="text-sm font-medium text-text80">Referred By</label>
                <p className="text-sm font-semibold">{consultation.referredBy}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-text80">Clinic</label>
              <p className="text-sm font-semibold">{consultation.clinic}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-text80">Notes</label>
              <div className="text-sm bg-bg10 p-3 rounded-lg space-y-2">
                <p>{narrative}</p>
                {consultation.notes && (
                  <p className="text-text80">Clinician note: {consultation.notes}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pre-visit Lab Summary */}
        {priorLabDate && (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Pre‑visit Labs ({priorLabDate}) — {priorLabDiag || 'Diagnostics'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {labSnapshot.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48">Marker</TableHead>
                        <TableHead className="w-24">Value</TableHead>
                        <TableHead className="w-20">Units</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labSnapshot.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-bg10">
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell>{row.value}</TableCell>
                          <TableCell>{row.units}</TableCell>
                          <TableCell>
                            <Badge variant={/normal/i.test(row.status) ? 'secondary' : 'outline'} className="capitalize text-xs px-2 py-1">
                              {row.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-text80">No health marker values recorded for this lab date.</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Meeting Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <Video className="w-4 h-4 mr-2" />
                View Recording
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                Download Notes
              </Button>
              <Button variant="outline" size="sm">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Follow-up
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderLabVisitDetails = (date: string, labSlug?: string) => {
    const toSlug = (s: string) => s.toLowerCase().replace(/\s+/g, '-')
    const visitReports = labReports.filter(r => r.date === date && (!labSlug || toSlug(r.diagnosticsName) === labSlug))
    if (visitReports.length === 0) return <div className="p-6 text-center text-text80">Lab visit details not found</div>

    const diagnosticsName = visitReports[0].diagnosticsName
    const prescribedByList = Array.from(new Set(visitReports.map(r => (r as any).prescribedBy).filter(Boolean))) as string[]

    return (
      <div className="space-y-6">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Lab Visit Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-text80">Date</label>
                <p className="text-sm font-semibold">{date}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Diagnostics</label>
                <p className="text-sm font-semibold">{diagnosticsName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Tests</label>
                <p className="text-sm font-semibold">{visitReports.length}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Prescribed By</label>
                <p className="text-sm font-semibold">{prescribedByList.length ? prescribedByList.join(', ') : '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="text-lg text-text100">Tests Performed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">Test</TableHead>
                    <TableHead className="w-28">Category</TableHead>
                    <TableHead className="w-60">Summary</TableHead>
                    <TableHead className="w-36">Document</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitReports.map((r, idx) => (
                    <TableRow key={idx} className="hover:bg-bg10">
                      <TableCell className="font-medium">{r.testName}</TableCell>
                      <TableCell>{r.category}</TableCell>
                      <TableCell className="max-w-xl">{r.summary}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.document}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderSymptomTimeline = (date: string) => {
    return <HourlyTimelineView 
      date={date} 
      type="symptoms" 
      patientCondition={patientInfo?.program}
      patientId={patientId}
    />
  }

  const renderActivityTimeline = (date: string) => {
    return <HourlyTimelineView 
      date={date} 
      type="activity" 
      patientCondition={patientInfo?.program}
      patientId={patientId}
    />
  }

  const renderHealthMarkerTrend = (marker: any) => {
    if (!marker || !marker.history) {
      return <div className="p-6 text-center text-text80">No data available</div>
    }

    const sortedHistory = [...marker.history].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const values = sortedHistory.map(d => d.value)
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)
    const range = maxValue - minValue || 1
    const chartMin = minValue - range * 0.1
    const chartMax = maxValue + range * 0.1
    const chartRange = chartMax - chartMin

    return (
      <div className="space-y-6">
        {/* Header Card */}
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-text100">
              <Heart className="w-5 h-5 text-brand" />
              {marker.healthMarker} Trend Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RLineChart
                    data={sortedHistory.map(p => ({
                      label: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      value: p.value,
                      date: p.date,
                    }))}
                    margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--stroke-grey))" />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--text-80))' }} />
                    <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--text-80))' }} domain={[chartMin, chartMax]} />
                    <Tooltip formatter={(v: any) => [`${v} ${marker.units}`, marker.healthMarker]} labelFormatter={(l: any, p: any) => p?.[0]?.payload?.date || l} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--brand-primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </RLineChart>
                </ResponsiveContainer>
              </div>

              {/* Minimal summary stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-bg10 rounded-lg">
                  <label className="text-xs font-medium text-text80">Current Value</label>
                  <p className="text-lg font-semibold text-text100">
                    {marker.latestValue} {marker.units}
                  </p>
                </div>
                <div className="p-3 bg-bg10 rounded-lg">
                  <label className="text-xs font-medium text-text80">Trend</label>
                  <p className="text-lg font-semibold text-text100 capitalize">
                    {marker.trend}
                  </p>
                </div>
                <div className="p-3 bg-bg10 rounded-lg">
                  <label className="text-xs font-medium text-text80">Category</label>
                  <p className="text-lg font-semibold text-text100">
                    {marker.category}
                  </p>
                </div>
                <div className="p-3 bg-bg10 rounded-lg">
                  <label className="text-xs font-medium text-text80">Data Points</label>
                  <p className="text-lg font-semibold text-text100">
                    {sortedHistory.length}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data table - minimal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-text100">Historical Values</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Date</TableHead>
                    <TableHead className="w-24">Value</TableHead>
                    <TableHead className="w-28">Lab</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-28">Reference Range</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedHistory.slice().reverse().map((record, index) => (
                    <TableRow key={index} className="hover:bg-bg10">
                      <TableCell className="whitespace-nowrap">{record.date}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {record.value} {marker.units}
                      </TableCell>
                      <TableCell className="truncate max-w-32">{record.labName}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge 
                          variant={record.status === 'normal' ? 'secondary' : 'outline'}
                          className="capitalize text-xs px-2 py-1 whitespace-nowrap"
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-text80 whitespace-nowrap">
                        {record.referenceRange.min}-{record.referenceRange.max} {marker.units}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderTabContent = () => {
    if (activeDetailSubTab) {
      return renderDetailSubTabContent(activeDetailSubTab)
    }
    return renderMainTabContent()
  }

  // Calculate visible and overflow tabs
  const visibleSubTabs = openDetailTabs.slice(0, visibleTabsCount)
  const overflowSubTabs = openDetailTabs.slice(visibleTabsCount)
  const hasOverflow = overflowSubTabs.length > 0

  console.log(
    "Open tabs:",
    openDetailTabs.length,
    "Visible:",
    visibleSubTabs.length,
    "Overflow:",
    overflowSubTabs.length,
  )

  return (
    <div className="p-6 space-y-6 flex-1 flex flex-col min-h-0 overflow-auto">
      {/* Patient Info Box */}
      <Card className="rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium text-[hsl(var(--text-100))]">
            <User className="w-4 h-4 text-[hsl(var(--text-80))]" />
            Patient Information
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPatientInfoExpanded(!isPatientInfoExpanded)}
              className="text-[hsl(var(--text-80))] hover:text-[hsl(var(--text-100))] border-[hsl(var(--stroke-grey))] bg-transparent hover:bg-[hsl(var(--bg-10))] h-7 text-xs px-2"
            >
            {isPatientInfoExpanded ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                More
              </>
            )}
          </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Always visible first row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-text80">EMPI ID</label>
              <p className="text-sm font-semibold">{patientInfo.empiId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text80">Name</label>
              <p className="text-sm font-semibold">{patientInfo.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text80">Mobile</label>
              <p className="text-sm font-semibold">{patientInfo.mobile}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-text80">CPF</label>
              <p className="text-sm font-semibold">{patientInfo.cpf || patientInfo.abhaId}</p>
            </div>
          </div>

          {/* Expandable section */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isPatientInfoExpanded ? "max-h-96 mt-4" : "max-h-0"
            }`}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t border-stroke">
              <div>
                <label className="text-sm font-medium text-text80">Date of Birth</label>
                <p className="text-sm font-semibold">{patientInfo.dateOfBirth}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Gender</label>
                <p className="text-sm font-semibold">{patientInfo.gender}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Address</label>
                <p className="text-sm font-semibold">{patientInfo.address}, {patientInfo.pincode}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Source</label>
                <p className="text-sm font-semibold">{patientInfo.source}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Program</label>
                <p className="text-sm font-semibold">{patientInfo.program}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Doctor</label>
                <p className="text-sm font-semibold">{patientInfo.doctorName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Assigning Authority</label>
                <p className="text-sm font-semibold">{patientInfo.assigningAuthority}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Insurance Provider</label>
                <p className="text-sm font-semibold">{patientInfo.insuranceProvider}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Family ID</label>
                <p className="text-sm font-semibold">{patientInfo.familyId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Head of Family</label>
                <p className="text-sm font-semibold">{patientInfo.headOfFamily}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Status</label>
                <p className="text-sm font-semibold">{patientInfo.status}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-text80">Preferred Language</label>
                <p className="text-sm font-semibold">{patientInfo.preferredLanguage}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI toolbar row: left-aligned controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (showAIPatientSummary) {
              setShowAIPatientSummary(false)
              return
            }
            setIsGeneratingSummary(true)
            setTimeout(() => {
              setIsGeneratingSummary(false)
              setShowAIPatientSummary(true)
            }, 1200)
          }}
          className="h-8 text-xs border-[hsl(var(--brand-primary))]/30 text-[hsl(var(--brand-primary))] bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100"
        >
          {isGeneratingSummary ? (
            <>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 mr-2" />
              {showAIPatientSummary ? "Hide Patient Summary" : "Show Patient Summary"}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (showCarePathway) {
              setShowCarePathway(false)
              return
            }
            setIsGeneratingCare(true)
            setTimeout(() => {
              setIsGeneratingCare(false)
              setShowCarePathway(true)
            }, 1200)
          }}
          className="h-8 text-xs border-[hsl(var(--brand-primary))]/30 text-[hsl(var(--brand-primary))] bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100"
        >
          <Target className="w-3 h-3 mr-2" />
          Recommended Care Pathway
        </Button>
        {onNavigateToTatvaAI && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateToTatvaAI(patientId)}
            className="h-8 text-xs text-purple-600 hover:text-purple-700 border-purple-200 hover:border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100"
          >
            <Sparkles className="w-3 h-3 mr-2" />
            Ask Tatva AI
          </Button>
        )}
      </div>
      {isGeneratingSummary && (
        <div className="border border-[hsl(var(--stroke-grey))] rounded-lg p-4 animate-pulse bg-white">
          <div className="h-4 w-40 bg-[hsl(var(--bg-10))] rounded mb-4"></div>
          <div className="h-3 w-full bg-[hsl(var(--bg-10))] rounded mb-2"></div>
          <div className="h-3 w-11/12 bg-[hsl(var(--bg-10))] rounded mb-2"></div>
          <div className="h-3 w-10/12 bg-[hsl(var(--bg-10))] rounded"></div>
        </div>
      )}
      {showAIPatientSummary && !isGeneratingSummary && (
        <AIPatientSummary 
          patientData={generatePatientSummary({
            ...patientInfo,
            consultationHistory,
            labReports,
            healthMarkers,
            claims,
          })}
          onAskTatvaAI={onNavigateToTatvaAI}
          showControls={false}
        />
      )}

      {isGeneratingCare && (
        <div className="border border-[hsl(var(--stroke-grey))] rounded-lg p-4 animate-pulse bg-white">
          <div className="h-4 w-56 bg-[hsl(var(--bg-10))] rounded mb-4"></div>
          <div className="h-3 w-full bg-[hsl(var(--bg-10))] rounded mb-2"></div>
          <div className="h-3 w-11/12 bg-[hsl(var(--bg-10))] rounded mb-2"></div>
          <div className="h-3 w-10/12 bg-[hsl(var(--bg-10))] rounded"></div>
        </div>
      )}
      {showCarePathway && !isGeneratingCare && (() => {
        const rec = generateRecommendations(generatePatientSummary(patientInfo))
        const { primaryRecommendation, alternativeRecommendations, pastToPresent, presentToFuture } = rec
        const programs = [primaryRecommendation, ...alternativeRecommendations]
        const currentSelection = selectedCareProgram || primaryRecommendation.id
        if (!selectedCareProgram) setSelectedCareProgram(primaryRecommendation.id)
        const handleAssign = async () => {
          const chosen = programs.find(p => p.id === currentSelection)
          if (!chosen) return
          // Simulate assign
          await new Promise(r => setTimeout(r, 800))
          toast.success("Care Plan Assigned", { description: `${patientInfo.name} enrolled in ${chosen.name}` })
        }
        return (
          <Card className="border border-[hsl(var(--stroke-grey))] rounded-lg overflow-hidden">
            <CardHeader className="bg-white">
              <CardTitle className="flex items-center gap-2 text-base font-medium text-[hsl(var(--text-100))]">
                <Target className="w-4 h-4 text-[hsl(var(--brand-primary))]" />
                Recommended Care Pathway
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Program selector and Assign action */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {programs.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedCareProgram(p.id)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        currentSelection === p.id
                          ? "bg-[hsl(var(--brand-primary))]/10 border-[hsl(var(--brand-primary))]/30 text-[hsl(var(--brand-primary))]"
                          : "bg-white border-[hsl(var(--stroke-grey))] text-[hsl(var(--text-80))] hover:bg-[hsl(var(--bg-10))]"
                      }`}
                      title={p.description}
                    >
                      {p.name}
                      {idx === 0 && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] border border-[hsl(var(--brand-primary))]/20">Primary</span>
                      )}
                    </button>
                  ))}
                </div>
                <div>
                  <Button onClick={handleAssign} size="sm" className="h-8 bg-[hsl(var(--brand-primary))] text-white hover:bg-[hsl(var(--brand-primary))]/90">
                    Assign Plan
                  </Button>
                </div>
              </div>

              {/* Past to Present */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--text-100))] mb-3">{pastToPresent.title}</p>
                  <ul className="space-y-2">
                    {pastToPresent.items.map((it, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Calendar className="w-4 h-4 text-[hsl(var(--text-80))] mt-0.5" />
                        <div>
                          <p className="text-xs text-[hsl(var(--text-80))]">{it.date}</p>
                          <p className="text-sm text-[hsl(var(--text-100))]">{it.event}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--text-100))] mb-3">{presentToFuture.title}</p>
                  <ul className="space-y-2">
                    {presentToFuture.items.map((it, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-[hsl(var(--text-80))] mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-[hsl(var(--text-100))]">{it.timeline}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              it.priority === 'high'
                                ? 'bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] border-[hsl(var(--brand-primary))]/20'
                                : 'bg-[hsl(var(--text-80))]/10 text-[hsl(var(--text-80))] border-[hsl(var(--text-80))]/20'
                            }`}>{it.priority}</span>
                          </div>
                          <p className="text-sm text-[hsl(var(--text-80))]">{it.goal}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Detail Tabs */}
      <div className="bg-white border border-stroke rounded-lg overflow-hidden flex flex-col min-h-0 flex-1">
        <div className="border-b border-stroke">
          <div ref={tabContainerRef} className="flex items-center overflow-hidden">
            {/* Main tabs - always visible */}
            {detailTabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap flex-shrink-0 ${
                  activeDetailTab === tab.id && !activeDetailSubTab
                    ? "border-brand text-brand"
                    : "border-transparent text-text80 hover:text-text100"
                }`}
                onClick={() => {
                  setActiveDetailTab(tab.id)
                  setActiveDetailSubTab("")
                }}
              >
                {tab.label}
              </button>
            ))}

            {/* Visible sub-tabs */}
            {visibleSubTabs.map((tabId) => (
              <div key={tabId} className="flex items-center flex-shrink-0">
                <button
                  className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                    activeDetailSubTab === tabId
                      ? "border-brand text-brand"
                      : "border-transparent text-text80 hover:text-text100"
                  }`}
                  onClick={() => setActiveDetailSubTab(tabId)}
                >
                  {getDetailTabLabel(tabId)}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCloseDetailTab(tabId)
                  }}
                  className="ml-1 p-1 hover:bg-bg10 rounded flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Overflow dropdown for remaining tabs */}
            {hasOverflow && (
              <div className="relative flex-shrink-0">
                <button
                  className="px-4 py-3 text-sm font-medium border-b-2 border-transparent text-text80 hover:text-text100 flex items-center gap-1 whitespace-nowrap"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowTabDropdown(!showTabDropdown)
                  }}
                >
                  More ({overflowSubTabs.length})
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showTabDropdown && (
                  <div
                    className="absolute top-full left-0 mt-1 bg-white border border-stroke rounded-lg shadow-xl z-[9999] min-w-48"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {overflowSubTabs.map((tabId) => (
                      <div
                        key={tabId}
                        className="flex items-center hover:bg-bg10 border-b border-stroke last:border-b-0"
                      >
                        <button
                          className={`flex-1 px-4 py-3 text-left text-sm ${
                            activeDetailSubTab === tabId ? "text-brand font-medium" : "text-text100"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveDetailSubTab(tabId)
                            setShowTabDropdown(false)
                          }}
                        >
                          {getDetailTabLabel(tabId)}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCloseDetailTab(tabId)
                          }}
                          className="p-2 hover:bg-bg100 rounded mr-2"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 overflow-auto flex-1 min-h-0">{renderTabContent()}</div>
      </div>
      
    </div>
  )
}
