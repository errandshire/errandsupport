"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  XCircle
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

export default function ClientBookingsPage() {
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
          setShowBookingModal(true);
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
    setShowBookingModal(true);
  };

  const handleMessageWorker = (booking: ProcessedBooking) => {
    if (booking.worker) {
      router.push(`/client/messages?worker=${booking.worker.id}`);
    } else {
      toast.error("Worker information not available");
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
    <>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
            My Bookings
          </h1>
          <p className="text-neutral-600">
            View and manage your service bookings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchBookings}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" asChild>
            <Link href="/workers">
              <Calendar className="h-4 w-4 mr-2" />
              Book Service
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="confirmed">Pending</TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
            <TabsTrigger value="in_progress">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Bookings List */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-20" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {bookings.length === 0 ? 'No bookings yet' : 'No bookings match your filters'}
              </h3>
              <p className="text-gray-600 mb-6">
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
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className={cn(
                    "flex items-center justify-between p-4 border rounded-lg hover:border-primary-300 transition-colors cursor-pointer",
                    highlightBookingId === booking.id && "border-primary-500 bg-primary-50"
                  )}
                  onClick={() => handleBookingClick(booking)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-8 w-8 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">{booking.title}</h3>
                        <Badge className={cn("text-xs", getStatusColor(booking.status))}>
                          {getStatusText(booking.status)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-1">
                        {booking.worker && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{booking.worker.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-32">{booking.locationAddress || 'Location TBD'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(booking.scheduledDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Created {booking.timeAgo}</span>
                        <span>₦{booking.budgetAmount.toLocaleString()}</span>
                        <span>{booking.estimatedDuration}h duration</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {booking.worker && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMessageWorker(booking);
                        }}
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        Message
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{selectedBooking.title}</h2>
                  <Badge className={cn("text-sm", getStatusColor(selectedBooking.status))}>
                    {getStatusText(selectedBooking.status)}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">₦{selectedBooking.budgetAmount.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">{selectedBooking.budgetCurrency}</p>
                </div>
              </div>

              {/* Worker Info */}
              {selectedBooking.worker && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Service Provider</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={selectedBooking.worker.avatar} />
                        <AvatarFallback>
                          {selectedBooking.worker.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedBooking.worker.name}</p>
                        <p className="text-sm text-gray-600">{selectedBooking.worker.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Booking Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Service Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">Description</h4>
                    <p className="text-gray-600">{selectedBooking.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-1">Scheduled Date</h4>
                      <p className="text-gray-600">{new Date(selectedBooking.scheduledDate).toLocaleString()}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Duration</h4>
                      <p className="text-gray-600">{selectedBooking.estimatedDuration} hour(s)</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1">Location</h4>
                    <p className="text-gray-600">{selectedBooking.locationAddress || 'To be determined'}</p>
                  </div>
                  
                  {selectedBooking.requirements && selectedBooking.requirements.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-1">Requirements</h4>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {selectedBooking.requirements.map((req, index) => (
                          <li key={index}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created</span>
                      <span>{new Date(selectedBooking.createdAt).toLocaleString()}</span>
                    </div>
                    {selectedBooking.acceptedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Accepted</span>
                        <span>{new Date(selectedBooking.acceptedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {selectedBooking.completedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed</span>
                        <span>{new Date(selectedBooking.completedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                {selectedBooking.worker && (
                  <Button 
                    variant="outline" 
                    onClick={() => handleMessageWorker(selectedBooking)}
                    className="flex-1"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message Worker
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 