"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { Loader2, Check } from "lucide-react"

export default function LoginPage() {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const submissionInProgress = useRef(false)
  const router = useRouter()

  // No localStorage cleanup on mount — dashboard handles auth gating.
  // Clearing here causes a race condition during router.replace redirect.

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isLoggingIn || loginSuccess || submissionInProgress.current) return

    submissionInProgress.current = true

    const { username, password } = credentials
    setError(null)
    setIsLoggingIn(true)

    try {
      const insurerCreds = { username: "admin@bradesco.com", password: "admin123" }

      let userRole = ""

      if (username === insurerCreds.username && password === insurerCreds.password) {
        userRole = "insurer"
      } else {
        setError("Invalid credentials. Please use the demo account below.")
        setIsLoggingIn(false)
        submissionInProgress.current = false
        return
      }

      localStorage.setItem("userRole", userRole)
      localStorage.setItem("userEmail", username)

      await new Promise(resolve => setTimeout(resolve, 800))
      setLoginSuccess(true)

      await new Promise(resolve => setTimeout(resolve, 700))

      router.replace("/dashboard")
    } catch (error) {
      setError("An error occurred during login. Please try again.")
      setIsLoggingIn(false)
      setLoginSuccess(false)
      submissionInProgress.current = false
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #00447C 0%, #001a33 50%, #0a0a1a 100%)",
      }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="text-2xl font-bold tracking-tight" style={{ color: "#00447C" }}>Bradesco</div>
          </div>
          <CardTitle className="text-2xl font-semibold text-center text-text100">Care Admin</CardTitle>
          <CardDescription className="text-center text-text80">Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleLogin}
            className="space-y-4 transition-opacity duration-300"
            style={{
              opacity: isLoggingIn || loginSuccess ? 0.75 : 1,
              pointerEvents: isLoggingIn || loginSuccess ? 'none' : 'auto'
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={credentials.username}
                onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
                disabled={isLoggingIn}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={credentials.password}
                onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                disabled={isLoggingIn}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isLoggingIn || loginSuccess}
              className="w-full text-white hover:opacity-90 disabled:cursor-not-allowed transition-all duration-300"
              style={{
                backgroundColor: loginSuccess ? "#16a34a" : "#00447C",
              }}
            >
              {loginSuccess ? (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Success! Redirecting...
                </div>
              ) : isLoggingIn ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing In...
                </div>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {error && (
            <div className="mt-4 text-sm text-red-600 text-center" role="alert">
              {error}
            </div>
          )}

          <div className="mt-4 text-sm text-text80 text-center space-y-1">
            <p className="font-medium text-text100">Demo credentials</p>
            <p>Admin: admin@bradesco.com / admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
