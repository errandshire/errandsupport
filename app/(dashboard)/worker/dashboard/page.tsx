"use client";

import * as React from "react";
import Link from "next/link";
import { 
  DollarSign, 
  Calendar, 
  Star, 
  Clock, 
  Eye,
  CheckCircle,
  MessageCircle,
  MapPin,
  Settings,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useWorkerStore } from "@/store/worker-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingDetailModal } from "@/components/worker/booking-detail-modal";
import { MessageModal } from "@/components/marketplace/message-modal";

const ICON_MAP: Record<string, any> = {
  DollarSign,
  CheckCircle,
  Star,
  Clock
};

export default function WorkerDashboard() {
  const { user } = useAuth();
  const { 
    workerProfile,
    isAvailable,
    stats,
    availableBookings,
    acceptedBookings,
    workerExtras,
    updateAvailability,
    acceptBooking
  } = useWorkerStore();
  
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [acceptingBookingId, setAcceptingBookingId] = React.useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = React.useState<any>(null);
  const [showBookingDetail, setShowBookingDetail] = React.useState(false);
  const [showMessageModal, setShowMessageModal] = React.useState(false);
  const [messageRecipient, setMessageRecipient] = React.useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  // Handle availability toggle
  const handleAvailabilityToggle = async (newValue: boolean) => {
    try {
      setIsUpdating(true);
      await updateAvailability(newValue);
      toast.success(newValue ? "You are now available for work" : "You are now marked as unavailable");
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error("Failed to update availability status");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle booking acceptance
  const handleAcceptBooking = async (bookingId: string) => {
    try {
      setAcceptingBookingId(bookingId);
      await acceptBooking(bookingId);
      toast.success("Booking accepted successfully!");
    } catch (error) {
      console.error('Error accepting booking:', error);
      toast.error("Failed to accept booking");
    } finally {
      setAcceptingBookingId(null);
    }
  };

  // Handle booking detail view
  const handleViewBookingDetail = (booking: any) => {
    setSelectedBooking(booking);
    setShowBookingDetail(true);
  };

  // Handle opening message modal
  const handleOpenMessage = (clientId: string, clientName: string, clientEmail?: string) => {
    setMessageRecipient({
      id: clientId,
      name: clientName,
      email: clientEmail || ''
    });
    setShowMessageModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "accepted":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case "accepted":
        return "Accepted";
      case "pending":
        return "Pending";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      default:
        return status || "New";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case "high":
        return "text-red-500";
      case "medium":
        return "text-orange-500";
      case "low":
        return "text-green-500";
      default:
        return "text-neutral-500";
    }
  };

  const renderBookingCard = (booking: any, showAcceptButton: boolean = false) => (
    <div
      key={booking.id}
      className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 hover:border-primary-300 transition-colors cursor-pointer"
      onClick={() => handleViewBookingDetail(booking)}
    >
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
          <Calendar className="h-6 w-6 text-primary-600" />
        </div>
        <div>
          <h4 className="font-medium text-neutral-900">{booking.service}</h4>
          <p className="text-sm text-neutral-600">for {booking.client}</p>
          <div className="flex items-center space-x-2 mt-1">
            <Clock className="h-3 w-3 text-neutral-400" />
            <span className="text-xs text-neutral-500">{booking.date}</span>
            <MapPin className="h-3 w-3 text-neutral-400 ml-2" />
            <span className="text-xs text-neutral-500">{booking.location}</span>
            <AlertCircle className={cn("h-3 w-3 ml-2", getUrgencyColor(booking.urgency))} />
            <span className={cn("text-xs capitalize", getUrgencyColor(booking.urgency))}>
              {booking.urgency}
            </span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <Badge className={getStatusColor(booking.status)}>
          {getStatusText(booking.status)}
        </Badge>
        <p className="text-sm font-medium text-neutral-900 mt-1">{booking.price}</p>
        <p className="text-xs text-neutral-500 mt-1">{booking.duration}</p>
        <div className="flex items-center space-x-2 mt-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleViewBookingDetail(booking);
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          {!showAcceptButton && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenMessage(booking.clientId, booking.client);
              }}
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              Message
            </Button>
          )}
          {showAcceptButton && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleAcceptBooking(booking.id);
              }}
              disabled={acceptingBookingId === booking.id}
            >
              {acceptingBookingId === booking.id ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Accepting...
                </>
              ) : (
                'Accept Job'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
              Welcome back, {workerProfile?.displayName || user?.name}! 👋
            </h1>
            <p className="text-neutral-600">
              Here's what's happening with your services today.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-neutral-700">Available</span>
              <Switch
                checked={isAvailable}
                onCheckedChange={handleAvailabilityToggle}
                disabled={isUpdating}
              />
              {isUpdating && (
                <span className="text-sm text-neutral-500 animate-pulse">
                  Updating...
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/worker/profile">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Availability Status */}
      {isAvailable && (
        <div className="mb-6">
          <Card variant="outlined" className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-green-800 font-medium">
                  You're available for new bookings
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats?.map((stat, index) => {
          const Icon = ICON_MAP[stat.icon];
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      stat.bgColor
                    )}
                  >
                    <Icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-neutral-600">
                    {stat.label}
                  </p>
                  <h4 className="text-2xl font-bold text-neutral-900 mt-1">
                    {stat.value}
                  </h4>
                  <p className="text-sm text-neutral-500 mt-1">
                    {stat.change}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bookings Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Bookings</CardTitle>
              <CardDescription>Manage your service bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="available" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="available">
                    Available ({availableBookings.length})
                  </TabsTrigger>
                  <TabsTrigger value="accepted">
                    Accepted ({acceptedBookings.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="available">
                  <div className="space-y-4">
                    {availableBookings.length === 0 ? (
                      <p className="text-neutral-600 text-center py-4">
                        No available bookings at the moment
                      </p>
                    ) : (
                      availableBookings.map(booking => renderBookingCard(booking, true))
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="accepted">
                  <div className="space-y-4">
                    {acceptedBookings.length === 0 ? (
                      <p className="text-neutral-600 text-center py-4">
                        No accepted bookings yet
                      </p>
                    ) : (
                      acceptedBookings.map(booking => renderBookingCard(booking))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Quick Stats Card */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Profile Views</span>
                <Badge variant="outline">
                  <Eye className="h-3 w-3 mr-1" />
                  {workerExtras.profileViews || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Active Chats</span>
                <Badge variant="outline">
                  <MessageCircle className="h-3 w-3 mr-1" />
                  {workerExtras.activeChats || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Completion Rate</span>
                <Badge variant="outline">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {workerExtras.completionRate || 0}%
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card variant="outlined">
            <CardHeader>
              <CardTitle className="text-lg">💡 Pro Tip</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 mb-3">
                Keep your calendar updated to get more booking requests and maintain a high response rate!
              </p>
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link href="/worker/availability">Update Calendar</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={showBookingDetail}
        onClose={() => setShowBookingDetail(false)}
        booking={selectedBooking}
        onOpenMessage={handleOpenMessage}
      />

      {/* Message Modal */}
      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        worker={null}
        recipientId={messageRecipient?.id}
        recipientName={messageRecipient?.name}
        recipientEmail={messageRecipient?.email}
      />
    </>
  );
} 