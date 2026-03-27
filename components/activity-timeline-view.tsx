"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Activity, Utensils, Footprints, Pill, Dumbbell } from "lucide-react"

interface ActivityTimelineViewProps {
  activityDate: string
}

const activityIcons = {
  Exercise: Dumbbell,
  Food: Utensils,
  Steps: Footprints,
  Medication: Pill,
}

const mockActivityTimeline = {
  "2024-01-14": [
    { time: "06:00", type: "Exercise", activity: "Morning cardio", details: "30 minutes treadmill", value: "30 min" },
    { time: "08:30", type: "Food", activity: "Breakfast", details: "Oatmeal with fruits and nuts", value: "450 cal" },
    { time: "09:00", type: "Medication", activity: "Vitamin D", details: "1000 IU supplement", value: "1 tablet" },
    { time: "12:00", type: "Food", activity: "Lunch", details: "Grilled chicken salad", value: "380 cal" },
    { time: "14:00", type: "Steps", activity: "Walking", details: "Office to parking lot", value: "2,500 steps" },
    { time: "16:30", type: "Exercise", activity: "Strength training", details: "Upper body workout", value: "45 min" },
    { time: "19:00", type: "Food", activity: "Dinner", details: "Salmon with vegetables", value: "520 cal" },
    { time: "21:00", type: "Medication", activity: "Omega-3", details: "Fish oil supplement", value: "2 capsules" },
  ],
}

export default function ActivityTimelineView({ activityDate }: ActivityTimelineViewProps) {
  const [selectedFilter, setSelectedFilter] = useState("ALL")
  const activities = mockActivityTimeline[activityDate as keyof typeof mockActivityTimeline] || []

  const filteredActivities =
    selectedFilter === "ALL" ? activities : activities.filter((activity) => activity.type === selectedFilter)

  const getActivityColor = (type: string) => {
    switch (type) {
      case "Exercise":
        return "text-green-600"
      case "Food":
        return "text-orange-600"
      case "Steps":
        return "text-blue-600"
      case "Medication":
        return "text-purple-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Timeline - {activityDate}
            </CardTitle>
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Activities</SelectItem>
                <SelectItem value="Exercise">Exercise</SelectItem>
                <SelectItem value="Food">Food</SelectItem>
                <SelectItem value="Steps">Steps</SelectItem>
                <SelectItem value="Medication">Medication</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* 24-hour timeline bar */}
            <div className="flex items-center mb-6">
              <span className="text-xs text-gray-500 w-12">00:00</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full mx-4 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-100 to-blue-200 rounded-full"></div>
              </div>
              <span className="text-xs text-gray-500 w-12">24:00</span>
            </div>

            {/* Timeline events */}
            <div className="space-y-4">
              {filteredActivities.map((activity, index) => {
                const timePercent =
                  ((Number.parseInt(activity.time.split(":")[0]) * 60 + Number.parseInt(activity.time.split(":")[1])) /
                    (24 * 60)) *
                  100
                const ActivityIcon = activityIcons[activity.type as keyof typeof activityIcons] || Activity

                return (
                  <div key={index} className="relative">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center gap-2 w-20">
                        <span className="text-sm font-medium">{activity.time}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <ActivityIcon className={`w-4 h-4 ${getActivityColor(activity.type)}`} />
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{activity.type}</Badge>
                          <span className="text-sm font-medium">{activity.activity}</span>
                          <Badge variant="secondary">{activity.value}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{activity.details}</p>
                      </div>
                    </div>

                    {/* Timeline position indicator */}
                    <div
                      className={`absolute top-0 w-2 h-2 rounded-full ${
                        activity.type === "Exercise"
                          ? "bg-green-500"
                          : activity.type === "Food"
                            ? "bg-orange-500"
                            : activity.type === "Steps"
                              ? "bg-blue-500"
                              : activity.type === "Medication"
                                ? "bg-purple-500"
                                : "bg-gray-500"
                      }`}
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
          <CardTitle>Daily Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Exercise</label>
              <p className="text-lg font-semibold">{activities.filter((a) => a.type === "Exercise").length} sessions</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Meals</label>
              <p className="text-lg font-semibold">{activities.filter((a) => a.type === "Food").length} logged</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Steps</label>
              <p className="text-lg font-semibold">
                {activities
                  .filter((a) => a.type === "Steps")
                  .reduce((total, a) => total + Number.parseInt(a.value.replace(/[^\d]/g, "") || "0"), 0)
                  .toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Medications</label>
              <p className="text-lg font-semibold">{activities.filter((a) => a.type === "Medication").length} taken</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
