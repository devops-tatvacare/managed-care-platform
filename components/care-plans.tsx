"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Activity, 
  Heart, 
  Zap, 
  Monitor, 
  Clock, 
  CheckCircle, 
  Star, 
  Users,
  Calendar,
  Shield,
  Sparkles,
  TrendingUp,
  Phone,
  Video,
  MessageCircle,
  Stethoscope
} from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"

interface CarePlan {
  id: string
  name: string
  category: "Diabetes" | "Kidney Care" | "PCOS" | "Heart Health" | "General Wellness" | "Maternal"
  description: string
  duration: string
  price: {
    monthly: number
    quarterly: number
    yearly: number
  }
  features: {
    monitoring: string[]
    consultations: string[]
    devices: string[]
    support: string[]
  }
  highlights: string[]
  status: "recommended" | "active" | "available" | "completed"
  patientRelevance: number
  icon: any
  color: string
}

interface CarePlansProps {
  patientConditions: string[]
  patientId: string
}

function generateCarePlans(patientConditions: string[]): CarePlan[] {
  const hasdiabetes = patientConditions.some(condition => 
    condition.toLowerCase().includes('diabetes')
  )
  const hasKidneyIssues = patientConditions.some(condition => 
    condition.toLowerCase().includes('kidney') || condition.toLowerCase().includes('nephro')
  )
  const hasPCOS = patientConditions.some(condition => 
    condition.toLowerCase().includes('pcos') || condition.toLowerCase().includes('ovarian')
  )
  const hasHeartIssues = patientConditions.some(condition => 
    condition.toLowerCase().includes('heart') || condition.toLowerCase().includes('cardiac')
  )
  const hasMaternal = patientConditions.some(condition => 
    condition.toLowerCase().includes('maternal') || condition.toLowerCase().includes('preg')
  )

  const carePlans: CarePlan[] = [
    {
      id: "maternal-trimester",
      name: "Maternal Care – Trimester Pathway",
      category: "Maternal",
      description: "Pregnancy care with trimester-specific visits, screenings, supplements, and birth preparedness",
      duration: "Up to 40 weeks",
      price: { monthly: 2499, quarterly: 6999, yearly: 24999 },
      features: {
        monitoring: [
          "Antenatal vitals (BP, weight)",
          "Anemia & GDM screening",
          "Fetal growth tracking (clinic)",
          "Danger-sign monitoring"
        ],
        consultations: [
          "OB-GYN visits (monthly → weekly)",
          "Diet & supplementation counselling",
          "Anomaly scan coordination",
          "Postnatal follow-up"
        ],
        devices: [
          "BP monitor",
          "Digital scale",
          "Glucose meter (if indicated)",
          "Fetal doppler (clinic)"
        ],
        support: [
          "Prenatal education modules",
          "Birth preparedness plan",
          "Lactation & postpartum support",
          "24/7 care coordination"
        ]
      },
      highlights: [
        "Trimester-based schedule and checklists",
        "Iron/folate supplementation guidance",
        "Postnatal and breastfeeding support"
      ],
      status: hasMaternal ? "recommended" : "available",
      patientRelevance: hasMaternal ? 97 : 10,
      icon: Calendar,
      color: "hsl(var(--brand-primary))"
    },
    {
      id: "diabetes-premium",
      name: "Diabetes Excellence Program",
      category: "Diabetes",
      description: "Comprehensive diabetes management with advanced CGM technology and dedicated specialist care",
      duration: "12 months",
      price: { monthly: 4999, quarterly: 13499, yearly: 47999 },
      features: {
        monitoring: [
          "24/7 Continuous Glucose Monitoring (CGM)",
          "Real-time glucose alerts & insights",
          "Advanced HbA1c tracking",
          "Ketone level monitoring"
        ],
        consultations: [
          "Weekly endocrinologist consultations",
          "Monthly dietitian sessions",
          "Quarterly eye & foot screening",
          "Emergency consultation access"
        ],
        devices: [
          "FreeStyle Libre 3 CGM",
          "Smart glucometer with strips",
          "Body composition analyzer",
          "Blood pressure monitor"
        ],
        support: [
          "24/7 diabetes helpline",
          "Medication delivery service",
          "Family education sessions",
          "Mobile app with AI insights"
        ]
      },
      highlights: [
        "Reduce HbA1c by 1.5% on average",
        "Prevent 85% of diabetes complications",
        "24/7 medical emergency support"
      ],
      status: hasdiabetes ? "recommended" : "available",
      patientRelevance: hasdiabetes ? 95 : 30,
      icon: Activity,
      color: "hsl(var(--success))"
    },
    {
      id: "kidney-care-premium",
      name: "Kidney Shield Program",
      category: "Kidney Care",
      description: "Advanced nephrology care with early intervention and comprehensive monitoring",
      duration: "10 months",
      price: { monthly: 3999, quarterly: 10799, yearly: 38999 },
      features: {
        monitoring: [
          "Monthly kidney function tests",
          "Proteinuria tracking",
          "Blood pressure optimization",
          "Electrolyte balance monitoring"
        ],
        consultations: [
          "Bi-weekly nephrologist consultations",
          "Monthly dietary counseling",
          "Quarterly imaging studies",
          "Dialysis readiness planning"
        ],
        devices: [
          "Advanced BP monitor",
          "Digital scale with tracking",
          "Urine analysis kit",
          "Pulse oximeter"
        ],
        support: [
          "Kidney-friendly meal planning",
          "Medication adherence tracking",
          "Family support counseling",
          "Transplant coordination"
        ]
      },
      highlights: [
        "Slow CKD progression by 40%",
        "Reduce hospitalization by 60%",
        "Expert transplant guidance"
      ],
      status: hasKidneyIssues ? "recommended" : "available",
      patientRelevance: hasKidneyIssues ? 90 : 25,
      icon: Shield,
      color: "hsl(var(--info))"
    },
    {
      id: "pcos-wellness",
      name: "PCOS Harmony Program",
      category: "PCOS",
      description: "Holistic PCOS management focusing on hormonal balance and reproductive wellness",
      duration: "9 months",
      price: { monthly: 2999, quarterly: 8099, yearly: 28999 },
      features: {
        monitoring: [
          "Hormonal panel tracking",
          "Ovulation cycle monitoring",
          "Insulin resistance assessment",
          "Weight management tracking"
        ],
        consultations: [
          "Monthly gynecologist consultations",
          "Bi-weekly endocrinologist sessions",
          "Fertility counseling sessions",
          "Nutritionist guidance"
        ],
        devices: [
          "Ovulation tracking kit",
          "Body composition analyzer",
          "Glucose monitoring device",
          "Hormone level test strips"
        ],
        support: [
          "PCOS-friendly diet plans",
          "Fertility planning support",
          "Exercise & wellness coaching",
          "Mental health counseling"
        ]
      },
      highlights: [
        "Improve fertility by 65%",
        "Regulate cycles in 80% patients",
        "Comprehensive hormone optimization"
      ],
      status: hasPCOS ? "recommended" : "available",
      patientRelevance: hasPCOS ? 88 : 20,
      icon: Heart,
      color: "hsl(var(--warning))"
    },
    {
      id: "heart-health-premium",
      name: "CardioGuard Elite Program",
      category: "Heart Health",
      description: "Advanced cardiac monitoring with preventive care and rehabilitation support",
      duration: "12 months",
      price: { monthly: 5999, quarterly: 16199, yearly: 59999 },
      features: {
        monitoring: [
          "24/7 ECG monitoring",
          "Heart rate variability tracking",
          "Blood pressure optimization",
          "Cholesterol management"
        ],
        consultations: [
          "Weekly cardiologist consultations",
          "Monthly cardiac rehabilitation",
          "Quarterly stress tests",
          "Emergency cardiac support"
        ],
        devices: [
          "Holter monitor",
          "Smart blood pressure cuff",
          "Pulse oximeter",
          "Digital stethoscope"
        ],
        support: [
          "Heart-healthy meal delivery",
          "Cardiac exercise programs",
          "Medication optimization",
          "Family CPR training"
        ]
      },
      highlights: [
        "Reduce cardiac events by 70%",
        "Improve ejection fraction",
        "24/7 emergency response"
      ],
      status: hasHeartIssues ? "recommended" : "available",
      patientRelevance: hasHeartIssues ? 92 : 35,
      icon: Heart,
      color: "hsl(var(--danger))"
    },
    {
      id: "wellness-comprehensive",
      name: "Total Wellness Program",
      category: "General Wellness",
      description: "Comprehensive preventive health management with personalized wellness coaching",
      duration: "6 months",
      price: { monthly: 1999, quarterly: 5399, yearly: 19999 },
      features: {
        monitoring: [
          "Comprehensive health screening",
          "Vitals tracking",
          "Fitness level assessment",
          "Nutritional analysis"
        ],
        consultations: [
          "Monthly general physician consultations",
          "Quarterly specialist referrals",
          "Wellness coaching sessions",
          "Preventive screening"
        ],
        devices: [
          "Fitness tracker",
          "Smart scale",
          "Blood pressure monitor",
          "Pulse oximeter"
        ],
        support: [
          "Personalized diet plans",
          "Exercise recommendations",
          "Mental wellness support",
          "Health goal tracking"
        ]
      },
      highlights: [
        "Prevent 90% of lifestyle diseases",
        "Improve overall fitness by 50%",
        "Comprehensive health insights"
      ],
      status: "available",
      patientRelevance: 40,
      icon: Sparkles,
      color: "hsl(var(--brand-primary))"
    }
  ]

  return carePlans.sort((a, b) => b.patientRelevance - a.patientRelevance)
}

