"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Ban, CalendarIcon, Video, FileText, Edit, ChevronLeft, ChevronRight, Clock } from "lucide-react"

const mockAppointments = [
  {
    id: "1",
    patientId: "P001",
    patientName: "John Doe",
    date: "2024-01-15",
    time: "10:00 AM",
    type: "Diet",
    duration: "30 min",
    status: "scheduled",
    videoLink: "https://meet.example.com/abc123",
    notes: "Follow-up on meal planning",
  },
  {
    id: "2",
    patientId: "P002",
    patientName: "Jane Smith",
    date: "2024-01-15",
    time: "11:30 AM",
    type: "Exercise",
    duration: "45 min",
    status: "scheduled",
    videoLink: "https://meet.example.com/def456",
    notes: "Review workout routine progress",
  },
  {
    id: "3",
    patientId: "P003",
    patientName: "Mike Johnson",
    date: "2024-01-16",
    time: "02:00 PM",
    type: "General",
    duration: "30 min",
    status: "scheduled",
    videoLink: "https://meet.example.com/ghi789",
    notes: "Monthly check-in",
  },
  {
    id: "4",
    patientId: "P004",
    patientName: "Sarah Wilson",
    date: "2024-01-18",
    time: "09:30 AM",
    type: "Diet",
    duration: "45 min",
    status: "scheduled",
    videoLink: "https://meet.example.com/jkl012",
    notes: "Nutrition plan review",
  },
]

const timeSlots = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
]

export default function CalendarScreen() {
  const [appointments, setAppointments] = useState(mockAppointments)
  const [currentDate, setCurrentDate] = useState(new Date(2024, 0, 15)) // January 15, 2024
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date(2024, 0, 15))
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false)
  const [showBlockTimeDialog, setShowBlockTimeDialog] = useState(false)

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const formatDateKey = (date: Date) => {
    return date.toISOString().split("T")[0]
  }

  const getAppointmentsForDate = (date: Date) => {
    const dateKey = formatDateKey(date)
    return appointments.filter((apt) => apt.date === dateKey)
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    const dayAppointments = getAppointmentsForDate(date)
    if (dayAppointments.length > 0) {
      setSelectedAppointment(dayAppointments[0])
    } else {
      setSelectedAppointment(null)
    }
  }

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString()
  }

  const days = getDaysInMonth(currentDate)
  const monthYear = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 h-12">
        <div className="flex items-center justify-between h-full">
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          <div className="flex gap-2">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Appointment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Appointment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Patient ID</Label>
                      <Input placeholder="Enter patient ID" />
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input type="date" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Time</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Consultation Type</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diet">Diet</SelectItem>
                          <SelectItem value="exercise">Exercise</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea placeholder="Add notes..." />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setShowCreateDialog(false)}>Create</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Clock className="w-4 h-4 mr-2" />
                  Set Availability
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set Availability</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input type="date" />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input type="date" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select start time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select end time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAvailabilityDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setShowAvailabilityDialog(false)}>Set Availability</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="secondary" size="sm" onClick={() => setShowBlockTimeDialog(true)}>
              <Ban className="w-4 h-4 mr-2" />
              Block Time
            </Button>

            <Dialog open={showBlockTimeDialog} onOpenChange={setShowBlockTimeDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Block Time Slot</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Date</Label>
                      <Input type="date" />
                    </div>
                    <div>
                      <Label>Time</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Textarea placeholder="Reason for blocking..." />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowBlockTimeDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setShowBlockTimeDialog(false)}>Block Time</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar View */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    {monthYear}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Week day headers */}
                  {weekDays.map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-b">
                      {day}
                    </div>
                  ))}

                  {/* Calendar days */}
                  {days.map((date, index) => {
                    if (!date) {
                      return <div key={index} className="p-2 h-24"></div>
                    }

                    const dayAppointments = getAppointmentsForDate(date)
                    const isCurrentDay = isToday(date)
                    const isSelectedDay = isSelected(date)

                    return (
                      <div
                        key={index}
                        className={`p-2 h-24 border border-gray-200 cursor-pointer hover:bg-gray-50 ${
                          isCurrentDay ? "bg-blue-50 border-blue-300" : ""
                        } ${isSelectedDay ? "bg-blue-100 border-blue-400" : ""}`}
                        onClick={() => handleDateClick(date)}
                      >
                        <div className={`text-sm font-medium mb-1 ${isCurrentDay ? "text-blue-600" : "text-gray-900"}`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayAppointments.slice(0, 2).map((apt, aptIndex) => (
                            <div
                              key={aptIndex}
                              className="text-xs p-1 bg-blue-100 text-blue-800 rounded truncate cursor-pointer hover:bg-blue-200"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAppointmentClick(apt)
                              }}
                            >
                              {apt.time} - {apt.patientName}
                            </div>
                          ))}
                          {dayAppointments.length > 2 && (
                            <div className="text-xs text-gray-500">+{dayAppointments.length - 2} more</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Appointment Details */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate ? <>Appointments for {selectedDate.toLocaleDateString()}</> : "Select a date"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDate ? (
                  <div className="space-y-4">
                    {getAppointmentsForDate(selectedDate).length > 0 ? (
                      <>
                        <div className="space-y-2">
                          {getAppointmentsForDate(selectedDate).map((apt) => (
                            <div
                              key={apt.id}
                              className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                                selectedAppointment?.id === apt.id ? "border-blue-300 bg-blue-50" : "border-gray-200"
                              }`}
                              onClick={() => handleAppointmentClick(apt)}
                            >
                              <div className="font-medium">{apt.patientName}</div>
                              <div className="text-sm text-gray-600">
                                {apt.time} • {apt.type}
                              </div>
                            </div>
                          ))}
                        </div>

                        {selectedAppointment && (
                          <div className="border-t pt-4 space-y-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-500">Patient Details</Label>
                              <p className="font-medium">{selectedAppointment.patientName}</p>
                              <p className="text-sm text-gray-600">ID: {selectedAppointment.patientId}</p>
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-gray-500">Time & Type</Label>
                              <p className="font-medium">{selectedAppointment.time}</p>
                              <p className="text-sm text-gray-600">
                                {selectedAppointment.type} • {selectedAppointment.duration}
                              </p>
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-gray-500">Notes</Label>
                              <p className="text-sm">{selectedAppointment.notes}</p>
                            </div>

                            <div className="space-y-2">
                              <Button className="w-full" size="sm">
                                <Video className="w-4 h-4 mr-2" />
                                Join Video Call
                              </Button>

                              <Button variant="outline" className="w-full bg-transparent" size="sm">
                                <FileText className="w-4 h-4 mr-2" />
                                View Documents
                              </Button>

                              <Button variant="outline" className="w-full bg-transparent" size="sm">
                                <Edit className="w-4 h-4 mr-2" />
                                Reschedule
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No appointments scheduled</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Select a date to view appointments</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
