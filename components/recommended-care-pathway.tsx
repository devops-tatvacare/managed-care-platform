"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Target,
  Calendar,
  Stethoscope,
  Monitor,
  Clock,
  User
} from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"

interface RecommendedCarePathwayProps {
  isOpen: boolean
  onClose: () => void
  patientData: any
  empiId: string
}

interface CareProgram {
  id: string
  name: string
  type: "Diabetes Program" | "PCOS" | "Kidney Care" | "General Wellness" | "Maternal Care"
  description: string
  devices: string[]
  duration: string
  keyBenefits: string[]
  currentRelevance: number
}

export function generateRecommendations(patientData: any): {
  primaryRecommendation: CareProgram
  alternativeRecommendations: CareProgram[]
  pastToPresent: {
    title: string
    items: { date: string; event: string; impact: "positive" | "negative" | "neutral" }[]
  }
  presentToFuture: {
    title: string
    items: { timeline: string; goal: string; priority: "high" | "medium" | "low" }[]
  }
} {
  // Analyze patient conditions to determine best care program
  const mainConditions = patientData.mainConditions || []
  const isMaternal = mainConditions.some((c: string) => c.toLowerCase().includes('pregnan') || c.toLowerCase().includes('maternal')) || patientData.empiId === 'EMPI999901'
  const hasdiabetes = mainConditions.some((condition: string) => 
    condition.toLowerCase().includes('diabetes')
  )
  const hasKidneyIssues = mainConditions.some((condition: string) => 
    condition.toLowerCase().includes('kidney') || condition.toLowerCase().includes('nephro')
  )
  const hasPCOS = mainConditions.some((condition: string) => 
    condition.toLowerCase().includes('pcos') || condition.toLowerCase().includes('ovarian')
  )

  const carePrograms: CareProgram[] = [
    // Maternal program prioritized if relevant
    ...(isMaternal ? [{
      id: "maternal",
      name: "Maternal Care Program (Trimester-based)",
      type: "Maternal Care",
      description: "Structured antenatal care with trimester-specific visits, labs, and counselling.",
      devices: ["BP Monitor", "Smart Scale", "Glucose Meter (if indicated)", "Fetal Doppler (clinic)"] ,
      duration: "40 weeks",
      keyBenefits: [
        "Scheduled antenatal visits (monthly to weekly)",
        "Prenatal screenings and supplements (iron, folate)",
        "Nutrition and danger-sign counselling",
        "Birth preparedness and postnatal follow-up"
      ],
      currentRelevance: 98
    } as CareProgram] : []),
    {
      id: "diabetes",
      name: "Diabetes Management Program",
      type: "Diabetes Program",
      description: "Advanced glucose monitoring with CGM and personalized care management",
      devices: ["CGM Monitor", "Body Analyzer", "Smart Glucometer"],
      duration: "12 months",
      keyBenefits: [
        "24/7 glucose monitoring",
        "Personalized nutrition planning",
        "Regular specialist consultations"
      ],
      currentRelevance: hasdiabetes ? 95 : 30
    },
    {
      id: "pcos",
      name: "PCOS Wellness Program",
      type: "PCOS",
      description: "Hormonal balance and reproductive health management",
      devices: ["Body Analyzer", "Hormone Tracker"],
      duration: "9 months",
      keyBenefits: [
        "Hormonal balance monitoring",
        "Weight management support",
        "Fertility planning assistance"
      ],
      currentRelevance: hasPCOS ? 90 : 20
    },
    {
      id: "kidney",
      name: "Kidney Care Program",
      type: "Kidney Care",
      description: "Early detection and kidney health management",
      devices: ["Body Analyzer", "Function Monitor", "BP Monitor"],
      duration: "8 months",
      keyBenefits: [
        "Early disease detection",
        "Blood pressure optimization",
        "Dietary guidance"
      ],
      currentRelevance: hasKidneyIssues ? 85 : 25
    },
    {
      id: "general",
      name: "Preventive Wellness Program",
      type: "General Wellness",
      description: "Comprehensive health monitoring and preventive care",
      devices: ["Body Analyzer", "Fitness Tracker", "Smart Scale"],
      duration: "6 months",
      keyBenefits: [
        "Health screening",
        "Preventive care planning",
        "Lifestyle optimization"
      ],
      currentRelevance: 40
    }
  ]

  // Sort by relevance to determine primary recommendation
  const sortedPrograms = [...carePrograms].sort((a, b) => b.currentRelevance - a.currentRelevance)
  const primaryRecommendation = sortedPrograms[0]
  const alternativeRecommendations = sortedPrograms.slice(1, 3)

  // Generate past to present timeline
  const pastToPresent = isMaternal ? {
    title: "Pregnancy Journey: Past to Present",
    items: [
      { date: "Sep 2, 2024", event: "Initial OB consultation with Dr Sophie", impact: "positive" as const },
      { date: "Sep 3, 2024", event: "Antenatal labs booked (CBC, HbA1c, Vit D, B12, HIV, Urine, AMH, TSH, LH, FSH)", impact: "positive" as const },
      { date: "Oct 4, 2024", event: "Follow-up antenatal visit", impact: "positive" as const },
      { date: "Nov 2, 2024", event: "Antenatal visit – routine monitoring and counselling", impact: "positive" as const },
      { date: "Dec 2, 2024", event: "Antenatal visit – third trimester planning", impact: "positive" as const },
    ]
  } : {
    title: "Health Journey: Past to Present",
    items: [
      { date: "Mar 2023", event: `${patientData.consultationCount || 5}+ consultations with healthcare team`, impact: "positive" as const },
      { date: "Sep 2023", event: "Regular monitoring established, health metrics improving", impact: "positive" as const }
    ]
  }

  // Generate present to future roadmap
  const presentToFuture = isMaternal ? {
    title: "Maternal Care Roadmap: Present to Delivery",
    items: [
      { timeline: "Now – Trimester 1 (0–12w)", goal: "Start folic acid, baseline labs, schedule monthly antenatal visits", priority: "high" as const },
      { timeline: "Trimester 2 (13–28w)", goal: "Anomaly scan, GDM screening if indicated, iron/calcium supplementation", priority: "high" as const },
      { timeline: "Trimester 3 (29–40w)", goal: "Weekly visits in last month, birth preparedness, danger-sign review", priority: "high" as const },
      { timeline: "Postpartum (0–6w)", goal: "Postnatal check, breastfeeding support, contraception counselling", priority: "medium" as const },
      { timeline: "Upcoming: Jan 2, 2025", goal: "Scheduled antenatal follow-up with Dr Sophie", priority: "high" as const },
    ]
  } : {
    title: "Care Roadmap: Present to Future",
    items: [
      { timeline: "Next 30 days", goal: "Complete comprehensive assessment and program enrollment", priority: "high" as const },
      { timeline: "3-6 months", goal: "Establish monitoring routine with connected devices", priority: "high" as const },
      { timeline: "6-12 months", goal: "Achieve target health parameters and optimize treatment", priority: "medium" as const },
    ]
  }

  return {
    primaryRecommendation,
    alternativeRecommendations,
    pastToPresent,
    presentToFuture
  }
}