export default function CarePlans({ patientConditions, patientId }: CarePlansProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "quarterly" | "yearly">("quarterly")
  const carePlans = generateCarePlans(patientConditions)

  const handleEnrollPlan = (planId: string) => {
    const plan = carePlans.find(p => p.id === planId)
    if (!plan) return

    toast.success("Plan Enrollment Initiated!", {
      description: `${plan.name} enrollment has been started. Care team will contact within 24 hours for onboarding.`,
      duration: 5000,
      action: {
        label: "View Details",
        onClick: () => console.log("View enrollment details")
      }
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price)
  }

  const getStatusBadge = (status: string, relevance: number) => {
    switch (status) {
      case "recommended":
        return <Badge className="bg-[hsl(var(--brand-primary))] text-white">Recommended - {relevance}% Match</Badge>
      case "active":
        return <Badge className="bg-[hsl(var(--success))] text-white">Active</Badge>
      case "completed":
        return <Badge variant="outline" className="text-[hsl(var(--text-80))]">Completed</Badge>
      default:
        return <Badge variant="outline">Available</Badge>
    }
  }

  const getBillingDiscount = (billing: "monthly" | "quarterly" | "yearly") => {
    switch (billing) {
      case "quarterly":
        return { label: "10% OFF", color: "text-[hsl(var(--success))]" }
      case "yearly":
        return { label: "20% OFF", color: "text-[hsl(var(--success))]" }
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[hsl(var(--text-100))]">Available Care Plans</h2>
          <p className="text-sm text-[hsl(var(--text-80))]">
            Comprehensive healthcare programs tailored to your specific needs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[hsl(var(--text-80))]">Billing:</span>
          <div className="flex rounded-lg border border-[hsl(var(--stroke-grey))] overflow-hidden">
            {["monthly", "quarterly", "yearly"].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedBilling(period as any)}
                className={`px-3 py-1 text-xs capitalize transition-colors ${
                  selectedBilling === period
                    ? "bg-[hsl(var(--brand-primary))] text-white"
                    : "text-[hsl(var(--text-80))] hover:bg-[hsl(var(--bg-10))]"
                }`}
              >
                {period}
                {getBillingDiscount(period as any) && (
                  <span className="ml-1 text-xs font-medium text-[hsl(var(--success))]">
                    {getBillingDiscount(period as any)?.label}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Care Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {carePlans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className={`h-full transition-all hover:shadow-lg ${
                plan.status === "recommended" 
                  ? "border-2 border-[hsl(var(--brand-primary))]/30 shadow-md" 
                  : "border border-[hsl(var(--stroke-grey))]"
              }`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br opacity-90`} style={{ backgroundColor: `${plan.color}20` }}>
                      <plan.icon className="w-5 h-5" style={{ color: plan.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-[hsl(var(--text-100))]">
                        {plan.name}
                      </CardTitle>
                      <p className="text-sm text-[hsl(var(--text-80))] mt-1">
                        {plan.description}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  {getStatusBadge(plan.status, plan.patientRelevance)}
                  <div className="text-right">
                    <div className="text-lg font-semibold text-[hsl(var(--text-100))]">
                      {formatPrice(plan.price[selectedBilling])}
                    </div>
                    <div className="text-xs text-[hsl(var(--text-80))]">
                      per {selectedBilling.replace('ly', '')}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Key Highlights */}
                <div className="bg-[hsl(var(--bg-10))] rounded-lg p-3">
                  <h4 className="text-sm font-medium text-[hsl(var(--text-100))] mb-2">Key Benefits</h4>
                  <ul className="space-y-1">
                    {plan.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-[hsl(var(--text-80))]">
                        <Star className="w-3 h-3 text-[hsl(var(--warning))] fill-current" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Features Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h5 className="text-xs font-medium text-[hsl(var(--text-100))] mb-1 flex items-center gap-1">
                      <Monitor className="w-3 h-3" />
                      Monitoring
                    </h5>
                    <p className="text-xs text-[hsl(var(--text-80))]">
                      {plan.features.monitoring.length} monitoring parameters
                    </p>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium text-[hsl(var(--text-100))] mb-1 flex items-center gap-1">
                      <Stethoscope className="w-3 h-3" />
                      Consultations
                    </h5>
                    <p className="text-xs text-[hsl(var(--text-80))]">
                      {plan.features.consultations.length} consultation types
                    </p>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium text-[hsl(var(--text-100))] mb-1 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Devices
                    </h5>
                    <p className="text-xs text-[hsl(var(--text-80))]">
                      {plan.features.devices.length} devices included
                    </p>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium text-[hsl(var(--text-100))] mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Support
                    </h5>
                    <p className="text-xs text-[hsl(var(--text-80))]">
                      {plan.features.support.length} support services
                    </p>
                  </div>
                </div>

                {/* Duration & Action */}
                <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--stroke-grey))]">
                  <div className="flex items-center gap-1 text-xs text-[hsl(var(--text-80))]">
                    <Clock className="w-3 h-3" />
                    <span>Duration: {plan.duration}</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleEnrollPlan(plan.id)}
                    className={`text-xs px-4 ${
                      plan.status === "recommended"
                        ? "bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/90 text-white"
                        : "bg-[hsl(var(--text-100))] hover:bg-[hsl(var(--text-100))]/90 text-white"
                    }`}
                  >
                    {plan.status === "active" ? "Manage Plan" : "Enroll Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Call to Action */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-[hsl(var(--brand-primary))]/20">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Phone className="w-5 h-5 text-[hsl(var(--brand-primary))]" />
            <h3 className="text-lg font-semibold text-[hsl(var(--text-100))]">
              Need Personal Consultation?
            </h3>
          </div>
          <p className="text-sm text-[hsl(var(--text-80))] mb-4">
            Speak with our care specialists to find the perfect plan for your health needs
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Phone className="w-4 h-4" />
              Call Now
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Video className="w-4 h-4" />
              Video Chat
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              Chat Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
