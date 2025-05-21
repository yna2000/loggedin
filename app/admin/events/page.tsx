import type { Metadata } from "next"

import { EventsManagement } from "@/components/admin/events-management"

export const metadata: Metadata = {
  title: "Events Management | LoggedIn",
  description: "Manage events and QR codes",
}

export default function EventsManagementPage() {
  return (
    <div className="container py-10">
      <h1 className="mb-8 text-3xl font-bold">Events Management</h1>
      <EventsManagement />
    </div>
  )
}
