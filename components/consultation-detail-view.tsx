"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Video, Calendar } from "lucide-react"

interface ConsultationDetailViewProps {
  consultationId: string
}

const mockConsultationDetails = {
  "2024-01-10": {
    date: "2024-01-10",
    time: "10:00 AM",
    duration: "30 min",
    type: "Diet",
    status: "Completed",
    notes:
      "Patient discussed meal planning strategies. Reviewed current eating habits and identified areas for improvement. Recommended increasing fiber intake and reducing processed foods.",
    documents: [
      { name: "meal_plan.pdf", type: "PDF", size: "245 KB" },
      { name: "blood_report.pdf", type: "PDF", size: "180 KB" },
      { name: "diet_guidelines.pdf", type: "PDF", size: "320 KB" },
    ],
    videoLink: "https://meet.example.com/consultation-123",
    nextSteps: ["Follow meal plan for 2 weeks", "Track daily food intake", "Schedule follow-up in 2 weeks"],
  },
}

export default function ConsultationDetailView({ consultationId }: ConsultationDetailViewProps) {
  const consultation = mockConsultationDetails[consultationId as keyof typeof mockConsultationDetails]

  if (!consultation) {
    return <div className="p-6 text-center text-gray-500">Consultation details not found</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Consultation Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Date</label>
              <p className="text-sm font-semibold">{consultation.date}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Time</label>
              <p className="text-sm font-semibold">{consultation.time}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Duration</label>
              <p className="text-sm font-semibold">{consultation.duration}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <Badge variant="secondary">{consultation.status}</Badge>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Type</label>
            <p className="text-sm font-semibold">{consultation.type} Consultation</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Notes</label>
            <p className="text-sm bg-gray-50 p-3 rounded-lg">{consultation.notes}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Next Steps</label>
            <ul className="text-sm space-y-1 mt-2">
              {consultation.nextSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents & Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {consultation.documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-gray-500">
                    {doc.type} • {doc.size}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
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
