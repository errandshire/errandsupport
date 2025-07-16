"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  Calendar, 
  Clock, 
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  RotateCcw,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WorkerSidebar, SidebarToggle } from "@/components/layout/worker-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  day: string;
  isActive: boolean;
  slots: TimeSlot[];
}

interface BlockedDate {
  id: string;
  date: string;
  reason: string;
  isRecurring: boolean;
}

const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const defaultSchedule: DaySchedule[] = [
  { day: "monday", isActive: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "tuesday", isActive: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "wednesday", isActive: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "thursday", isActive: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "friday", isActive: true, slots: [{ start: "09:00", end: "17:00" }] },
  { day: "saturday", isActive: true, slots: [{ start: "10:00", end: "16:00" }] },
  { day: "sunday", isActive: false, slots: [] },
];

const mockBlockedDates: BlockedDate[] = [
  { id: "1", date: "2024-01-20", reason: "Personal appointment", isRecurring: false },
  { id: "2", date: "2024-01-25", reason: "Equipment maintenance", isRecurring: false },
  { id: "3", date: "2024-02-01", reason: "Family event", isRecurring: false },
];

export default function WorkerAvailabilityPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [schedule, setSchedule] = React.useState<DaySchedule[]>(defaultSchedule);
  const [blockedDates, setBlockedDates] = React.useState<BlockedDate[]>(mockBlockedDates);
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempSchedule, setTempSchedule] = React.useState<DaySchedule[]>(defaultSchedule);
  const [newBlockedDate, setNewBlockedDate] = React.useState("");
  const [newBlockedReason, setNewBlockedReason] = React.useState("");

  React.useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/worker/availability");
      return;
    }
    
    if (user.role !== "worker") {
      router.replace(`/${user.role}`);
      return;
    }
  }, [loading, isAuthenticated, user, router]);

  const toggleDayActive = (dayIndex: number) => {
    const newSchedule = [...tempSchedule];
    newSchedule[dayIndex].isActive = !newSchedule[dayIndex].isActive;
    if (!newSchedule[dayIndex].isActive) {
      newSchedule[dayIndex].slots = [];
    } else if (newSchedule[dayIndex].slots.length === 0) {
      newSchedule[dayIndex].slots = [{ start: "09:00", end: "17:00" }];
    }
    setTempSchedule(newSchedule);
  };

  const addTimeSlot = (dayIndex: number) => {
    const newSchedule = [...tempSchedule];
    newSchedule[dayIndex].slots.push({ start: "09:00", end: "17:00" });
    setTempSchedule(newSchedule);
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    const newSchedule = [...tempSchedule];
    newSchedule[dayIndex].slots.splice(slotIndex, 1);
    setTempSchedule(newSchedule);
  };

  const updateTimeSlot = (dayIndex: number, slotIndex: number, field: "start" | "end", value: string) => {
    const newSchedule = [...tempSchedule];
    newSchedule[dayIndex].slots[slotIndex][field] = value;
    setTempSchedule(newSchedule);
  };

  const saveSchedule = () => {
    setSchedule(tempSchedule);
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setTempSchedule(schedule);
    setIsEditing(false);
  };

  const addBlockedDate = () => {
    if (!newBlockedDate || !newBlockedReason) return;
    
    const newBlocked: BlockedDate = {
      id: Date.now().toString(),
      date: newBlockedDate,
      reason: newBlockedReason,
      isRecurring: false
    };
    
    setBlockedDates([...blockedDates, newBlocked]);
    setNewBlockedDate("");
    setNewBlockedReason("");
  };

  const removeBlockedDate = (id: string) => {
    setBlockedDates(blockedDates.filter(date => date.id !== id));
  };

  const formatDayName = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const currentSchedule = isEditing ? tempSchedule : schedule;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      

      <div className="flex-1 flex flex-col lg:ml-0">
         
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
                  Availability & Schedule
                </h1>
                <p className="text-neutral-600">
                  Manage your working hours and blocked dates
                </p>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={cancelEditing}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button onClick={saveSchedule}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Schedule
                  </Button>
                )}
              </div>
            </div>

            <Tabs defaultValue="schedule" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="schedule">Weekly Schedule</TabsTrigger>
                <TabsTrigger value="blocked">Blocked Dates</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="schedule" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Schedule</CardTitle>
                    <CardDescription>
                      Set your regular working hours for each day of the week
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {currentSchedule.map((daySchedule, dayIndex) => (
                        <div key={daySchedule.day} className="border border-neutral-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-medium text-neutral-900">
                                {formatDayName(daySchedule.day)}
                              </h3>
                              {isEditing && (
                                <Switch
                                  checked={daySchedule.isActive}
                                  onCheckedChange={() => toggleDayActive(dayIndex)}
                                />
                              )}
                              {!isEditing && (
                                <Badge variant={daySchedule.isActive ? "default" : "secondary"}>
                                  {daySchedule.isActive ? "Available" : "Unavailable"}
                                </Badge>
                              )}
                            </div>
                            {isEditing && daySchedule.isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addTimeSlot(dayIndex)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Time Slot
                              </Button>
                            )}
                          </div>

                          {daySchedule.isActive && (
                            <div className="space-y-3">
                              {daySchedule.slots.map((slot, slotIndex) => (
                                <div key={slotIndex} className="flex items-center space-x-3">
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-neutral-400" />
                                    {isEditing ? (
                                      <>
                                        <Input
                                          type="time"
                                          value={slot.start}
                                          onChange={(e) => updateTimeSlot(dayIndex, slotIndex, "start", e.target.value)}
                                          className="w-32"
                                        />
                                        <span className="text-neutral-500">to</span>
                                        <Input
                                          type="time"
                                          value={slot.end}
                                          onChange={(e) => updateTimeSlot(dayIndex, slotIndex, "end", e.target.value)}
                                          className="w-32"
                                        />
                                      </>
                                    ) : (
                                      <span className="text-neutral-700">
                                        {formatTime(slot.start)} - {formatTime(slot.end)}
                                      </span>
                                    )}
                                  </div>
                                  {isEditing && daySchedule.slots.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {!daySchedule.isActive && (
                            <div className="text-center py-8 text-neutral-500">
                              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>Not available on {formatDayName(daySchedule.day)}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="blocked" className="mt-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Block Specific Dates</CardTitle>
                      <CardDescription>
                        Mark dates when you're unavailable for bookings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="blocked-date">Date</Label>
                            <Input
                              id="blocked-date"
                              type="date"
                              value={newBlockedDate}
                              onChange={(e) => setNewBlockedDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                          <div>
                            <Label htmlFor="blocked-reason">Reason</Label>
                            <Input
                              id="blocked-reason"
                              placeholder="e.g., Personal appointment"
                              value={newBlockedReason}
                              onChange={(e) => setNewBlockedReason(e.target.value)}
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              onClick={addBlockedDate}
                              disabled={!newBlockedDate || !newBlockedReason}
                              className="w-full"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Block Date
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Blocked Dates</CardTitle>
                      <CardDescription>
                        Dates when you're unavailable for new bookings
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {blockedDates.length === 0 ? (
                          <div className="text-center py-8 text-neutral-500">
                            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No blocked dates</p>
                          </div>
                        ) : (
                          blockedDates.map((blockedDate) => (
                            <div
                              key={blockedDate.id}
                              className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <AlertCircle className="h-5 w-5 text-red-600" />
                                <div>
                                  <p className="font-medium text-red-900">
                                    {new Date(blockedDate.date).toLocaleDateString()}
                                  </p>
                                  <p className="text-sm text-red-700">
                                    {blockedDate.reason}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeBlockedDate(blockedDate.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Booking Settings</CardTitle>
                      <CardDescription>
                        Configure how clients can book your services
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label htmlFor="advance-booking">Advance Booking</Label>
                            <Select defaultValue="3-days">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="same-day">Same Day</SelectItem>
                                <SelectItem value="1-day">1 Day Ahead</SelectItem>
                                <SelectItem value="3-days">3 Days Ahead</SelectItem>
                                <SelectItem value="1-week">1 Week Ahead</SelectItem>
                                <SelectItem value="2-weeks">2 Weeks Ahead</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-sm text-neutral-600 mt-1">
                              How far in advance clients can book
                            </p>
                          </div>

                          <div>
                            <Label htmlFor="booking-window">Booking Window</Label>
                            <Select defaultValue="60-days">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="30-days">30 Days</SelectItem>
                                <SelectItem value="60-days">60 Days</SelectItem>
                                <SelectItem value="90-days">90 Days</SelectItem>
                                <SelectItem value="6-months">6 Months</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-sm text-neutral-600 mt-1">
                              How far into the future clients can book
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="instant-booking">Instant Booking</Label>
                              <p className="text-sm text-neutral-600">
                                Allow clients to book without approval
                              </p>
                            </div>
                            <Switch id="instant-booking" />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="weekend-booking">Weekend Bookings</Label>
                              <p className="text-sm text-neutral-600">
                                Accept bookings on weekends
                              </p>
                            </div>
                            <Switch id="weekend-booking" defaultChecked />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label htmlFor="auto-decline">Auto-decline Past Bookings</Label>
                              <p className="text-sm text-neutral-600">
                                Automatically decline bookings for past dates
                              </p>
                            </div>
                            <Switch id="auto-decline" defaultChecked />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                      <CardDescription>
                        Common schedule operations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button variant="outline" className="h-auto p-4">
                          <div className="text-left">
                            <div className="font-medium mb-1">Copy Last Week's Schedule</div>
                            <div className="text-sm text-neutral-600">
                              Apply previous week's availability
                            </div>
                          </div>
                        </Button>

                        <Button variant="outline" className="h-auto p-4">
                          <div className="text-left">
                            <div className="font-medium mb-1">Set Holiday Schedule</div>
                            <div className="text-sm text-neutral-600">
                              Apply reduced hours for holidays
                            </div>
                          </div>
                        </Button>

                        <Button variant="outline" className="h-auto p-4">
                          <div className="text-left">
                            <div className="font-medium mb-1">Reset to Default</div>
                            <div className="text-sm text-neutral-600">
                              Restore original schedule settings
                            </div>
                          </div>
                        </Button>

                        <Button variant="outline" className="h-auto p-4">
                          <div className="text-left">
                            <div className="font-medium mb-1">Bulk Block Dates</div>
                            <div className="text-sm text-neutral-600">
                              Block multiple dates at once
                            </div>
                          </div>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
} 