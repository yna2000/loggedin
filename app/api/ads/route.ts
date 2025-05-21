import { type NextRequest, NextResponse } from "next/server"

// Sample ads data (would come from a database in production)
const allAds = [
  {
    id: "ad1",
    title: "STI Career Fair 2023",
    description: "Connect with top employers at the upcoming career fair",
    imageUrl: "/placeholder.svg?height=120&width=400&text=STI+Career+Fair",
    url: "https://example.com/career-fair",
    category: "education",
    clicks: 0,
    impressions: 0,
  },
  {
    id: "ad2",
    title: "New Programming Course",
    description: "Learn the latest programming languages and frameworks",
    imageUrl: "/placeholder.svg?height=120&width=400&text=Programming+Course",
    url: "https://example.com/programming",
    category: "education",
    clicks: 0,
    impressions: 0,
  },
  {
    id: "ad3",
    title: "Student Discount on Laptops",
    description: "Get 15% off on selected laptops with your student ID",
    imageUrl: "/placeholder.svg?height=120&width=400&text=Student+Discount",
    url: "https://example.com/laptops",
    category: "technology",
    clicks: 0,
    impressions: 0,
  },
  {
    id: "ad4",
    title: "Campus Library Extended Hours",
    description: "Library now open until 10pm on weekdays",
    imageUrl: "/placeholder.svg?height=120&width=400&text=Library+Hours",
    url: "https://example.com/library",
    category: "campus",
    clicks: 0,
    impressions: 0,
  },
  {
    id: "ad5",
    title: "Join the Robotics Club",
    description: "Weekly meetings every Thursday at 4pm",
    imageUrl: "/placeholder.svg?height=120&width=400&text=Robotics+Club",
    url: "https://example.com/robotics",
    category: "clubs",
    clicks: 0,
    impressions: 0,
  },
  {
    id: "ad6",
    title: "Summer Internship Program",
    description: "Apply now for summer internships with our partner companies",
    imageUrl: "/placeholder.svg?height=120&width=400&text=Internships",
    url: "https://example.com/internships",
    category: "careers",
    clicks: 0,
    impressions: 0,
  },
]

// Blocked categories
const blockedCategories = ["gambling", "alcohol", "adult"]

// Filter out ads in blocked categories
const safeAds = allAds.filter((ad) => !blockedCategories.includes(ad.category))

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const all = searchParams.get("all")

  // If requesting all ads (for admin dashboard)
  if (all === "true") {
    return NextResponse.json(allAds)
  }

  // For regular ad display, return a random safe ad
  if (safeAds.length === 0) {
    return NextResponse.json({ error: "No suitable ads available" }, { status: 404 })
  }

  // Select a random ad
  const randomIndex = Math.floor(Math.random() * safeAds.length)
  const selectedAd = safeAds[randomIndex]

  // Increment impression count
  const adIndex = allAds.findIndex((ad) => ad.id === selectedAd.id)
  if (adIndex !== -1) {
    allAds[adIndex].impressions++
  }

  return NextResponse.json(selectedAd)
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const action = searchParams.get("action")

  if (!id || !action) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  if (action === "click") {
    // Increment click count
    const adIndex = allAds.findIndex((ad) => ad.id === id)
    if (adIndex !== -1) {
      allAds[adIndex].clicks++
      return NextResponse.json({ success: true })
    }
  }

  return NextResponse.json({ error: "Invalid action or ad not found" }, { status: 400 })
}
