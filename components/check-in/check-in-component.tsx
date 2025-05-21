"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, LogIn, Shield, AlertTriangle, Camera, X } from "lucide-react"
import { QrScanner } from "@yudiel/react-qr-scanner"

import { useAuth } from "@/components/auth/auth-provider"
import { AdDisplay } from "@/components/ads/ad-display"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from "@/lib/supabase"

type GeolocationPosition = {
  coords: {
    latitude: number
    longitude: number
    accuracy: number
  }
}

type Event = {
  id: string
  title: string
  description: string
  location: string
  start_time: string
  end_time: string
  attendance_required: boolean
  geo_fence: any
  qr_code_secret: string
}

export function CheckInComponent() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [verificationMethod, setVerificationMethod] = useState<"location" | "qr" | "manual">("location")
  const [deviceInfo, setDeviceInfo] = useState<string>("")
  const [showQrScanner, setShowQrScanner] = useState(false)
  const supabase = createClientComponentClient()

  // Get device info
  useEffect(() => {
    const userAgent = navigator.userAgent
    const platform = navigator.platform
    setDeviceInfo(`${platform} - ${userAgent}`)
  }, [])

  // Fetch available events
  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .gte("end_time", new Date().toISOString())
          .order("start_time", { ascending: true })

        if (error) throw error
        setEvents(data || [])

        // Auto-select the first event if available
        if (data && data.length > 0) {
          setSelectedEvent(data[0].id)
        }
      } catch (error) {
        console.error("Error fetching events:", error)
        toast({
          title: "Failed to load events",
          description: "Could not load available events. Please try again.",
          variant: "destructive",
        })
      }
    }

    if (user) {
      fetchEvents()
    }
  }, [user, supabase, toast])

  // Redirect if not logged in
  if (!user) {
    router.push("/student-login")
    return null
  }

  // Get current location
  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"))
      } else {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        })
      }
    })
  }

  // Verify location is within geofence
  const verifyLocation = async (eventId: string, position: GeolocationPosition) => {
    try {
      const event = events.find((e) => e.id === eventId)

      if (!event || !event.geo_fence) {
        return { verified: false, reason: "No geofence defined for this event" }
      }

      const geoFence = event.geo_fence
      const { latitude, longitude } = position.coords

      // Simple circular geofence check
      if (geoFence.type === "circle") {
        const distance = calculateDistance(latitude, longitude, geoFence.center.latitude, geoFence.center.longitude)
        return {
          verified: distance <= geoFence.radius,
          reason: distance <= geoFence.radius ? "Location verified" : "You are not at the event location",
        }
      }

      return { verified: false, reason: "Unsupported geofence type" }
    } catch (error) {
      console.error("Error verifying location:", error)
      return { verified: false, reason: "Error verifying location" }
    }
  }

  // Verify QR code
  const verifyQrCode = async (qrData: string) => {
    try {
      // Parse QR code data
      const data = JSON.parse(qrData)

      if (!data.eventId || !data.secret) {
        return { verified: false, reason: "Invalid QR code" }
      }

      // Find the event
      const event = events.find((e) => e.id === data.eventId)
      if (!event) {
        return { verified: false, reason: "Event not found" }
      }

      // Verify the secret
      if (event.qr_code_secret !== data.secret) {
        return { verified: false, reason: "Invalid QR code secret" }
      }

      // Set the selected event
      setSelectedEvent(event.id)

      return { verified: true, reason: "QR code verified", eventId: event.id }
    } catch (error) {
      console.error("Error verifying QR code:", error)
      return { verified: false, reason: "Invalid QR code format" }
    }
  }

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in km
    return d * 1000 // Convert to meters
  }

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180)
  }

  // Log security event
  const logSecurityEvent = async (logType: string, description: string, severity = "info") => {
    try {
      await supabase.from("security_logs").insert({
        log_type: logType,
        description,
        severity,
        related_student: user.email,
        related_event: selectedEvent,
        ip_address: await getIpAddress(),
      })
    } catch (error) {
      console.error("Error logging security event:", error)
    }
  }

  // Get IP address
  const getIpAddress = async (): Promise<string> => {
    try {
      const response = await fetch("https://api.ipify.org?format=json")
      const data = await response.json()
      return data.ip
    } catch (error) {
      console.error("Error getting IP address:", error)
      return "unknown"
    }
  }

  async function handleCheckIn() {
    if (!selectedEvent) {
      toast({
        title: "No event selected",
        description: "Please select an event to check in to.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setIsVerifying(true)

    try {
      // Get current location
      let locationData = null
      let verificationResult = { verified: false, reason: "Verification not attempted" }

      if (verificationMethod === "location") {
        try {
          const position = await getCurrentLocation()
          locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }

          // Verify location
          verificationResult = await verifyLocation(selectedEvent, position)

          if (!verificationResult.verified) {
            // Log security event for failed location verification
            await logSecurityEvent(
              "LOCATION_VERIFICATION_FAILED",
              `Location verification failed: ${verificationResult.reason}`,
              "warning",
            )

            toast({
              title: "Location verification failed",
              description: verificationResult.reason,
              variant: "destructive",
            })

            setIsLoading(false)
            setIsVerifying(false)
            return
          }
        } catch (error) {
          console.error("Error getting location:", error)
          toast({
            title: "Location error",
            description: "Could not access your location. Please enable location services.",
            variant: "destructive",
          })

          await logSecurityEvent(
            "LOCATION_ACCESS_FAILED",
            `Could not access location: ${error instanceof Error ? error.message : "Unknown error"}`,
            "warning",
          )

          setIsLoading(false)
          setIsVerifying(false)
          return
        }
      }

      // Get IP address
      const ipAddress = await getIpAddress()

      // Record attendance in Supabase
      const { error } = await supabase.from("attendance").insert({
        student_email: user.email,
        event_id: selectedEvent,
        check_in_time: new Date().toISOString(),
        check_in_location: locationData,
        ip_address: ipAddress,
        device_info: deviceInfo,
        verification_status: verificationResult.verified ? "verified" : "pending",
        verification_method: verificationMethod,
      })

      if (error) throw error

      // Log successful check-in
      await logSecurityEvent("SUCCESSFUL_CHECK_IN", `Student successfully checked in to event ${selectedEvent}`, "info")

      setIsCheckedIn(true)

      toast({
        title: "Check-in successful!",
        description: "You have successfully checked in to the event.",
      })
    } catch (error) {
      console.error("Error during check-in:", error)

      toast({
        title: "Check-in failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })

      // Log check-in failure
      await logSecurityEvent(
        "CHECK_IN_FAILED",
        `Check-in failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      )
    } finally {
      setIsLoading(false)
      setIsVerifying(false)
    }
  }

  async function handleQrCodeScan(data: string) {
    setShowQrScanner(false)
    setIsLoading(true)
    setIsVerifying(true)

    try {
      // Verify QR code
      const verificationResult = await verifyQrCode(data)

      if (!verificationResult.verified) {
        toast({
          title: "QR code verification failed",
          description: verificationResult.reason,
          variant: "destructive",
        })

        await logSecurityEvent(
          "QR_VERIFICATION_FAILED",
          `QR verification failed: ${verificationResult.reason}`,
          "warning",
        )

        setIsLoading(false)
        setIsVerifying(false)
        return
      }

      // Get IP address
      const ipAddress = await getIpAddress()

      // Record attendance in Supabase
      const { error } = await supabase.from("attendance").insert({
        student_email: user.email,
        event_id: verificationResult.eventId,
        check_in_time: new Date().toISOString(),
        check_in_location: null,
        ip_address: ipAddress,
        device_info: deviceInfo,
        verification_status: "verified",
        verification_method: "qr",
      })

      if (error) throw error

      // Log successful check-in
      await logSecurityEvent(
        "SUCCESSFUL_CHECK_IN",
        `Student successfully checked in to event ${verificationResult.eventId} via QR code`,
        "info",
      )

      setIsCheckedIn(true)

      toast({
        title: "Check-in successful!",
        description: "You have successfully checked in to the event.",
      })
    } catch (error) {
      console.error("Error during QR check-in:", error)

      toast({
        title: "Check-in failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })

      // Log check-in failure
      await logSecurityEvent(
        "CHECK_IN_FAILED",
        `QR check-in failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error",
      )
    } finally {
      setIsLoading(false)
      setIsVerifying(false)
    }
  }

  async function reportAbsence() {
    if (!selectedEvent) {
      toast({
        title: "No event selected",
        description: "Please select an event to report absence for.",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.from("attendance_reports").insert({
        student_email: user.email,
        event_id: selectedEvent,
        report_type: "absence",
        report_reason: "Student reported inability to attend",
      })

      if (error) throw error

      toast({
        title: "Absence reported",
        description: "Your absence has been reported to the administrator.",
      })

      // Log absence report
      await logSecurityEvent("ABSENCE_REPORTED", `Student reported absence for event ${selectedEvent}`, "info")
    } catch (error) {
      console.error("Error reporting absence:", error)

      toast({
        title: "Failed to report absence",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="w-full max-w-md">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">LoggedIn</CardTitle>
          <CardDescription>STI Student Check-in System</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isCheckedIn ? (
            <>
              <div className="text-center">
                <p className="mb-2">Welcome, {user.email}</p>

                {showQrScanner ? (
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 z-10"
                      onClick={() => setShowQrScanner(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="rounded-lg overflow-hidden">
                      <QrScanner
                        onDecode={handleQrCodeScan}
                        onError={(error) => {
                          console.error(error)
                          toast({
                            title: "Scanner error",
                            description: "Could not access camera or scan QR code.",
                            variant: "destructive",
                          })
                        }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Position the QR code within the scanner frame</p>
                  </div>
                ) : (
                  <>
                    {events.length > 0 ? (
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Select Event</label>
                        <select
                          className="w-full p-2 border rounded-md"
                          value={selectedEvent || ""}
                          onChange={(e) => setSelectedEvent(e.target.value)}
                        >
                          {events.map((event) => (
                            <option key={event.id} value={event.id}>
                              {event.title} - {new Date(event.start_time).toLocaleString()}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <p className="text-amber-500 flex items-center justify-center gap-2 my-4">
                        <AlertTriangle className="h-4 w-4" />
                        No upcoming events available
                      </p>
                    )}

                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1">Verification Method</label>
                      <div className="flex gap-2">
                        <Button
                          variant={verificationMethod === "location" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setVerificationMethod("location")}
                        >
                          Location
                        </Button>
                        <Button
                          variant={verificationMethod === "qr" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setVerificationMethod("qr")}
                        >
                          QR Code
                        </Button>
                      </div>
                    </div>

                    {verificationMethod === "qr" ? (
                      <Button
                        size="lg"
                        className="w-full mt-4"
                        onClick={() => setShowQrScanner(true)}
                        disabled={isLoading}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Scan QR Code
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        className="w-full mt-4"
                        onClick={handleCheckIn}
                        disabled={isLoading || !selectedEvent}
                      >
                        {isLoading ? (
                          isVerifying ? (
                            "Verifying..."
                          ) : (
                            "Processing..."
                          )
                        ) : (
                          <>
                            Tap to Check-in
                            <LogIn className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={reportAbsence}
                      disabled={isLoading || !selectedEvent}
                    >
                      Report Absence
                    </Button>

                    <div className="flex items-center justify-center mt-4 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3 mr-1" />
                      Secured with {verificationMethod === "location" ? "location" : "QR code"} verification
                    </div>
                  </>
                )}
              </div>
              <AdDisplay />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 py-6">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <h3 className="text-xl font-medium">Check-in Successful!</h3>
              <p className="text-center text-muted-foreground">You have successfully checked in to the event.</p>
              <div className="flex items-center justify-center text-xs text-green-600">
                <Shield className="h-3 w-3 mr-1" />
                Attendance verified
              </div>
              <Button variant="outline" onClick={() => setIsCheckedIn(false)}>
                Back to Check-in
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Button variant="ghost" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
