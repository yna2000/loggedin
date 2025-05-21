import { redirect } from "next/navigation"

export default function Home() {
  // Redirect to student login page
  redirect("/student-login")
}
