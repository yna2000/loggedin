import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    if (!body.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Verify email domain
    const isValidEmail = body.email.endsWith("@sti.edu.ph")

    if (isValidEmail) {
      return NextResponse.json({ valid: true, message: "Valid STI email" }, { status: 200 })
    } else {
      return NextResponse.json(
        { valid: false, message: "Invalid email domain. Must be an STI email." },
        { status: 403 },
      )
    }
  } catch (error) {
    console.error("Error verifying student email:", error)
    return NextResponse.json({ error: "Failed to verify student email" }, { status: 500 })
  }
}
