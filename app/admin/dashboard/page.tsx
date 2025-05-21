import type { Metadata } from "next"

import { AdminDashboard } from "@/components/admin/admin-dashboard"

export const metadata: Metadata = {
  title: "Admin Dashboard | LoggedIn",
  description: "Admin dashboard for LoggedIn",
}

export default function AdminDashboardPage() {
  return (
    <div className="container py-10">
      <h1 className="mb-8 text-3xl font-bold">Admin Dashboard</h1>
      <AdminDashboard />
    </div>
  )
}
