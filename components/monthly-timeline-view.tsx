"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
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
import { getAvailableMonths, getTimelineData } from "@/utils/timeline-data"
import type { DataType } from "@/types/timeline"

interface MonthlyTimelineViewProps {
  dataType: DataType
  initialYear?: number
  initialMonth?: number
  onDateClick?: (date: string) => void
}

const activityIcons = {
  Exercise: Dumbbell,
  Food: Utensils,
  Steps: Footprints,
  Medication: Pill,
}

const symptomIcons = {
  Fatigue: Zap,
  Headache: Brain,
  Nausea: Heart,
  Fever: Thermometer,
  Cough: Cough,
}

export default function MonthlyTimelineView({
  dataType,
  initialYear,
  initialMonth,
  onDateClick,
}: MonthlyTimelineViewProps) {
  const availableMonths = getAvailableMonths()

  const initialIndex =
    initialYear && initialMonth
      ? availableMonths.findIndex((m) => m.year === initialYear && m.month === initialMonth)
      : 0

  const [currentMonthIndex, setCurrentMonthIndex] = useState(Math.max(0, initialIndex))
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const currentMonth = availableMonths[currentMonthIndex]

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate()
  }

  const daysInMonth = getDaysInMonth(currentMonth.year, currentMonth.month)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const getDayData = (day: number) => {
    const dateStr = `${currentMonth.year}-${currentMonth.month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
    const dayItems = getTimelineData(dateStr)

    return dayItems
      .filter((item) => {
        if (dataType === "activity") {
          return item.dataType === "activity"
        } else if (dataType === "symptoms") {
          return item.dataType === "symptom"
        }
        return false
      })
      .sort((a, b) => a.time.localeCompare(b.time))
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

  const handleDayClick = (day: number) => {
    const dayData = getDayData(day)
    if (dayData.length > 0) {
      setSelectedDay(selectedDay === day ? null : day)
    }
  }

  const handleDateDoubleClick = (day: number) => {
    const dateStr = `${currentMonth.year}-${currentMonth.month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
    onDateClick?.(dateStr)
  }

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev" && currentMonthIndex > 0) {
      setCurrentMonthIndex(currentMonthIndex - 1)
      setSelectedDay(null)
    } else if (direction === "next" && currentMonthIndex < availableMonths.length - 1) {
      setCurrentMonthIndex(currentMonthIndex + 1)
      setSelectedDay(null)
    }
  }

  const formatDate = (day: number) => {
    const date = new Date(currentMonth.year, currentMonth.month - 1, day)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))`,
    gap: "4px",
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {currentMonth.label} - {dataType === "symptoms" ? "Symptoms" : "Activities"} Timeline
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth("prev")}
                disabled={currentMonthIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth("next")}
                disabled={currentMonthIndex === availableMonths.length - 1}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Date Labels at Top */}
            <div style={gridStyle} className="mb-2">
              {days.map((day) => (
                <div
                  key={day}
                  className="text-xs text-center text-gray-500 font-medium transform -rotate-45 origin-center"
                >
                  {formatDate(day)}
                </div>
              ))}
            </div>

            {/* Vertical Timeline Bars for Days */}
            <div style={{ ...gridStyle, height: "300px" }}>
              {days.map((day) => {
                const dayData = getDayData(day)
                const hasData = dayData.length > 0
                const isSelected = selectedDay === day

                return (
                  <div
                    key={day}
                    className={`
                      relative border-2 rounded-lg cursor-pointer transition-all duration-200 flex flex-col
                      ${
                        hasData
                          ? "border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100"
                          : "border-gray-200 bg-gray-50 hover:border-gray-300"
                      }
                      ${isSelected ? "border-blue-500 bg-blue-100 shadow-md" : ""}
                    `}
                    onClick={() => handleDayClick(day)}
                    onDoubleClick={() => handleDateDoubleClick(day)}
                    title={
                      hasData
                        ? `${dayData.length} events on ${formatDate(day)} - Double-click for details`
                        : `No events on ${formatDate(day)}`
                    }
                  >
                    {/* Event Count Badge */}
                    {hasData && (
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium z-10">
                        {dayData.length}
                      </div>
                    )}

                    {/* Icons Container - Vertical Layout */}
                    <div className="relative flex-1 w-full p-0.5">
                      {dayData.slice(0, 12).map((item, index) => {
                        const hour = Number.parseInt(item.time.split(":")[0])
                        const minute = Number.parseInt(item.time.split(":")[1])
                        const timePercent = ((hour * 60 + minute) / (24 * 60)) * 80 + 10

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
                              top: `${timePercent}%`,
                              zIndex: dayData.length - index,
                            }}
                            title={`${item.time} - ${item.dataType === "activity" ? item.activity : item.symptom}`}
                          >
                            <div className="w-3 h-3 flex items-center justify-center">{renderIcon(item)}</div>
                          </div>
                        )
                      })}

                      {/* Overflow indicator */}
                      {dayData.length > 12 && (
                        <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 bg-white rounded px-1">
                          +{dayData.length - 12}
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

      {/* Detail Panel for Selected Day */}
      {selectedDay !== null && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {formatDate(selectedDay)} Details - {currentMonth.label}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getDayData(selectedDay).map((item, index) => (
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
