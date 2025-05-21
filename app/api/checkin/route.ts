import { type NextRequest, NextResponse } from "next/server"

// In-memory storage for check-ins (would use a database in production)
const checkIns: { email: string; timestamp: string }[] = []

export async function GET() {
  return NextResponse.json(checkIns)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    if (!body.email || !body.timestamp) {
      return NextResponse.json({ error: "Email and timestamp are required" }, { status: 400 })
    }

    // Validate email domain
    if (!body.email.endsWith("@sti.edu.ph")) {
      return NextResponse.json({ error: "Invalid email domain. Must be an STI email." }, { status: 403 })
    }

    // Add check-in to storage
    const checkIn = {
      email: body.email,
      timestamp: body.timestamp,
    }

    checkIns.push(checkIn)

    return NextResponse.json({ message: "Check-in successful", checkIn }, { status: 201 })
  } catch (error) {
    console.error("Error processing check-in:", error)
    return NextResponse.json({ error: "Failed to process check-in" }, { status: 500 })
  }
}
