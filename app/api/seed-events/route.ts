import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create a Supabase client
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    // Sample events data
    const events = [
      {
        title: "Programming Workshop",
        description: "Learn the basics of programming with Python",
        location: "Computer Lab 101",
        start_time: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // Tomorrow
        end_time: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString(), // Tomorrow + 2 hours
        attendance_required: true,
        geo_fence: {
          type: "circle",
          center: {
            latitude: 14.5995,
            longitude: 120.9842,
          },
          radius: 100, // 100 meters
        },
        qr_code_secret: "workshop123",
      },
      {
        title: "Career Fair 2023",
        description: "Connect with potential employers",
        location: "Main Auditorium",
        start_time: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // Day after tomorrow
        end_time: new Date(Date.now() + 1000 * 60 * 60 * 54).toISOString(), // Day after tomorrow + 6 hours
        attendance_required: true,
        geo_fence: {
          type: "circle",
          center: {
            latitude: 14.5995,
            longitude: 120.9842,
          },
          radius: 150, // 150 meters
        },
        qr_code_secret: "career456",
      },
      {
        title: "Robotics Club Meeting",
        description: "Weekly meeting of the robotics club",
        location: "Engineering Building, Room 203",
        start_time: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(), // 3 days from now
        end_time: new Date(Date.now() + 1000 * 60 * 60 * 74).toISOString(), // 3 days from now + 2 hours
        attendance_required: false,
        geo_fence: {
          type: "circle",
          center: {
            latitude: 14.5995,
            longitude: 120.9842,
          },
          radius: 50, // 50 meters
        },
        qr_code_secret: "robotics789",
      },
    ]

    // Insert events into the database
    const { data, error } = await supabase.from("events").upsert(events, { onConflict: "title" }).select()

    if (error) {
      throw error
    }

    return NextResponse.json({
      message: "Sample events created successfully",
      count: data.length,
      events: data,
    })
  } catch (error) {
    console.error("Error seeding events:", error)
    return NextResponse.json({ error: "Failed to seed events" }, { status: 500 })
  }
}
