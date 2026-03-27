"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Users, LogOut, Sparkles, BarChart3, PanelLeftOpen, PanelRightOpen, Route } from "lucide-react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import PatientsScreen from "./patients-screen"
import TatvaAIScreen from "./tatva-ai-screen"
import InsurerOverviewScreen from "./insurer-overview-screen"
import CohortisationScreen from "./cohortisation-screen"
import CarePathwaysScreen from "./care-pathways-screen"

// Insurer navigation for Bradesco
const insurerNavItems = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "cohorts", label: "Cohorts", icon: Users },
  { id: "pathways", label: "Care Pathways", icon: Route },
  { id: "patients", label: "Patients", icon: Users },
  { id: "ai-assistant", label: "AI Assistant", icon: Sparkles },
]

export default function CoachDashboard() {
  const [activeScreen, setActiveScreen] = useState("overview")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [pendingPatientEmpiId, setPendingPatientEmpiId] = useState<string | null>(null)
  const router = useRouter()
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const role = localStorage.getItem("userRole")
    if (!role) {
      router.replace("/")
    }
  }, [router])

  // Collapse sidebar when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!sidebarCollapsed && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setSidebarCollapsed(true)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [sidebarCollapsed])

  const handleLogout = () => {
    localStorage.removeItem("userRole")
    localStorage.removeItem("userEmail")
    router.replace("/")
  }

  const handleNavigateToTatvaAI = (empiId: string) => {
    setPendingPatientEmpiId(empiId)
    setActiveScreen("ai-assistant")
    setTimeout(() => {
      setPendingPatientEmpiId(null)
    }, 1000)
  }

  const renderScreen = () => {
    switch (activeScreen) {
      case "overview":
        return <InsurerOverviewScreen />
      case "cohorts":
        return <CohortisationScreen />
      case "pathways":
        return <CarePathwaysScreen />
      case "patients":
        return <PatientsScreen onNavigateToTatvaAI={handleNavigateToTatvaAI} />
      case "ai-assistant":
        return <TatvaAIScreen initialPatientEmpiId={pendingPatientEmpiId} />
      default:
        return <InsurerOverviewScreen />
    }
  }

  const sidebarWidth = sidebarCollapsed ? 64 : 256
  return (
    <div className="flex h-screen bg-[hsl(var(--bg-100))]">
      {/* Vertical Navigation */}
      <motion.aside
        ref={sidebarRef}
        aria-label="Primary Navigation"
        initial={false}
        animate={{ width: sidebarWidth }}
        transition={{ type: "spring", stiffness: 220, damping: 28 }}
        className="border-r border-[hsl(var(--stroke-grey))] flex flex-col shadow-sm overflow-hidden"
        style={{ backgroundColor: "hsl(var(--brand-primary) / 0.06)" }}
      >
        {/* Header */}
        {sidebarCollapsed ? (
          <div className="px-2 py-4 flex items-center justify-center group">
            {/* Brand letter icon */}
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-bold group-hover:hidden"
              style={{ backgroundColor: "#00447C" }}
            >
              B
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(false)}
              className="h-8 w-8 p-0 items-center justify-center text-[hsl(var(--text-80))] hover:text-[hsl(var(--text-100))] hover:bg-[hsl(var(--bg-10))] hidden group-hover:inline-flex"
              title="Expand Drawer"
              aria-label="Expand Drawer"
            >
              <PanelLeftOpen size={18} color="hsl(var(--text-80))" />
            </Button>
          </div>
        ) : (
          <div className="px-4 py-4 flex items-center justify-between">
            <span className="text-lg font-bold" style={{ color: "#00447C" }}>Bradesco</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(true)}
              className="h-9 w-9 p-0 hover:bg-[hsl(var(--bg-10))] text-[hsl(var(--text-80))] hover:text-[hsl(var(--text-100))]"
              title="Collapse Drawer"
            >
              <PanelRightOpen size={18} color="hsl(var(--text-80))" />
            </Button>
          </div>
        )}

        <nav className={sidebarCollapsed ? "flex-1 p-2 space-y-2" : "flex-1 p-4 space-y-3"}>
          {insurerNavItems.map((item) => {
            const Icon = item.icon
            const isActive = activeScreen === item.id

            return (
              <div key={item.id}>
                <Button
                  variant="ghost"
                  className={`w-full h-12 transition-all duration-300 ease-in-out ${
                    sidebarCollapsed ? "justify-center px-0" : "justify-start px-4"
                  } ${
                    isActive
                      ? sidebarCollapsed
                        ? "text-white"
                        : "text-[hsl(var(--brand-primary))] shadow-sm"
                      : "text-[hsl(var(--text-80))] hover:text-[hsl(var(--text-100))] hover:bg-[var(--hover-bg)]"
                  } ${sidebarCollapsed ? "hover:bg-transparent" : ""}`}
                  style={{
                    ["--hover-bg" as string]: "hsl(var(--brand-primary) / 0.08)",
                    backgroundColor: isActive && !sidebarCollapsed ? "hsl(var(--brand-primary) / 0.18)" : undefined,
                  }}
                  onClick={() => {
                    if (activeScreen === "ai-assistant" && item.id !== "ai-assistant") {
                      setPendingPatientEmpiId(null)
                    }
                    setActiveScreen(item.id)
                  }}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <div className="flex items-center overflow-hidden">
                    <span
                      className={`${sidebarCollapsed ? "inline-flex h-8 w-8 items-center justify-center rounded-md" : ""} ${
                        sidebarCollapsed && isActive ? "bg-[hsl(var(--brand-primary))]" : ""
                      }`}
                    >
                      <Icon
                        className="w-5 h-5 flex-shrink-0"
                        color={sidebarCollapsed && isActive ? "hsl(var(--brand-on))" : undefined}
                      />
                    </span>
                    <span
                      className={`font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                        sidebarCollapsed ? "opacity-0 ml-0 w-0" : "opacity-100 ml-3 w-auto"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                </Button>
              </div>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[hsl(var(--stroke-grey))]">
          <Button
            variant="ghost"
            className={`w-full h-12 text-[hsl(var(--danger))] hover:text-[hsl(var(--danger))] hover:bg-red-50 transition-all duration-300 ease-in-out ${
              sidebarCollapsed ? "justify-center px-2" : "justify-start px-4"
            }`}
            onClick={handleLogout}
            title={sidebarCollapsed ? "Logout" : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span
              className={`font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                sidebarCollapsed ? "opacity-0 ml-0 w-0" : "opacity-100 ml-3 w-auto"
              }`}
            >
              Logout
            </span>
          </Button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
