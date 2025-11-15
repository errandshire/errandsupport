"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  Eye, 
  MessageCircle,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Star,
  Plus,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WorkerSidebar, SidebarToggle } from "@/components/layout/worker-sidebar";
import { BookingDetailModal } from "@/components/worker/booking-detail-modal";
import { MessageModal } from "@/components/marketplace/message-modal";
import { useAuth } from "@/hooks/use-auth";
import { databases, COLLECTIONS } from "@/lib/appwrite";
import { Query } from "appwrite";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function WorkerJobsPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal states
  const [selectedBooking, setSelectedBooking] = React.useState<any>(null);
  const [messageModal, setMessageModal] = React.useState({
    isOpen: false,
    clientId: '',
    clientName: ''
  });

  // Fetch worker's bookings
  const fetchBookings = React.useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);


      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        [
          Query.equal('workerId', user.$id),
          Query.orderDesc('$createdAt')
        ]
      );


      // Map the bookings to match our flattened structure
      const mappedBookings = response.documents.map(doc => ({
        $id: doc.$id,
        clientId: doc.clientId,
        workerId: doc.workerId,
        title: doc.title || doc.service, // fallback to service if title not present
        description: doc.description,
        locationAddress: doc.locationAddress || doc.location, // fallback to location if locationAddress not present
        scheduledDate: doc.scheduledDate || doc.date, // fallback to date if scheduledDate not present
        estimatedDuration: doc.estimatedDuration || (doc.duration ? parseInt(doc.duration) : 1),
        budgetAmount: doc.budgetAmount || (doc.price ? parseFloat(doc.price.replace('₦', '').replace(',', '')) : 0),
        budgetCurrency: doc.budgetCurrency || 'NGN',
        budgetIsHourly: doc.budgetIsHourly || false,
        urgency: doc.urgency || 'medium',
        status: doc.status,
        paymentStatus: doc.paymentStatus || (doc.status === 'confirmed' ? 'paid' : 'pending'),
        requirements: doc.requirements || [],
        attachments: doc.attachments || [],
        createdAt: doc.createdAt || doc.$createdAt,
        updatedAt: doc.updatedAt || doc.$updatedAt,
        acceptedAt: doc.acceptedAt,
        startedAt: doc.startedAt,
        completedAt: doc.completedAt,
        clientConfirmedAt: doc.clientConfirmedAt
      }));

      setBookings(mappedBookings);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/worker/jobs");
      return;
    }
    
    if (user.role !== "worker") {
      router.replace(`/${user.role}`);
      return;
    }

    fetchBookings();
  }, [loading, isAuthenticated, user, router, fetchBookings]);

  const filteredBookings = React.useMemo(() => {
    return bookings.filter(booking => {
      const matchesSearch = 
        (booking.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (booking.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (booking.locationAddress || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "accepted":
        return "bg-emerald-100 text-emerald-800";
      case "in_progress":
        return "bg-purple-100 text-purple-800";
      case "worker_completed":
        return "bg-orange-100 text-orange-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case "confirmed": return "Payment Confirmed";
      case "accepted": return "Accepted";
      case "in_progress": return "In Progress";
      case "worker_completed": return "Awaiting Client";
      case "completed": return "Completed";
      case "cancelled": return "Cancelled";
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  const bookingCounts = React.useMemo(() => ({
    all: bookings.length,
    confirmed: bookings.filter(b => b.status === "confirmed").length,
    accepted: bookings.filter(b => b.status === "accepted").length,
    in_progress: bookings.filter(b => b.status === "in_progress").length,
    worker_completed: bookings.filter(b => b.status === "worker_completed").length,
    completed: bookings.filter(b => b.status === "completed").length,
  }), [bookings]);

  const handleViewBooking = (booking: any) => {
    setSelectedBooking(booking);
  };

  const handleCloseBookingModal = () => {
    setSelectedBooking(null);
  };

  const handleMessageClient = (booking: any) => {
    setMessageModal({
      isOpen: true,
      clientId: booking.clientId,
      clientName: booking.clientName || 'Client'
    });
  };

  const handleCloseMessageModal = () => {
    setMessageModal({
      isOpen: false,
      clientId: '',
      clientName: ''
    });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex">

        
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
                  My Bookings
                </h1>
                <p className="text-neutral-600">
                  Manage your bookings and track your progress
                </p>
              </div>
              <Button onClick={fetchBookings}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search bookings by title, description, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs ({bookingCounts.all})</SelectItem>
                  <SelectItem value="confirmed">New Bookings ({bookingCounts.confirmed})</SelectItem>
                  <SelectItem value="accepted">Accepted ({bookingCounts.accepted})</SelectItem>
                  <SelectItem value="in_progress">In Progress ({bookingCounts.in_progress})</SelectItem>
                  <SelectItem value="worker_completed">Awaiting Client ({bookingCounts.worker_completed})</SelectItem>
                  <SelectItem value="completed">Completed ({bookingCounts.completed})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Error State */}
            {error && (
              <Card className="mb-6 border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-5 w-5" />
                    <p>{error}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchBookings}
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-neutral-400 mb-4" />
                <p className="text-neutral-600">Loading your bookings...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                    <Calendar className="h-6 w-6 text-neutral-600" />
                  </div>
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">
                    No bookings found
                  </h3>
                  <p className="text-neutral-600 mb-4">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filters'
                      : 'You have no bookings yet. They will appear here when clients book your services.'}
                  </p>
                  {(searchQuery || statusFilter !== 'all') && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBookings.map((booking) => (
                  <Card key={booking.$id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-neutral-900 mb-1">
                            {booking.title || 'Untitled Booking'}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(booking.status)}>
                              {getStatusDisplayName(booking.status)}
                            </Badge>
                            {booking.urgency && (
                              <Badge className={getUrgencyColor(booking.urgency)}>
                                {booking.urgency.charAt(0).toUpperCase() + booking.urgency.slice(1)} Priority
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleViewBooking(booking)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2 text-sm text-neutral-600 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(booking.scheduledDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{booking.estimatedDuration || 1} hour(s)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{booking.locationAddress || 'Location not specified'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span>₦{booking.budgetAmount?.toLocaleString() || '0'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleViewBooking(booking)}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleMessageClient(booking)}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={!!selectedBooking}
        onClose={handleCloseBookingModal}
        booking={selectedBooking}
        onOpenMessage={handleMessageClient}
        onRefresh={fetchBookings}
      />

      {/* Message Modal */}
      <MessageModal
        isOpen={messageModal.isOpen}
        onClose={handleCloseMessageModal}
        clientId={messageModal.clientId}
        clientName={messageModal.clientName}
      />
    </div>
  );
} 