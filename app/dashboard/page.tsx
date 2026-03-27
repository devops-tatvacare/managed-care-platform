"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import CoachDashboard from "@/components/coach-dashboard"

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Add a small delay to ensure localStorage is ready after navigation
    const checkAuth = async () => {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const role = localStorage.getItem("userRole")
      if (!role) {
        router.push("/")
        return
      }
      setUserRole(role)
      setIsLoading(false)
    }
    
    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-text80">Loading...</p>
        </div>
      </div>
    )
  }

  // Render CoachDashboard for common roles
  if (userRole === "coach" || userRole === "admin" || userRole === "analyst" || userRole === "doctor" || userRole === "insurer" || userRole === "hospital") {
    return <CoachDashboard />
  }

  // Placeholder for other roles
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg100">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4 text-text100">Welcome, {userRole.replace("-", " ").toUpperCase()}</h1>
        <p className="text-text80">Dashboard for {userRole} role coming soon...</p>
      </div>
    </div>
  )
}
