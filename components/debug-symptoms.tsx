"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { generatePatientDetailsData } from "@/lib/generate-patient-details-data"
import { generatePatientsData } from "@/lib/generate-patients-data"

export default function DebugSymptoms() {
  const [patientData, setPatientData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testPatient = {
    empiId: "EMPI1001234",
    name: "Test Patient",
    programName: "Diabetes Management",
    // Add other required fields
    doctorName: "Dr. Test",
    assigningAuthority: "Test Hospital"
  }

  const generateData = () => {
    setLoading(true)
    try {
      const data = generatePatientDetailsData(testPatient.empiId, testPatient)
      setPatientData(data)
      console.log("Generated patient data:", data)
    } catch (error) {
      console.error("Error generating data:", error)
    }
    setLoading(false)
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Debug Symptoms Data Generation</CardTitle>
          <p className="text-sm text-text80">
            Testing condition-aware symptom generation for: {testPatient.programName}
          </p>
        </CardHeader>
        <CardContent>
          <Button onClick={generateData} disabled={loading}>
            {loading ? "Generating..." : "Generate Test Data"}
          </Button>
          
          {patientData && (
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="font-medium mb-2">Generated Symptoms ({patientData.symptoms?.length || 0}):</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {patientData.symptoms?.map((symptom: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm border rounded p-2">
                      <div>
                        <span className="font-medium">{symptom.date}</span> - {symptom.symptom}
                        <br />
                        <span className="text-text80 text-xs">{symptom.notes}</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={
                          symptom.severity === "Severe" ? "destructive" : 
                          symptom.severity === "Moderate" ? "default" : "secondary"
                        }>
                          {symptom.severity}
                        </Badge>
                        <Badge variant="outline">{symptom.reporter}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Generated Activities ({patientData.activityLogs?.length || 0}):</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {patientData.activityLogs?.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center justify-between text-sm border rounded p-2">
                      <div>
                        <span className="font-medium">{activity.date} {activity.time}</span> - {activity.activity}
                        <br />
                        <span className="text-text80 text-xs">{activity.details}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}