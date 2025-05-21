import type { Metadata } from "next"

import { SecurityDashboard } from "@/components/admin/security-dashboard"

export const metadata: Metadata = {
  title: "Security Dashboard | LoggedIn",
  description: "Monitor attendance security and issues",
}

export default function SecurityDashboardPage() {
  return (
    <div className="container py-10">
      <h1 className="mb-8 text-3xl font-bold">Security Dashboard</h1>
      <SecurityDashboard />
    </div>
  )
}
