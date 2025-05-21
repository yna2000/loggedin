"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { QrCode, Plus, Edit, Trash, Download } from "lucide-react"
import QRCode from "qrcode.react"

import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClientComponentClient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

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
  created_at: string
}

export function EventsManagement() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrEvent, setQrEvent] = useState<Event | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    attendance_required: true,
    latitude: "",
    longitude: "",
    radius: "100",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClientComponentClient()

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/student-login")
    }
  }, [user, router])

  useEffect(() => {
    if (selectedEvent) {
      // Parse the geo_fence data
      const geoFence = selectedEvent.geo_fence || {
        type: "circle",
        center: { latitude: "", longitude: "" },
        radius: 100,
      }

      setFormData({
        title: selectedEvent.title,
        description: selectedEvent.description,
        location: selectedEvent.location,
        start_time: new Date(selectedEvent.start_time).toISOString().slice(0, 16),
        end_time: new Date(selectedEvent.end_time).toISOString().slice(0, 16),
        attendance_required: selectedEvent.attendance_required,
        latitude: geoFence.center?.latitude?.toString() || "",
        longitude: geoFence.center?.longitude?.toString() || "",
        radius: geoFence.radius?.toString() || "100",
      })
    } else {
      setFormData({
        title: "",
        description: "",
        location: "",
        start_time: new Date().toISOString().slice(0, 16),
        end_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        attendance_required: true,
        latitude: "",
        longitude: "",
        radius: "100",
      })
    }
  }, [selectedEvent])

  useEffect(() => {
    async function fetchEvents() {
      if (!user?.role || user.role !== "admin") return

      setIsLoading(true)
      setError(null)

      try {
        const { data, error } = await supabase.from("events").select("*").order("start_time", { ascending: false })

        if (error) {
          console.error("Error fetching events:", error)
          throw new Error("Failed to load events")
        }

        setEvents(data || [])
      } catch (error) {
        console.error("Error fetching events:", error)
        setError(error instanceof Error ? error.message : "An unknown error occurred")
        toast({
          title: "Error loading events",
          description: error instanceof Error ? error.message : "Failed to load events",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [user, supabase, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Basic validation
      if (!formData.title || !formData.description || !formData.location) {
        throw new Error("Please fill in all required fields")
      }

      // Generate a random QR code secret if creating a new event
      const qrCodeSecret = selectedEvent?.qr_code_secret || Math.random().toString(36).substring(2, 15)

      // Create geo_fence object
      const geoFence = {
        type: "circle",
        center: {
          latitude: Number.parseFloat(formData.latitude || "0"),
          longitude: Number.parseFloat(formData.longitude || "0"),
        },
        radius: Number.parseInt(formData.radius || "100"),
      }

      const eventData = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        attendance_required: formData.attendance_required,
        geo_fence: geoFence,
        qr_code_secret: qrCodeSecret,
      }

      if (selectedEvent) {
        // Update existing event
        const { error } = await supabase.from("events").update(eventData).eq("id", selectedEvent.id)

        if (error) throw error

        toast({
          title: "Event updated",
          description: "The event has been updated successfully.",
        })

        // Update the events list
        setEvents((prev) =>
          prev.map((event) =>
            event.id === selectedEvent.id ? { ...event, ...eventData, id: selectedEvent.id } : event,
          ),
        )
      } else {
        // Create new event
        const { data, error } = await supabase.from("events").insert(eventData).select()

        if (error) throw error

        toast({
          title: "Event created",
          description: "The event has been created successfully.",
        })

        // Add the new event to the list
        if (data && data.length > 0) {
          setEvents((prev) => [data[0], ...prev])
        }
      }

      // Close the dialog and reset form
      setIsDialogOpen(false)
      setSelectedEvent(null)
      setFormData({
        title: "",
        description: "",
        location: "",
        start_time: new Date().toISOString().slice(0, 16),
        end_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        attendance_required: true,
        latitude: "",
        longitude: "",
        radius: "100",
      })
    } catch (error) {
      console.error("Error saving event:", error)
      toast({
        title: "Error saving event",
        description: error instanceof Error ? error.message : "Failed to save event",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm("Are you sure you want to delete this event?")) return

    try {
      const { error } = await supabase.from("events").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Event deleted",
        description: "The event has been deleted successfully.",
      })

      // Remove the event from the list
      setEvents((prev) => prev.filter((event) => event.id !== id))
    } catch (error) {
      console.error("Error deleting event:", error)
      toast({
        title: "Error deleting event",
        description: error instanceof Error ? error.message : "Failed to delete event",
        variant: "destructive",
      })
    }
  }

  function showQRCode(event: Event) {
    setQrEvent(event)
    setQrDialogOpen(true)
  }

  function downloadQRCode() {
    if (!qrEvent) return

    const canvas = document.getElementById("event-qrcode") as HTMLCanvasElement
    if (!canvas) return

    const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream")
    const downloadLink = document.createElement("a")
    downloadLink.href = pngUrl
    downloadLink.download = `${qrEvent.title.replace(/\s+/g, "-")}-qrcode.png`
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }

  if (!user || user.role !== "admin") {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <QrCode className="h-6 w-6 mr-2 text-primary" />
          <h2 className="text-xl font-semibold">Events Management</h2>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedEvent(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{selectedEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
                <DialogDescription>
                  {selectedEvent
                    ? "Update the event details below."
                    : "Fill in the details below to create a new event."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Programming Workshop"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Learn the basics of programming..."
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    name="location"
                    placeholder="Computer Lab 101"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time *</Label>
                    <Input
                      id="start_time"
                      name="start_time"
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time *</Label>
                    <Input
                      id="end_time"
                      name="end_time"
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <input
                    id="attendance_required"
                    name="attendance_required"
                    type="checkbox"
                    checked={formData.attendance_required}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="attendance_required">Attendance Required</Label>
                    <p className="text-sm text-muted-foreground">
                      Check this if attendance is mandatory for this event.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Geofence Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Set the location coordinates and radius for attendance verification.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        name="latitude"
                        placeholder="14.5995"
                        value={formData.latitude}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        name="longitude"
                        placeholder="120.9842"
                        value={formData.longitude}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="radius">Radius (m)</Label>
                      <Input
                        id="radius"
                        name="radius"
                        placeholder="100"
                        value={formData.radius}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : selectedEvent ? "Update Event" : "Create Event"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => router.push("/admin/dashboard")}>
            Dashboard
          </Button>
          <Button variant="outline" onClick={() => router.push("/admin/security")}>
            Security
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

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
          <TabsTrigger value="past">Past Events</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full py-8 text-center">Loading events...</div>
            ) : events.filter((event) => new Date(event.end_time) >= new Date()).length === 0 ? (
              <div className="col-span-full py-8 text-center">No upcoming events</div>
            ) : (
              events
                .filter((event) => new Date(event.end_time) >= new Date())
                .map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <CardTitle>{event.title}</CardTitle>
                      <CardDescription>{event.location}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm">{event.description}</p>
                        <div className="text-sm">
                          <div>
                            <span className="font-medium">Start:</span> {new Date(event.start_time).toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">End:</span> {new Date(event.end_time).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm" onClick={() => showQRCode(event)}>
                            <QrCode className="h-4 w-4 mr-1" />
                            QR Code
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEvent(event)
                              setIsDialogOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteEvent(event.id)}>
                            <Trash className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="past">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full py-8 text-center">Loading events...</div>
            ) : events.filter((event) => new Date(event.end_time) < new Date()).length === 0 ? (
              <div className="col-span-full py-8 text-center">No past events</div>
            ) : (
              events
                .filter((event) => new Date(event.end_time) < new Date())
                .map((event) => (
                  <Card key={event.id} className="opacity-75">
                    <CardHeader>
                      <CardTitle>{event.title}</CardTitle>
                      <CardDescription>{event.location}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm">{event.description}</p>
                        <div className="text-sm">
                          <div>
                            <span className="font-medium">Start:</span> {new Date(event.start_time).toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">End:</span> {new Date(event.end_time).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm" onClick={() => showQRCode(event)}>
                            <QrCode className="h-4 w-4 mr-1" />
                            QR Code
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteEvent(event.id)}>
                            <Trash className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Event QR Code</DialogTitle>
            <DialogDescription>Students can scan this QR code to check in to the event.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4">
            {qrEvent && (
              <>
                <div className="mb-4 text-center">
                  <h3 className="font-medium">{qrEvent.title}</h3>
                  <p className="text-sm text-muted-foreground">{new Date(qrEvent.start_time).toLocaleDateString()}</p>
                </div>
                <div className="border p-4 rounded-lg bg-white">
                  <QRCode
                    id="event-qrcode"
                    value={JSON.stringify({
                      eventId: qrEvent.id,
                      secret: qrEvent.qr_code_secret,
                      title: qrEvent.title,
                    })}
                    size={200}
                    level="H"
                  />
                </div>
                <Button className="mt-4" onClick={downloadQRCode}>
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
