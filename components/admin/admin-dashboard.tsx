"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, Calendar } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClientComponentClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

type CheckIn = {
  id: string
  student_email: string
  event_id: string
  check_in_time: string
  verification_status: string
  eventTitle?: string
}

type Event = {
  id: string
  title: string
}

export function AdminDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [ads, setAds] = useState<any[]>([])
  const [securityAlerts, setSecurityAlerts] = useState(0)
  const [eventCount, setEventCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/student-login")
    }
  }, [user, router])

  useEffect(() => {
    async function fetchData() {
      if (!user?.role || user.role !== "admin") return

      setIsLoading(true)
      setError(null)

      try {
        // First, fetch all events to use for lookups
        const { data: eventsData, error: eventsError } = await supabase.from("events").select("id, title")

        if (eventsError) {
          console.error("Error fetching events:", eventsError)
          throw new Error("Failed to load events data")
        }

        // Create a lookup map of events by ID
        const eventsMap: Record<string, Event> = {}
        if (eventsData) {
          eventsData.forEach((event) => {
            eventsMap[event.id] = event
          })
          setEventCount(eventsData.length)
        }

        // Fetch check-ins from Supabase
        const { data: checkInsData, error: checkInsError } = await supabase
          .from("attendance")
          .select("*")
          .order("check_in_time", { ascending: false })
          .limit(50)

        if (checkInsError) {
          console.error("Error fetching check-ins:", checkInsError)
          throw new Error("Failed to load check-in data")
        }

        // Manually add event titles to check-ins
        const checkInsWithEventTitles = checkInsData
          ? checkInsData.map((checkIn) => ({
              ...checkIn,
              eventTitle: eventsMap[checkIn.event_id]?.title || "Unknown Event",
            }))
          : []

        setCheckIns(checkInsWithEventTitles)

        // Fetch ads
        try {
          const adsResponse = await fetch("/api/ads?all=true")
          if (!adsResponse.ok) {
            throw new Error(`Failed to fetch ads: ${adsResponse.statusText}`)
          }
          const adsData = await adsResponse.json()
          setAds(adsData)
        } catch (adsError) {
          console.error("Error fetching ads:", adsError)
          // Don't fail the whole dashboard if just ads fail
          setAds([])
        }

        // Fetch security alerts count
        try {
          const { count, error: securityError } = await supabase
            .from("security_logs")
            .select("*", { count: "exact", head: true })
            .or("severity.eq.error,severity.eq.warning")

          if (securityError) throw securityError
          setSecurityAlerts(count || 0)
        } catch (securityError) {
          console.error("Error fetching security alerts:", securityError)
          // Don't fail if security count fails
          setSecurityAlerts(0)
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setError(error instanceof Error ? error.message : "An unknown error occurred")
        toast({
          title: "Error loading dashboard",
          description: error instanceof Error ? error.message : "Failed to load dashboard data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, supabase, toast])

  if (!user || user.role !== "admin") {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Welcome, Admin</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/events")} className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Manage Events
          </Button>
          <Button variant="outline" onClick={() => router.push("/admin/security")} className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            Security Dashboard
            {securityAlerts > 0 && (
              <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{securityAlerts}</span>
            )}
          </Button>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Events</CardTitle>
            <CardDescription>All scheduled events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{eventCount}</div>
            <p className="text-sm text-muted-foreground">
              <Button variant="link" className="p-0 h-auto" onClick={() => router.push("/admin/events")}>
                Manage Events
              </Button>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent Check-ins</CardTitle>
            <CardDescription>Student attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{checkIns.length}</div>
            <p className="text-sm text-muted-foreground">Total check-ins</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Security Alerts</CardTitle>
            <CardDescription>Potential issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{securityAlerts}</div>
            <p className="text-sm text-muted-foreground">
              <Button variant="link" className="p-0 h-auto" onClick={() => router.push("/admin/security")}>
                View Security Dashboard
              </Button>
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="checkins">
        <TabsList>
          <TabsTrigger value="checkins">Check-ins</TabsTrigger>
          <TabsTrigger value="ads">Ads</TabsTrigger>
        </TabsList>

        <TabsContent value="checkins">
          <Card>
            <CardHeader>
              <CardTitle>Recent Check-ins</CardTitle>
              <CardDescription>View all student check-ins for events</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center">Loading check-ins...</div>
              ) : error ? (
                <div className="py-8 text-center text-red-500">{error}</div>
              ) : checkIns.length === 0 ? (
                <div className="py-8 text-center">No check-ins recorded yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkIns.map((checkIn) => (
                      <TableRow key={checkIn.id}>
                        <TableCell>{checkIn.student_email}</TableCell>
                        <TableCell>{checkIn.eventTitle || checkIn.event_id}</TableCell>
                        <TableCell>{new Date(checkIn.check_in_time).toLocaleString()}</TableCell>
                        <TableCell>{checkIn.verification_status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads">
          <Card>
            <CardHeader>
              <CardTitle>Ad Performance</CardTitle>
              <CardDescription>View all ads and their performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center">Loading ads...</div>
              ) : ads.length === 0 ? (
                <div className="py-8 text-center">No ads available.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Impressions</TableHead>
                      <TableHead>Clicks</TableHead>
                      <TableHead>CTR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ads.map((ad) => (
                      <TableRow key={ad.id}>
                        <TableCell>{ad.title}</TableCell>
                        <TableCell>{ad.category}</TableCell>
                        <TableCell>{ad.impressions}</TableCell>
                        <TableCell>{ad.clicks}</TableCell>
                        <TableCell>
                          {ad.impressions > 0 ? `${((ad.clicks / ad.impressions) * 100).toFixed(2)}%` : "0%"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