export default function RecommendedCarePathway({ 
  isOpen, 
  onClose, 
  patientData, 
  empiId 
}: RecommendedCarePathwayProps) {
  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<string>("")

  const recommendations = generateRecommendations(patientData)
  const { primaryRecommendation, alternativeRecommendations, pastToPresent, presentToFuture } = recommendations

  // Set primary recommendation as default selection
  useState(() => {
    setSelectedProgram(primaryRecommendation.id)
  })

  const handleAssignPlan = async () => {
    if (!selectedProgram) return

    setIsAssigning(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const programName = [...[primaryRecommendation], ...alternativeRecommendations]
      .find(p => p.id === selectedProgram)?.name

    // Show success notification
    toast.success("Care Plan Successfully Assigned!", {
      description: `${patientData.patientName} has been enrolled in ${programName}. Care team will be notified within 24 hours.`,
      duration: 6000,
      action: {
        label: "View Details",
        onClick: () => console.log("View care plan details")
      }
    })

    setIsAssigning(false)
    onClose()
  }

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "positive":
        return <CheckCircle className="w-4 h-4 text-[hsl(var(--success))]" />
      case "negative":
        return <AlertCircle className="w-4 h-4 text-[hsl(var(--text-80))]" />
      default:
        return <Calendar className="w-4 h-4 text-[hsl(var(--text-80))]" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    const baseClass = "text-xs px-2 py-1 font-medium"
    switch (priority) {
      case "high":
        return `${baseClass} bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] border border-[hsl(var(--brand-primary))]/20`
      case "medium":
        return `${baseClass} bg-[hsl(var(--text-80))]/10 text-[hsl(var(--text-80))] border border-[hsl(var(--text-80))]/20`
      default:
        return `${baseClass} bg-[hsl(var(--text-80))]/10 text-[hsl(var(--text-80))] border border-[hsl(var(--text-80))]/20`
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* AI-themed header with glow animation */}
        <motion.div 
          className="relative border-b border-[hsl(var(--stroke-grey))] bg-gradient-to-r from-purple-50 to-blue-50 p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-100/30 to-blue-100/30 rounded-t-lg" />
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-purple-200/10 to-blue-200/10 rounded-t-lg" />
          
          <DialogHeader className="relative z-10">
            <DialogTitle className="flex items-center gap-3 text-xl text-[hsl(var(--text-100))]">
              <div className="relative">
                <Sparkles className="w-6 h-6 text-[hsl(var(--brand-primary))]" />
                <div className="absolute inset-0 w-6 h-6 text-[hsl(var(--brand-primary))] animate-ping opacity-20">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>
              AI Recommended Care Pathway
              <Badge variant="outline" className="ml-auto bg-[hsl(var(--brand-primary))]/10 text-[hsl(var(--brand-primary))] border-[hsl(var(--brand-primary))]/30">
                for {patientData.patientName}
              </Badge>
            </DialogTitle>
          </DialogHeader>
        </motion.div>

        <div className="p-6 space-y-6 pb-24">
          {/* Primary Recommendation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-[hsl(var(--brand-primary))]/30 bg-gradient-to-br from-purple-50/50 to-blue-50/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg text-[hsl(var(--text-100))]">
                  <Target className="w-5 h-5 text-[hsl(var(--brand-primary))]" />
                  <span>Recommended Program</span>
                  <Badge className="bg-[hsl(var(--brand-primary))] text-white">
                    {primaryRecommendation.currentRelevance}% Match
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-[hsl(var(--text-100))] mb-1">
                    {primaryRecommendation.name}
                  </h3>
                  <p className="text-sm text-[hsl(var(--text-80))] mb-3">
                    {primaryRecommendation.description}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-[hsl(var(--text-80))]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{primaryRecommendation.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Monitor className="w-4 h-4" />
                      <span>{primaryRecommendation.devices.length} devices included</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-[hsl(var(--text-100))] mb-2">Key Benefits</h4>
                    <ul className="space-y-1">
                      {primaryRecommendation.keyBenefits.map((benefit, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-[hsl(var(--text-80))]">
                          <CheckCircle className="w-3 h-3 text-[hsl(var(--success))] mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-[hsl(var(--text-100))] mb-2">Included Devices</h4>
                    <div className="flex flex-wrap gap-1">
                      {primaryRecommendation.devices.map((device, index) => (
                        <Badge key={index} variant="outline" className="text-xs truncate max-w-28">
                          {device}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Alternative Options */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold text-[hsl(var(--text-100))] mb-3">
              Alternative Options
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alternativeRecommendations.map((program) => (
                <Card 
                  key={program.id}
                  className={`cursor-pointer transition-all border hover:border-[hsl(var(--brand-primary))]/40 ${
                    selectedProgram === program.id 
                      ? "border-[hsl(var(--brand-primary))] bg-[hsl(var(--bg-10))]" 
                      : "border-[hsl(var(--stroke-grey))]"
                  }`}
                  onClick={() => setSelectedProgram(program.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm text-[hsl(var(--text-100))] leading-tight">
                        {program.name}
                      </h4>
                      <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                        {program.currentRelevance}%
                      </Badge>
                    </div>
                    <p className="text-xs text-[hsl(var(--text-80))] mb-2 line-clamp-2">
                      {program.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-80))]">
                      <Clock className="w-3 h-3" />
                      <span>{program.duration}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Past to Present Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[hsl(var(--text-100))]">
                  <User className="w-5 h-5 text-[hsl(var(--brand-primary))]" />
                  {pastToPresent.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pastToPresent.items.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + (index * 0.1) }}
                      className="flex items-start gap-3 p-3 bg-[hsl(var(--bg-10))] rounded-lg"
                    >
                      {getImpactIcon(item.impact)}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[hsl(var(--text-80))] font-medium">
                          {item.date}
                        </div>
                        <div className="text-sm text-[hsl(var(--text-100))]">
                          {item.event}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Present to Future Roadmap */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[hsl(var(--text-100))]">
                  <ArrowRight className="w-5 h-5 text-[hsl(var(--brand-primary))]" />
                  {presentToFuture.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {presentToFuture.items.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + (index * 0.1) }}
                      className="flex items-start gap-3 p-3 bg-[hsl(var(--bg-10))] rounded-lg"
                    >
                      <Badge className={getPriorityBadge(item.priority)}>
                        {item.priority}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[hsl(var(--text-80))] font-medium">
                          {item.timeline}
                        </div>
                        <div className="text-sm text-[hsl(var(--text-100))]">
                          {item.goal}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sticky Bottom CTA */}
        <motion.div 
          className="sticky bottom-0 left-0 right-0 bg-white border-t border-[hsl(var(--stroke-grey))] p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-[hsl(var(--text-80))]">
              Selected: <span className="font-medium text-[hsl(var(--text-100))]">
                {[primaryRecommendation, ...alternativeRecommendations]
                  .find(p => p.id === selectedProgram)?.name || "None"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose} className="px-6">
                Cancel
              </Button>
              <Button
                onClick={handleAssignPlan}
                disabled={!selectedProgram || isAssigning}
                className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white px-8"
              >
                {isAssigning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Stethoscope className="w-4 h-4 mr-2" />
                    Assign Plan
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
