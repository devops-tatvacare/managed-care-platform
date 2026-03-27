"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { getMonthData, getAvailableMonths } from "@/utils/timeline-data"
import type { DataType } from "@/types/timeline"

interface MonthlyCalendarViewProps {
  dataType: DataType
  onDateClick?: (date: string) => void
}

export default function MonthlyCalendarView({ dataType, onDateClick }: MonthlyCalendarViewProps) {
  const availableMonths = getAvailableMonths()
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0) // Start with first available month

  const currentMonth = availableMonths[currentMonthIndex]
  const monthData = getMonthData(currentMonth.year, currentMonth.month, dataType)

  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }

  const getDayData = (day: number) => {
    const dateStr = `${currentMonth.year}-${currentMonth.month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
    return monthData.days.find((d) => d.date === dateStr)
  }

  const getFilteredCount = (dayData: any) => {
    if (!dayData) return 0

    switch (dataType) {
      case "symptoms":
        return dayData.symptoms.length
      case "activity":
        return dayData.activities.length
      default:
        return 0
    }
  }

  const getDisplayIcons = (dayData: any) => {
    if (!dayData) return []

    const items = []
    if (dataType === "symptoms") {
      items.push(...dayData.symptoms.map((s: any) => ({ type: s.symptom, severity: s.severity })))
    }
    if (dataType === "activity") {
      items.push(...dayData.activities.map((a: any) => ({ type: a.type })))
    }

    return items.slice(0, 3) // Show max 3 icons
  }

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev" && currentMonthIndex > 0) {
      setCurrentMonthIndex(currentMonthIndex - 1)
    } else if (direction === "next" && currentMonthIndex < availableMonths.length - 1) {
      setCurrentMonthIndex(currentMonthIndex + 1)
    }
  }

  const days = getDaysInMonth(currentMonth.year, currentMonth.month)
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {currentMonth.label} - {dataType === "symptoms" ? "Symptoms" : "Activities"}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("prev")}
              disabled={currentMonthIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("next")}
              disabled={currentMonthIndex === availableMonths.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Week day headers */}
          {weekDays.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-b">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="p-2 h-20"></div>
            }

            const dayData = getDayData(day)
            const count = getFilteredCount(dayData)
            const icons = getDisplayIcons(dayData)
            const dateStr = `${currentMonth.year}-${currentMonth.month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`

            return (
              <div
                key={index}
                className={`p-2 h-20 border border-gray-200 cursor-pointer hover:bg-gray-50 ${
                  count > 0 ? "bg-blue-50 border-blue-200" : ""
                }`}
                onClick={() => count > 0 && onDateClick?.(dateStr)}
              >
                <div className="text-sm font-medium mb-1">{day}</div>
                {count > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs bg-blue-500 text-white rounded px-1 w-fit">{count}</div>
                    <div className="flex gap-1 flex-wrap">
                      {icons.map((icon, iconIndex) => (
                        <div
                          key={iconIndex}
                          className={`w-3 h-3 rounded-full text-xs flex items-center justify-center ${
                            icon.severity === "Severe"
                              ? "bg-red-200"
                              : icon.severity === "Moderate"
                                ? "bg-yellow-200"
                                : icon.severity === "Mild"
                                  ? "bg-green-200"
                                  : icon.type === "Exercise"
                                    ? "bg-green-200"
                                    : icon.type === "Food"
                                      ? "bg-orange-200"
                                      : icon.type === "Medication"
                                        ? "bg-purple-200"
                                        : "bg-gray-200"
                          }`}
                          title={icon.type}
                        >
                          {icon.type === "Exercise"
                            ? "💪"
                            : icon.type === "Food"
                              ? "🍽️"
                              : icon.type === "Medication"
                                ? "💊"
                                : icon.type === "Steps"
                                  ? "👣"
                                  : icon.type === "Fatigue"
                                    ? "😴"
                                    : icon.type === "Headache"
                                      ? "🤕"
                                      : icon.type === "Nausea"
                                        ? "🤢"
                                        : "•"}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-4 text-sm text-gray-600 text-center">
          Click on any date with data to see detailed timeline
        </div>
      </CardContent>
    </Card>
  )
}
