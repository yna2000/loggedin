import type { Metadata } from "next"

import { CheckInComponent } from "@/components/check-in/check-in-component"

export const metadata: Metadata = {
  title: "Check-in | LoggedIn",
  description: "Check in to your event",
}

export default function CheckInPage() {
  return (
    <div className="container flex min-h-screen flex-col items-center justify-center p-4">
      <CheckInComponent />
    </div>
  )
}
