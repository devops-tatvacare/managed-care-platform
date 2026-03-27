"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Thermometer, CigaretteIcon as Cough, Brain, Heart, Zap } from "lucide-react"

interface SymptomTimelineViewProps {
  symptomId: string
}

const symptomIcons = {
  Fatigue: Zap,
  Headache: Brain,
  Nausea: Heart,
  Fever: Thermometer,
  Cough: Cough,
}

const mockSymptomTimeline = {
  "2024-01-12-Fatigue": {
    date: "2024-01-12",
    symptom: "Fatigue",
    timeline: [
      { time: "08:30", severity: "Moderate", notes: "Woke up feeling tired", frequency: "Continuous" },
      { time: "12:15", severity: "Severe", notes: "Energy levels very low after lunch", frequency: "Continuous" },
      { time: "16:45", severity: "Moderate", notes: "Slight improvement after rest", frequency: "Intermittent" },
      { time: "20:30", severity: "Mild", notes: "Feeling better in evening", frequency: "Occasional" },
    ],
  },
  "2024-01-10-Headache": {
    date: "2024-01-10",
    symptom: "Headache",
    timeline: [
      { time: "07:00", severity: "Mild", notes: "Morning headache", frequency: "Occasional" },
      { time: "14:30", severity: "Severe", notes: "Intense pain after screen time", frequency: "Continuous" },
      { time: "18:00", severity: "Moderate", notes: "Pain reduced after medication", frequency: "Intermittent" },
    ],
  },
}

export default function SymptomTimelineView({ symptomId }: SymptomTimelineViewProps) {
  const symptomData = mockSymptomTimeline[symptomId as keyof typeof mockSymptomTimeline]

  if (!symptomData) {
    return <div className="p-6 text-center text-gray-500">Symptom timeline not found</div>
  }

  const SymptomIcon = symptomIcons[symptomData.symptom as keyof typeof symptomIcons] || Heart

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "severe":
        return "destructive"
      case "moderate":
        return "default"
      case "mild":
        return "secondary"
      default:
        return "secondary"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SymptomIcon className="w-5 h-5" />
            {symptomData.symptom} Timeline - {symptomData.date}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* 24-hour timeline bar */}
            <div className="flex items-center mb-6">
              <span className="text-xs text-gray-500 w-12">00:00</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full mx-4 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full"></div>
              </div>
              <span className="text-xs text-gray-500 w-12">24:00</span>
            </div>

            {/* Timeline events */}
            <div className="space-y-4">
              {symptomData.timeline.map((event, index) => {
                const timePercent =
                  ((Number.parseInt(event.time.split(":")[0]) * 60 + Number.parseInt(event.time.split(":")[1])) /
                    (24 * 60)) *
                  100

                return (
                  <div key={index} className="relative">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-2 w-20">
                        <span className="text-sm font-medium">{event.time}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <SymptomIcon className="w-4 h-4 text-blue-600" />
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityColor(event.severity) as any}>{event.severity}</Badge>
                          <Badge variant="outline">{event.frequency}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{event.notes}</p>
                      </div>
                    </div>

                    {/* Timeline position indicator */}
                    <div
                      className="absolute top-0 w-2 h-2 bg-blue-500 rounded-full"
                      style={{ left: `${20 + timePercent * 0.6}%`, transform: "translateX(-50%)" }}
                    ></div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Total Episodes</label>
              <p className="text-lg font-semibold">{symptomData.timeline.length}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Peak Severity</label>
              <p className="text-lg font-semibold">
                {symptomData.timeline.reduce(
                  (max, event) =>
                    event.severity === "Severe"
                      ? "Severe"
                      : max === "Severe"
                        ? max
                        : event.severity === "Moderate"
                          ? "Moderate"
                          : max,
                  "Mild",
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Duration</label>
              <p className="text-lg font-semibold">
                {symptomData.timeline.length > 1
                  ? `${symptomData.timeline[0].time} - ${symptomData.timeline[symptomData.timeline.length - 1].time}`
                  : symptomData.timeline[0].time}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Pattern</label>
              <p className="text-lg font-semibold">
                {symptomData.timeline.some((e) => e.frequency === "Continuous") ? "Continuous" : "Intermittent"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
