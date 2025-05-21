"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export function StudentLoginForm() {
  const { login } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    // Validate email
    if (!email) {
      setError("Email is required")
      return
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address")
      return
    }

    if (!email.endsWith("@sti.edu.ph")) {
      setError("Email must be an STI email (@sti.edu.ph)")
      return
    }

    setIsLoading(true)

    try {
      // Simulate API call to verify student email
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Login the student
      login(email, "student")

      toast({
        title: "Login successful",
        description: "You have been logged in as a student",
      })

      router.push("/checkin")
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="student@sti.edu.ph"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>
      <div className="text-center text-sm">
        <Link href="/admin-login" className="text-primary hover:underline">
          Admin Login
        </Link>
      </div>
    </div>
  )
}
