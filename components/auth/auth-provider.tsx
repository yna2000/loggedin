"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type User = {
  email: string
  role: "student" | "admin"
}

type AuthContextType = {
  user: User | null
  login: (email: string, role: "student" | "admin") => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in from localStorage
    const storedUser = localStorage.getItem("loggedInUser")
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const login = (email: string, role: "student" | "admin") => {
    const user = { email, role }
    setUser(user)
    localStorage.setItem("loggedInUser", JSON.stringify(user))

    // Redirect based on role
    if (role === "student") {
      router.push("/checkin")
    } else {
      router.push("/admin/dashboard")
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("loggedInUser")
    router.push("/student-login")
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
