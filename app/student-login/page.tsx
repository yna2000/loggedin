import type { Metadata } from "next"

import { StudentLoginForm } from "@/components/auth/student-login-form"

export const metadata: Metadata = {
  title: "Student Login | LoggedIn",
  description: "Login to your student account",
}

export default function StudentLoginPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Student Login</h1>
          <p className="text-sm text-muted-foreground">Enter your STI email to sign in</p>
        </div>
        <StudentLoginForm />
      </div>
    </div>
  )
}
