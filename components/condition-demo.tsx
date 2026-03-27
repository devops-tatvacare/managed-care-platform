"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { generateConditionAwareTimeline, CONDITION_SYMPTOM_MAP } from "@/lib/condition-aware-timeline-generator"

const conditions = [
  "Diabetes Management",
  "Hypertension Control", 
  "Cancer Care",
  "Mental Health",
  "Maternal Health",
  "Chronic Disease Management"
]

export default function ConditionDemo() {
  const [selectedCondition, setSelectedCondition] = useState<string>("Diabetes Management")
  const [timeline, setTimeline] = useState<any[]>([])
  const [date] = useState("2024-01-15")
  const [patientId] = useState("EMPI1001234")

  const generateTimeline = () => {
    const newTimeline = generateConditionAwareTimeline(selectedCondition, date, patientId)
    setTimeline(newTimeline)
  }

  const conditionData = CONDITION_SYMPTOM_MAP[selectedCondition as keyof typeof CONDITION_SYMPTOM_MAP]
  const symptoms = timeline.filter(item => item.dataType === 'symptom')
  const activities = timeline.filter(item => item.dataType === 'activity')

  // Group by hour for display
  const hourlyData = timeline.reduce((acc, item) => {
    const hour = item.time.split(':')[0]
    if (!acc[hour]) acc[hour] = []
    acc[hour].push(item)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Condition-Aware Timeline Generator Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedCondition} onValueChange={setSelectedCondition}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {conditions.map(condition => (
                  <SelectItem key={condition} value={condition}>
                    {condition}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={generateTimeline}>Generate Timeline</Button>
          </div>

          {conditionData && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-text100 mb-2">Expected Symptoms:</h4>
                <div className="flex flex-wrap gap-1">
                  {[...conditionData.primary, ...conditionData.secondary].map(symptom => (
                    <Badge key={symptom} variant="outline" className="text-xs">
                      {symptom}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm text-text100 mb-2">Expected Activities:</h4>
                <div className="flex flex-wrap gap-1">
                  {conditionData.activities.map(activity => (
                    <Badge key={activity} variant="secondary" className="text-xs">
                      {activity}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {timeline.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Generated Timeline for {date}</CardTitle>
              <p className="text-sm text-text80">
                {symptoms.length} symptoms • {activities.length} activities • 
                Distributed across {Object.keys(hourlyData).length} hours
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-text100 mb-2">Symptoms Generated:</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {symptoms.map((symptom, index) => (
                      <div key={index} className="flex items-center justify-between text-sm border rounded p-2">
                        <div>
                          <span className="font-medium">{symptom.time}</span> - {symptom.symptom}
                        </div>
                        <Badge variant={
                          symptom.severity === "Severe" ? "destructive" : 
                          symptom.severity === "Moderate" ? "default" : "secondary"
                        }>
                          {symptom.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-text100 mb-2">Activities Generated:</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {activities.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between text-sm border rounded p-2">
                        <div>
                          <span className="font-medium">{activity.time}</span> - {activity.activity}
                        </div>
                        <Badge variant="outline">{activity.value}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hourly Distribution</CardTitle>
              <p className="text-sm text-text80">Shows how symptoms and activities are distributed throughout the day</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-1">
                {Array.from({ length: 24 }, (_, hour) => {
                  const hourStr = hour.toString().padStart(2, '0')
                  const items = hourlyData[hourStr] || []
                  const symptoms = items.filter(i => i.dataType === 'symptom').length
                  const activities = items.filter(i => i.dataType === 'activity').length
                  
                  return (
                    <div key={hour} className="text-center">
                      <div className="text-xs text-text80 mb-1">{hourStr}</div>
                      <div className="h-24 bg-bg10 rounded border relative overflow-hidden">
                        {items.length > 0 && (
                          <>
                            <div 
                              className="absolute bottom-0 left-0 w-1/2 bg-red-200" 
                              style={{ height: `${(symptoms / Math.max(1, items.length)) * 100}%` }}
                              title={`${symptoms} symptoms`}
                            />
                            <div 
                              className="absolute bottom-0 right-0 w-1/2 bg-blue-200" 
                              style={{ height: `${(activities / Math.max(1, items.length)) * 100}%` }}
                              title={`${activities} activities`}
                            />
                            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 text-xs font-medium">
                              {items.length}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-200 rounded" />
                  <span>Symptoms</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-200 rounded" />
                  <span>Activities</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}