import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create a Supabase client
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    // Check if events table exists
    const { error: checkError } = await supabase.from("events").select("id").limit(1)

    // If there's an error, the table might not exist
    if (checkError) {
      console.log("Creating events table...")

      // Create events table
      const { error: createError } = await supabase.rpc("create_events_table")

      if (createError) {
        // Try direct SQL if RPC fails
        const { error: sqlError } = await supabase.sql`
          CREATE TABLE IF NOT EXISTS events (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            title TEXT NOT NULL,
            description TEXT,
            location TEXT,
            start_time TIMESTAMP WITH TIME ZONE NOT NULL,
            end_time TIMESTAMP WITH TIME ZONE NOT NULL,
            attendance_required BOOLEAN DEFAULT TRUE,
            geo_fence JSONB,
            qr_code_secret TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `

        if (sqlError) {
          throw sqlError
        }
      }

      // Create sample event
      const sampleEvent = {
        title: "Sample Event",
        description: "This is a sample event to get you started",
        location: "Main Campus",
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        end_time: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(), // Tomorrow + 2 hours
        attendance_required: true,
        geo_fence: {
          type: "circle",
          center: {
            latitude: 14.5995,
            longitude: 120.9842,
          },
          radius: 100, // 100 meters
        },
        qr_code_secret: "sample123",
      }

      const { error: insertError } = await supabase.from("events").insert(sampleEvent)

      if (insertError) {
        console.error("Error creating sample event:", insertError)
      }
    }

    return NextResponse.json({
      message: "Database initialized successfully",
      status: "success",
    })
  } catch (error) {
    console.error("Error initializing database:", error)
    return NextResponse.json({ error: "Failed to initialize database" }, { status: 500 })
  }
}
