"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  Star,
  MessageCircle,
  Eye,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  BookOpen,
  Ban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { databases, COLLECTIONS } from "@/lib/appwrite";
import { Query } from "appwrite";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { BookingConfirmationModal } from "@/components/client/booking-confirmation-modal";
import { MessageModal } from "@/components/marketplace/message-modal";

interface ProcessedBooking {
  $id: string;
  id: string;
  title: string;
  description: string;
  worker?: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  scheduledDate: string;
  estimatedDuration: number;
  budgetAmount: number;
  budgetCurrency: string;
  status: string;
  urgency: string;
  locationAddress: string;
  requirements?: string[];
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  clientRating?: number;
  clientReview?: string;
  timeAgo: string;
}

function ClientBookingsContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightBookingId = searchParams.get('id');
  
  const [bookings, setBookings] = React.useState<ProcessedBooking[]>([]);
  const [filteredBookings, setFilteredBookings] = React.useState<ProcessedBooking[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selectedBooking, setSelectedBooking] = React.useState<ProcessedBooking | null>(null);
  const [showBookingModal, setShowBookingModal] = React.useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = React.useState(false);
  const [showMessageModal, setShowMessageModal] = React.useState(false);
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [bookingToCancel, setBookingToCancel] = React.useState<ProcessedBooking | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [messageRecipient, setMessageRecipient] = React.useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  // Handle authentication
  React.useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/client/bookings");
      return;
    }

    if (user.role !== "client") {
      router.replace(`/${user.role}`);
      return;
    }
  }, [loading, isAuthenticated, user, router]);

  // Fetch bookings
  const fetchBookings = React.useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const bookingsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        [
          Query.equal('clientId', user.$id),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ]
      );

      // Process bookings and fetch worker info
      const processedBookings = await Promise.all(
        bookingsResponse.documents.map(async (booking: any) => {
          let workerInfo = null;

          try {
            if (booking.workerId) {
              const worker = await databases.getDocument(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                COLLECTIONS.USERS,
                booking.workerId
              );
              workerInfo = {
                id: worker.$id,
                name: worker.name || worker.displayName || 'Worker',
                avatar: worker.avatar || worker.profileImage,
                email: worker.email
              };
            }
          } catch (error) {
            console.warn('Could not fetch worker info:', error);
          }

          return {
            $id: booking.$id,
            id: booking.$id,
            title: booking.title || 'Service Booking',
            description: booking.description || 'No description provided',
            worker: workerInfo,
            scheduledDate: booking.scheduledDate || booking.$createdAt,
            estimatedDuration: booking.estimatedDuration || 1,
            budgetAmount: booking.budgetAmount || 0,
            budgetCurrency: booking.budgetCurrency || 'NGN',
            status: booking.status || 'pending',
            urgency: booking.urgency || 'medium',
            locationAddress: booking.locationAddress || booking.location || '',
            requirements: booking.requirements || [],
            createdAt: booking.$createdAt,
            acceptedAt: booking.acceptedAt,
            completedAt: booking.completedAt,
            clientRating: booking.clientRating,
            clientReview: booking.clientReview,
            timeAgo: getTimeAgo(booking.$createdAt)
          } as ProcessedBooking;
        })
      );

      setBookings(processedBookings);
      setFilteredBookings(processedBookings);

      // Highlight specific booking if ID in URL
      if (highlightBookingId) {
        const booking = processedBookings.find(b => b.id === highlightBookingId);
        if (booking) {
          setSelectedBooking(booking);
          // Show confirmation modal for bookings that need client confirmation
          if (booking.status === 'worker_completed') {
            setShowConfirmationModal(true);
          } else {
            setShowBookingModal(true);
          }
        }
      }

    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  }, [user, highlightBookingId]);

  // Load bookings
  React.useEffect(() => {
    if (!loading && isAuthenticated && user) {
      fetchBookings();
    }
  }, [loading, isAuthenticated, user, fetchBookings]);

  // Filter bookings
  React.useEffect(() => {
    let filtered = bookings;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(booking =>
        booking.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.worker?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, statusFilter, searchQuery]);

  // Helper functions
  const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) {
      return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
    } else if (hours < 24) {
      return hours === 1 ? '1h ago' : `${hours}h ago`;
    } else {
      return days === 1 ? '1d ago' : `${days}d ago`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "accepted":
        return "bg-purple-100 text-purple-800";
      case "confirmed":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "worker_completed":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "Payment Confirmed";
      case "accepted":
        return "Accepted by Worker";
      case "in_progress":
        return "In Progress";
      case "worker_completed":
        return "Awaiting Your Confirmation";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const handleBookingClick = (booking: ProcessedBooking) => {
    setSelectedBooking(booking);
    // Show confirmation modal for bookings that need client confirmation
    if (booking.status === 'worker_completed') {
      setShowConfirmationModal(true);
    } else {
      setShowBookingModal(true);
    }
  };

  const handleMessageWorker = (booking: ProcessedBooking) => {
    if (booking.worker) {
      setMessageRecipient({
        id: booking.worker.id,
        name: booking.worker.name,
        email: booking.worker.email || ''
      });
      setShowMessageModal(true);
    } else {
      toast.error("Worker information not available");
    }
  };

  const handleCancelBooking = (booking: ProcessedBooking) => {
    // Only allow cancellation if booking hasn't been accepted by worker
    if (booking.status === 'accepted' || booking.status === 'in_progress' || booking.status === 'completed') {
      toast.error("Cannot cancel booking that has been accepted or is in progress");
      return;
    }

    setBookingToCancel(booking);
    setShowCancelModal(true);
  };

  const confirmCancelBooking = async () => {
    if (!user || !bookingToCancel) return;

    try {
      setIsCancelling(true);
      const { BookingCompletionService } = await import('@/lib/booking-completion.service');

      const result = await BookingCompletionService.cancelBooking({
        bookingId: bookingToCancel.$id,
        clientId: user.$id,
        reason: 'Cancelled by client'
      });

      if (result.success) {
        toast.success(result.message);
        setShowCancelModal(false);
        setBookingToCancel(null);
        fetchBookings(); // Refresh the bookings list
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  // Show loading state
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  // Calculate stats
  const stats = {
    total: bookings.length,
    completed: bookings.filter(b => b.status === 'completed').length,
    active: bookings.filter(b => ['confirmed', 'accepted', 'in_progress'].includes(b.status)).length,
    pending: bookings.filter(b => b.status === 'confirmed').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900 mb-2">
            My Bookings
          </h1>
          <p className="text-neutral-600 text-sm sm:text-base">
            View and manage your service bookings
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button variant="outline" size="sm" onClick={fetchBookings} className="h-9">
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button size="sm" className="h-9" asChild>
            <Link href="/workers">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Book Service</span>
              <span className="sm:hidden">Book</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Total</p>
              <p className="text-lg sm:text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Completed</p>
              <p className="text-lg sm:text-2xl font-bold">{stats.completed}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Active</p>
              <p className="text-lg sm:text-2xl font-bold">{stats.active}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 flex-shrink-0" />
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 truncate">Pending</p>
              <p className="text-lg sm:text-2xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 sm:h-12"
          />
        </div>
        <div className="overflow-x-auto">
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-10 sm:h-11">
              <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
              <TabsTrigger value="confirmed" className="text-xs sm:text-sm">Pending</TabsTrigger>
              <TabsTrigger value="accepted" className="text-xs sm:text-sm">Accepted</TabsTrigger>
              <TabsTrigger value="in_progress" className="text-xs sm:text-sm">Active</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs sm:text-sm">Done</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Bookings List */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          {isLoading ? (
            <div className="space-y-3 sm:space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 border rounded-lg animate-pulse">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="h-4 bg-gray-200 rounded w-full sm:w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-2/3 sm:w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/2 sm:w-1/4" />
                  </div>
                  <div className="space-y-2 flex-shrink-0">
                    <div className="h-6 bg-gray-200 rounded w-16 sm:w-20" />
                    <div className="h-4 bg-gray-200 rounded w-12 sm:w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                {bookings.length === 0 ? 'No bookings yet' : 'No bookings match your filters'}
              </h3>
              <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                {bookings.length === 0 
                  ? 'Start by booking your first service'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
              {bookings.length === 0 && (
                <Button asChild>
                  <Link href="/workers">Find Workers</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className={cn(
                    "flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:border-primary-300 transition-colors cursor-pointer",
                    highlightBookingId === booking.id && "border-primary-500 bg-primary-50"
                  )}
                  onClick={() => handleBookingClick(booking)}
                >
                  <div className="flex items-start space-x-3 sm:space-x-4 w-full sm:w-auto">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{booking.title}</h3>
                        <Badge className={cn("text-xs self-start", getStatusColor(booking.status))}>
                          {getStatusText(booking.status)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-2">
                        {booking.worker && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{booking.worker.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{booking.locationAddress || 'Location TBD'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{new Date(booking.scheduledDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500">
                        <span>Created {booking.timeAgo}</span>
                        <span>₦{booking.budgetAmount.toLocaleString()}</span>
                        <span>{booking.estimatedDuration}h duration</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto justify-end">
                    {/* Special action button for bookings needing confirmation */}
                    {booking.status === 'worker_completed' && (
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-orange-500 hover:bg-orange-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(booking);
                          setShowConfirmationModal(true);
                        }}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Confirm Work</span>
                        <span className="sm:hidden">Confirm</span>
                      </Button>
                    )}
                    
                    {booking.worker && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMessageWorker(booking);
                        }}
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">Message</span>
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleBookingClick(booking)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {booking.worker && (
                          <DropdownMenuItem onClick={() => handleMessageWorker(booking)}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Message Worker
                          </DropdownMenuItem>
                        )}
                        {/* Show cancel option only if booking hasn't been accepted yet */}
                        {booking.status !== 'accepted' &&
                         booking.status !== 'in_progress' &&
                         booking.status !== 'completed' &&
                         booking.status !== 'cancelled' &&
                         booking.status !== 'worker_completed' && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelBooking(booking);
                            }}
                            className="text-red-600"
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Cancel Booking
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking Details Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Booking Details</DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4 sm:space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold mb-2 break-words">{selectedBooking.title}</h2>
                  <Badge className={cn("text-xs sm:text-sm", getStatusColor(selectedBooking.status))}>
                    {getStatusText(selectedBooking.status)}
                  </Badge>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xl sm:text-2xl font-bold">₦{selectedBooking.budgetAmount.toLocaleString()}</p>
                  <p className="text-xs sm:text-sm text-gray-600">{selectedBooking.budgetCurrency}</p>
                </div>
              </div>

              {/* Worker Info */}
              {selectedBooking.worker && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm sm:text-base">Service Provider</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                        <AvatarImage src={selectedBooking.worker.avatar} />
                        <AvatarFallback className="text-sm">
                          {selectedBooking.worker.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">{selectedBooking.worker.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{selectedBooking.worker.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Booking Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base">Service Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div>
                    <h4 className="font-medium mb-1 text-sm sm:text-base">Description</h4>
                    <p className="text-gray-600 text-sm sm:text-base break-words">{selectedBooking.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <h4 className="font-medium mb-1 text-sm sm:text-base">Scheduled Date</h4>
                      <p className="text-gray-600 text-sm sm:text-base">{new Date(selectedBooking.scheduledDate).toLocaleString()}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1 text-sm sm:text-base">Duration</h4>
                      <p className="text-gray-600 text-sm sm:text-base">{selectedBooking.estimatedDuration} hour(s)</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1 text-sm sm:text-base">Location</h4>
                    <p className="text-gray-600 text-sm sm:text-base break-words">{selectedBooking.locationAddress || 'To be determined'}</p>
                  </div>
                  
                  {selectedBooking.requirements && selectedBooking.requirements.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-1 text-sm sm:text-base">Requirements</h4>
                      <ul className="list-disc list-inside text-gray-600 space-y-1 text-sm sm:text-base">
                        {selectedBooking.requirements.map((req, index) => (
                          <li key={index} className="break-words">{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base">Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex justify-between text-sm sm:text-base">
                      <span className="text-gray-600">Created</span>
                      <span className="text-right">{new Date(selectedBooking.createdAt).toLocaleString()}</span>
                    </div>
                    {selectedBooking.acceptedAt && (
                      <div className="flex justify-between text-sm sm:text-base">
                        <span className="text-gray-600">Accepted</span>
                        <span className="text-right">{new Date(selectedBooking.acceptedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {selectedBooking.completedAt && (
                      <div className="flex justify-between text-sm sm:text-base">
                        <span className="text-gray-600">Completed</span>
                        <span className="text-right">{new Date(selectedBooking.completedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {selectedBooking.worker && (
                  <Button 
                    variant="outline" 
                    onClick={() => handleMessageWorker(selectedBooking)}
                    className="flex-1 h-11"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message Worker
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 h-11"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Confirmation Modal - for worker_completed bookings */}
      <BookingConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        booking={selectedBooking}
        onRefresh={() => {
          fetchBookings();
          setShowConfirmationModal(false);
        }}
      />

      {/* Message Modal for direct chat with worker */}
      <MessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        worker={null}
        recipientId={messageRecipient?.id}
        recipientName={messageRecipient?.name}
        recipientEmail={messageRecipient?.email}
      />

      {/* Cancel Booking Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Cancel Booking
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to cancel this booking?
            </p>

            {bookingToCancel && (
              <Card className="bg-gray-50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{bookingToCancel.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(bookingToCancel.scheduledDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <p className="text-sm">
                      ₦{bookingToCancel.budgetAmount.toLocaleString()}
                    </p>
                  </div>

                  {bookingToCancel.worker && (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <p className="text-sm">{bookingToCancel.worker.name}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  Your payment will be refunded to your wallet immediately.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelModal(false);
                setBookingToCancel(null);
              }}
              disabled={isCancelling}
              className="w-full sm:flex-1"
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancelBooking}
              disabled={isCancelling}
              className="w-full sm:flex-1"
            >
              {isCancelling ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Yes, Cancel Booking
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ClientBookingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading bookings...</p>
        </div>
      </div>
    }>
      <ClientBookingsContent />
    </Suspense>
  );
} 