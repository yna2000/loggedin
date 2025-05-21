"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Shield, CheckCircle, XCircle } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { createClientComponentClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

type SecurityLog = {
  id: string
  log_type: string
  description: string
  severity: string
  related_student: string
  related_event: string
  ip_address: string
  created_at: string
}

type AttendanceReport = {
  id: string
  student_email: string
  event_id: string
  report_type: string
  report_reason: string
  status: string
  admin_notes: string
  created_at: string
  eventTitle?: string
}

type Attendance = {
  id: string
  student_email: string
  event_id: string
  check_in_time: string
  verification_status: string
  verification_method: string
  eventTitle?: string
}

type Event = {
  id: string
  title: string
  description: string
  location: string
  start_time: string
  end_time: string
}

export function SecurityDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([])
  const [attendanceReports, setAttendanceReports] = useState<AttendanceReport[]>([])
  const [suspiciousActivity, setSuspiciousActivity] = useState<Attendance[]>([])
  const [events, setEvents] = useState<Record<string, Event>>({})
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
        const { data: eventsData, error: eventsError } = await supabase.from("events").select("*")

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
        }
        setEvents(eventsMap)

        // Fetch security logs
        const { data: logsData, error: logsError } = await supabase
          .from("security_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50)

        if (logsError) {
          console.error("Error fetching security logs:", logsError)
          throw new Error("Failed to load security logs")
        }

        setSecurityLogs(logsData || [])

        // Fetch attendance reports
        const { data: reportsData, error: reportsError } = await supabase
          .from("attendance_reports")
          .select("*")
          .order("created_at", { ascending: false })

        if (reportsError) {
          console.error("Error fetching attendance reports:", reportsError)
          throw new Error("Failed to load attendance reports")
        }

        // Manually add event titles to reports
        const reportsWithEventTitles = reportsData
          ? reportsData.map((report) => ({
              ...report,
              eventTitle: eventsMap[report.event_id]?.title || "Unknown Event",
            }))
          : []

        setAttendanceReports(reportsWithEventTitles)

        // Fetch suspicious activity (failed or pending verifications)
        const { data: suspiciousData, error: suspiciousError } = await supabase
          .from("attendance")
          .select("*")
          .or("verification_status.eq.failed,verification_status.eq.pending")
          .order("check_in_time", { ascending: false })

        if (suspiciousError) {
          console.error("Error fetching suspicious activity:", suspiciousError)
          throw new Error("Failed to load suspicious activity")
        }

        // Manually add event titles to suspicious activities
        const suspiciousWithEventTitles = suspiciousData
          ? suspiciousData.map((activity) => ({
              ...activity,
              eventTitle: eventsMap[activity.event_id]?.title || "Unknown Event",
            }))
          : []

        setSuspiciousActivity(suspiciousWithEventTitles)
      } catch (error) {
        console.error("Error fetching security data:", error)
        setError(error instanceof Error ? error.message : "An unknown error occurred")
        toast({
          title: "Error loading security data",
          description: error instanceof Error ? error.message : "Failed to load security data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, supabase, toast])

  async function approveAttendance(id: string) {
    try {
      const { error } = await supabase.from("attendance").update({ verification_status: "verified" }).eq("id", id)

      if (error) throw error

      // Update the UI
      setSuspiciousActivity((prev) =>
        prev.map((item) => (item.id === id ? { ...item, verification_status: "verified" } : item)),
      )

      toast({
        title: "Attendance approved",
        description: "The attendance record has been verified.",
      })
    } catch (error) {
      console.error("Error approving attendance:", error)
      toast({
        title: "Failed to approve attendance",
        description: "Could not approve the attendance record. Please try again.",
        variant: "destructive",
      })
    }
  }

  async function rejectAttendance(id: string) {
    try {
      const { error } = await supabase.from("attendance").update({ verification_status: "rejected" }).eq("id", id)

      if (error) throw error

      // Update the UI
      setSuspiciousActivity((prev) =>
        prev.map((item) => (item.id === id ? { ...item, verification_status: "rejected" } : item)),
      )

      toast({
        title: "Attendance rejected",
        description: "The attendance record has been rejected.",
      })
    } catch (error) {
      console.error("Error rejecting attendance:", error)
      toast({
        title: "Failed to reject attendance",
        description: "Could not reject the attendance record. Please try again.",
        variant: "destructive",
      })
    }
  }

  async function resolveReport(id: string, status: "resolved" | "rejected") {
    try {
      const { error } = await supabase
        .from("attendance_reports")
        .update({
          status,
          admin_notes: `Marked as ${status} by admin on ${new Date().toLocaleString()}`,
        })
        .eq("id", id)

      if (error) throw error

      // Update the UI
      setAttendanceReports((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))

      toast({
        title: `Report ${status}`,
        description: `The attendance report has been ${status}.`,
      })
    } catch (error) {
      console.error("Error updating report:", error)
      toast({
        title: "Failed to update report",
        description: "Could not update the report status. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (!user || user.role !== "admin") {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Shield className="h-6 w-6 mr-2 text-primary" />
          <h2 className="text-xl font-semibold">Security Dashboard</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/dashboard")}>
            Main Dashboard
          </Button>
          <Button variant="outline" onClick={() => router.push("/admin/events")}>
            Manage Events
          </Button>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Security Alerts</CardTitle>
            <CardDescription>Recent security issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {securityLogs.filter((log) => log.severity === "error" || log.severity === "warning").length}
            </div>
            <p className="text-sm text-muted-foreground">Active security alerts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pending Verifications</CardTitle>
            <CardDescription>Attendance needing verification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {suspiciousActivity.filter((item) => item.verification_status === "pending").length}
            </div>
            <p className="text-sm text-muted-foreground">Pending attendance records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Absence Reports</CardTitle>
            <CardDescription>Student reported absences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {attendanceReports.filter((report) => report.status === "pending").length}
            </div>
            <p className="text-sm text-muted-foreground">Pending absence reports</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <Tabs defaultValue="suspicious">
        <TabsList>
          <TabsTrigger value="suspicious">Suspicious Activity</TabsTrigger>
          <TabsTrigger value="reports">Absence Reports</TabsTrigger>
          <TabsTrigger value="logs">Security Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="suspicious">
          <Card>
            <CardHeader>
              <CardTitle>Suspicious Activity</CardTitle>
              <CardDescription>Attendance records that need verification</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center">Loading suspicious activity...</div>
              ) : suspiciousActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                  <p>No suspicious activity detected</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Check-in Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suspiciousActivity.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>{activity.student_email}</TableCell>
                        <TableCell>{activity.eventTitle || activity.event_id}</TableCell>
                        <TableCell>{new Date(activity.check_in_time).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              activity.verification_status === "verified"
                                ? "default"
                                : activity.verification_status === "pending"
                                  ? "outline"
                                  : "destructive"
                            }
                          >
                            {activity.verification_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{activity.verification_method}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => approveAttendance(activity.id)}
                              disabled={activity.verification_status === "verified"}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => rejectAttendance(activity.id)}
                              disabled={activity.verification_status === "rejected"}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Absence Reports</CardTitle>
              <CardDescription>Student reported absences that need review</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center">Loading absence reports...</div>
              ) : attendanceReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                  <p>No absence reports</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Reported At</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>{report.student_email}</TableCell>
                        <TableCell>{report.eventTitle || report.event_id}</TableCell>
                        <TableCell>{report.report_reason}</TableCell>
                        <TableCell>{new Date(report.created_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              report.status === "resolved"
                                ? "default"
                                : report.status === "pending"
                                  ? "outline"
                                  : "destructive"
                            }
                          >
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resolveReport(report.id, "resolved")}
                              disabled={report.status !== "pending"}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resolveReport(report.id, "rejected")}
                              disabled={report.status !== "pending"}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Security Logs</CardTitle>
              <CardDescription>Recent security events and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center">Loading security logs...</div>
              ) : securityLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                  <p>No security logs</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {securityLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.log_type}</TableCell>
                        <TableCell>{log.description}</TableCell>
                        <TableCell>{log.related_student}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.severity === "info"
                                ? "default"
                                : log.severity === "warning"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {log.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
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
