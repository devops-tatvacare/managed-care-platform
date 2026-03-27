"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  X,
  Activity,
  Dumbbell,
  Utensils,
  Footprints,
  Pill,
  Zap,
  Brain,
  Heart,
  Thermometer,
  CigaretteIcon as Cough,
} from "lucide-react"
import { getPatientTimelineData } from "@/utils/timeline-data"

interface HourlyTimelineViewProps {
  date: string
  type: "symptoms" | "activity"
  patientCondition?: string
  patientId?: string
}

const activityIcons = {
  Exercise: Dumbbell,
  Food: Utensils,
  Steps: Footprints,
  Medication: Pill,
  Treatment: Heart,
  Rest: Heart,
  Activity: Activity,
}

const symptomIcons = {
  Fatigue: Zap,
  Headache: Brain,
  Nausea: Heart,
  Fever: Thermometer,
  Cough: Cough,
  "Excessive Thirst": Thermometer,
  "Frequent Urination": Heart,
  "Blurred Vision": Brain,
  Dizziness: Brain,
  "Chest Pain": Heart,
  "Shortness of Breath": Heart,
  Pain: Brain,
  "Loss of Appetite": Heart,
  Anxiety: Brain,
  Depression: Brain,
  Insomnia: Brain,
  "Morning Sickness": Heart,
  "Back Pain": Brain,
  Weakness: Zap,
}

const hours = Array.from({ length: 24 }, (_, i) => i)

export default function HourlyTimelineView({ date, type, patientCondition, patientId }: HourlyTimelineViewProps) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null)

  const dayItems = patientCondition && patientId 
    ? getPatientTimelineData(date, patientCondition, patientId)
    : getPatientTimelineData(date, "Diabetes Management", "default")

  // DEBUG: Log what we're getting
  console.log(`HourlyTimelineView DEBUG for ${date}:`, {
    patientCondition,
    patientId,
    type,
    totalItems: dayItems.length,
    symptoms: dayItems.filter(item => item.dataType === 'symptom').length,
    activities: dayItems.filter(item => item.dataType === 'activity').length,
    sampleItems: dayItems.slice(0, 3)
  })

  const getHourData = (hour: number) => {
    const hourItems = dayItems.filter((item) => {
      const itemHour = Number.parseInt(item.time.split(":")[0])
      return itemHour === hour
    })

    const filteredItems = hourItems
      .filter((item) => {
        if (type === "activity") {
          return item.dataType === "activity"
        } else if (type === "symptoms") {
          return item.dataType === "symptom"
        }
        return false
      })
      .sort((a, b) => a.time.localeCompare(b.time))

    // DEBUG: Log hour data for hours that should have data
    if (hourItems.length > 0 || filteredItems.length > 0) {
      console.log(`Hour ${hour} data:`, {
        hourItems: hourItems.length,
        filteredItems: filteredItems.length,
        requestedType: type,
        sampleItem: hourItems[0]
      })
    }

    return filteredItems
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "Exercise":
        return "text-green-600 bg-green-100"
      case "Food":
        return "text-orange-600 bg-orange-100"
      case "Steps":
        return "text-blue-600 bg-blue-100"
      case "Medication":
        return "text-purple-600 bg-purple-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getSymptomColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "severe":
        return "text-red-600 bg-red-100"
      case "moderate":
        return "text-yellow-600 bg-yellow-100"
      case "mild":
        return "text-green-600 bg-green-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const renderIcon = (item: any) => {
    if (item.dataType === "activity") {
      const IconComponent = activityIcons[item.type as keyof typeof activityIcons] || Activity
      return <IconComponent className={`w-3 h-3 ${getActivityColor(item.type).split(" ")[0]}`} />
    } else {
      const IconComponent = symptomIcons[item.symptom as keyof typeof symptomIcons] || Heart
      return <IconComponent className={`w-3 h-3 ${getSymptomColor(item.severity).split(" ")[0]}`} />
    }
  }

  const handleHourClick = (hour: number) => {
    const hourData = getHourData(hour)
    if (hourData.length > 0) {
      setSelectedHour(selectedHour === hour ? null : hour)
    }
  }

  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, "0")}:00`
  }

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
    gap: "4px",
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Hourly Timeline - {date} ({type === "symptoms" ? "Symptoms" : "Activities"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Time Labels at Top */}
            <div style={gridStyle} className="mb-2">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="text-xs text-center text-gray-500 font-medium transform -rotate-45 origin-center"
                >
                  {formatTime(hour)}
                </div>
              ))}
            </div>

            {/* Vertical Timeline Bars */}
            <div style={{ ...gridStyle, height: "200px" }}>
              {hours.map((hour) => {
                const hourData = getHourData(hour)
                const hasData = hourData.length > 0
                const isSelected = selectedHour === hour

                return (
                  <div
                    key={hour}
                    className={`
                      relative border-2 rounded-lg cursor-pointer transition-all duration-200 flex flex-col
                      ${
                        hasData
                          ? "border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100"
                          : "border-gray-200 bg-gray-50 hover:border-gray-300"
                      }
                      ${isSelected ? "border-blue-500 bg-blue-100 shadow-md" : ""}
                    `}
                    onClick={() => handleHourClick(hour)}
                    title={
                      hasData ? `${hourData.length} events at ${formatTime(hour)}` : `No events at ${formatTime(hour)}`
                    }
                  >
                    {/* Activity Count Badge */}
                    {hasData && (
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium z-10">
                        {hourData.length}
                      </div>
                    )}

                    {/* Icons Container - Vertical Layout */}
                    <div className="relative flex-1 w-full p-0.5">
                      {hourData.slice(0, 8).map((item, index) => {
                        const minutes = Number.parseInt(item.time.split(":")[1])
                        const topPosition = (minutes / 60) * 80 + 10

                        return (
                          <div
                            key={index}
                            className={`
                              absolute w-5 h-5 rounded-full flex items-center justify-center left-1/2 transform -translate-x-1/2
                              ${
                                item.dataType === "activity"
                                  ? getActivityColor(item.type || item.activity)
                                  : getSymptomColor(item.severity)
                              }
                            `}
                            style={{
                              top: `${topPosition}%`,
                              zIndex: hourData.length - index,
                            }}
                          >
                            <div className="w-3 h-3 flex items-center justify-center">{renderIcon(item)}</div>
                          </div>
                        )
                      })}

                      {/* Overflow indicator */}
                      {hourData.length > 8 && (
                        <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 bg-white rounded px-1">
                          +{hourData.length - 8}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Panel */}
      {selectedHour !== null && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {formatTime(selectedHour)} - {formatTime(selectedHour + 1)} Details
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedHour(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getHourData(selectedHour).map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <div
                    className={`
                    w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                    ${
                      item.dataType === "activity"
                        ? getActivityColor(item.type || item.activity)
                        : getSymptomColor(item.severity)
                    }
                  `}
                  >
                    {renderIcon(item)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{item.time}</span>
                      {item.dataType === "activity" ? (
                        <>
                          <Badge variant="outline">{item.type}</Badge>
                          <Badge variant="secondary">{item.value}</Badge>
                        </>
                      ) : (
                        <>
                          <Badge variant="outline">{item.symptom}</Badge>
                          <Badge
                            variant={
                              item.severity === "Severe"
                                ? "destructive"
                                : item.severity === "Moderate"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {item.severity}
                          </Badge>
                          <Badge variant="outline">{item.frequency}</Badge>
                        </>
                      )}
                    </div>

                    <p className="text-sm text-gray-600">
                      {item.dataType === "activity" ? `${item.activity}: ${item.details}` : item.notes}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
