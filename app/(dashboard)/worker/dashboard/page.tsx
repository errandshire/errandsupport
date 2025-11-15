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
  AlertCircle,
  User,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
// import { workerDashboardService } from "@/lib/worker-dashboard-service";
import type { WorkerStats, ProcessedBooking } from "@/lib/worker-dashboard-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Lazy load heavy components
const WorkerDashboardSkeleton = React.lazy(() => 
  import("@/components/worker/dashboard-skeleton").then(module => ({ 
    default: module.WorkerDashboardSkeleton 
  }))
);
const BookingDetailModal = React.lazy(() => 
  import("@/components/worker/booking-detail-modal").then(module => ({ 
    default: module.BookingDetailModal 
  }))
);
const MessageModal = React.lazy(() =>
  import("@/components/marketplace/message-modal").then(module => ({
    default: module.MessageModal
  }))
);

// Memoized components for better performance
const StatsCard = React.memo(({ 
  icon: Icon,
  label,
  value,
  change,
  bgColor,
  color
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  change?: string;
  bgColor: string;
  color: string;
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-lg", bgColor)}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-neutral-600">{label}</p>
        <h4 className="text-2xl font-bold text-neutral-900 mt-1">{value}</h4>
        {change && <p className="text-sm text-neutral-500 mt-1">{change}</p>}
      </div>
    </CardContent>
  </Card>
));

const BookingCard = React.memo(({ 
  booking,
  isAvailable,
  onView,
  onAccept,
  onMessage,
  isAccepting
}: {
  booking: ProcessedBooking;
  isAvailable?: boolean;
  onView: (booking: ProcessedBooking) => void;
  onAccept?: (booking: ProcessedBooking) => void;
  onMessage: (booking: ProcessedBooking) => void;
  isAccepting?: boolean;
}) => {
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
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const locationAddress = (booking.location && (booking.location as any).address) || 'Location TBD';

  return (
    <div 
      className="flex items-center justify-between p-4 border rounded-lg hover:border-primary-300 transition-colors cursor-pointer"
      onClick={() => onView(booking)}
    >
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
          <Calendar className="h-6 w-6 text-primary-600" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{booking.serviceTitle}</h4>
          <p className="text-sm text-gray-600">by {booking.clientName}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-32">{locationAddress}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{booking.scheduledDate} {booking.scheduledTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              <span>₦{booking.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMessage(booking)}
          className="h-8 px-2 sm:px-3"
        >
          <MessageCircle className="h-3 w-3 sm:mr-1" />
          <span className="hidden sm:inline">Message</span>
        </Button>
        {isAvailable ? (
          <Button
            size="sm"
            onClick={() => onAccept?.(booking)}
            disabled={isAccepting}
            className="h-8 px-2 sm:px-3"
          >
            {isAccepting ? (
              <Loader2 className="h-3 w-3 animate-spin sm:mr-1" />
            ) : (
              <CheckCircle className="h-3 w-3 sm:mr-1" />
            )}
            <span className="hidden sm:inline">Accept</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(booking)}
            className="h-8 px-2 sm:px-3"
          >
            <Eye className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">View</span>
          </Button>
        )}
      </div>
    </div>
  );
});

export default function WorkerDashboard() {
  const { user } = useAuth();
  
  // State management
  const [stats, setStats] = React.useState<WorkerStats | null>(null);
  const [availableBookings, setAvailableBookings] = React.useState<ProcessedBooking[]>([]);
  const [acceptedBookings, setAcceptedBookings] = React.useState<ProcessedBooking[]>([]);
  const [balance, setBalance] = React.useState<any>(null);
  const [escrowTransactions, setEscrowTransactions] = React.useState<any[]>([]);
  const [isAvailable, setIsAvailable] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [acceptingBookingId, setAcceptingBookingId] = React.useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = React.useState<any | null>(null);
  const [showBookingDetail, setShowBookingDetail] = React.useState(false);
  const [showMessageModal, setShowMessageModal] = React.useState(false);
  const [messageRecipient, setMessageRecipient] = React.useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  const formatNaira = (n: number) => `₦${(n || 0).toLocaleString()}`;

  // Load dashboard data
  const loadDashboardData = React.useCallback(async (force = false) => {
    if (!user) return;
    
    try {
      console.log('📊 Loading dashboard data...', { force, userId: user.$id });
      
      if (force) {
        setIsRefreshing(true);
        console.log('🗑️ Cleared cache for force refresh');
      } else {
        setIsLoading(true);
      }

      const { workerDashboardService } = await import('@/lib/worker-dashboard-service');
      const { stats, bookings, balance } = await workerDashboardService.getDashboardData(user.$id);
      
      console.log('📋 Dashboard data loaded:', {
        availableCount: bookings.availableBookings.length,
        acceptedCount: bookings.acceptedBookings.length,
        availableBookings: bookings.availableBookings.map(b => ({ id: b.$id, status: b.status })),
        acceptedBookings: bookings.acceptedBookings.map(b => ({ id: b.$id, status: b.status }))
      });
      
      setStats(stats);
      setAvailableBookings(bookings.availableBookings);
      setAcceptedBookings(bookings.acceptedBookings);
      setBalance(balance.balance);
      setEscrowTransactions(balance.escrowTransactions);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  // Initial load
  React.useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Prefetch data on mount
  React.useEffect(() => {
    if (user) {
      // workerDashboardService.prefetchData(user.$id);
    }
  }, [user]);

  // Handle refresh
  const handleRefresh = React.useCallback(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  // Handle availability toggle
  const handleAvailabilityToggle = async (newValue: boolean) => {
    try {
      setIsUpdating(true);
      setIsAvailable(newValue);
      toast.success(newValue ? "You are now available for work" : "You are now marked as unavailable");
    } catch (error) {
      console.error('Error updating availability:', error);
      setIsAvailable(!newValue); // Revert on error
      toast.error("Failed to update availability status");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle booking actions
  const handleViewBooking = React.useCallback((booking: ProcessedBooking) => {
    console.log('🔍 handleViewBooking called with:', booking);
    
    const locationAddress = (booking.location && (booking.location as any).address) || '';

    const flattenedBooking = {
      $id: booking.$id,
      id: booking.$id,
      clientId: '',
      client: '',
      workerId: user?.$id || '',
      title: booking.serviceTitle,
      service: booking.serviceTitle,
      description: '',
      locationAddress,
      location: locationAddress,
      scheduledDate: booking.scheduledDate,
      date: booking.scheduledDate,
      estimatedDuration: booking.duration,
      duration: booking.duration,
      budgetAmount: booking.totalAmount,
      price: booking.totalAmount,
      budgetCurrency: 'NGN',
      budgetIsHourly: false,
      urgency: '',
      status: booking.status,
      paymentStatus: 'paid',
      requirements: [],
      attachments: [],
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      acceptedAt: undefined,
      startedAt: undefined,
      completedAt: undefined,
      clientConfirmedAt: undefined,
      clientRating: undefined,
      clientReview: undefined,
      clientTip: undefined,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail
    };
    
    console.log('📋 Transformed booking for modal:', flattenedBooking);
    
    setSelectedBooking(flattenedBooking);
    setShowBookingDetail(true);
    
    console.log('✅ Modal should now be open');
  }, [user]);

  const handleAcceptBooking = React.useCallback(async (booking: ProcessedBooking) => {
    if (!user) return;

    try {
      console.log('🚀 Starting accept booking process:', { bookingId: booking.$id, userId: user.$id });
      setAcceptingBookingId(booking.$id);
      const { BookingActionService } = await import('@/lib/booking-action-service');
      const result = await BookingActionService.acceptBooking({
        bookingId: booking.$id,
        userId: user.$id,
        userRole: 'worker',
        action: 'accept'
      });
      console.log('📝 Accept booking result:', result);
      if (result.success) {
        toast.success(result.message);
        console.log('🔄 Refreshing dashboard data after successful accept...');
        await loadDashboardData(true);
        console.log('✅ Dashboard data refresh completed');
      } else {
        toast.error(result.message);
      }
      
    } catch (error) {
      console.error('Error accepting booking:', error);
      toast.error("Failed to accept booking");
    } finally {
      setAcceptingBookingId(null);
    }
  }, [user, loadDashboardData]);

  const handleMessageClient = React.useCallback((booking: ProcessedBooking) => {
    setMessageRecipient({
      id: booking.clientId, // Use clientId, not booking ID
      name: booking.clientName,
      email: booking.clientEmail || ''
    });
    setShowMessageModal(true);
  }, []);

  // Show loading state
  if (isLoading && !stats) {
    return (
      <React.Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      }>
        <WorkerDashboardSkeleton />
      </React.Suspense>
    );
  }

  return (
    <>
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
              Welcome back, {user?.name}! 👋
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
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
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
          <Card className="border-green-200 bg-green-50">
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
        <StatsCard
          icon={DollarSign}
          label="Total Earnings"
          value={`₦${stats?.totalEarnings.toLocaleString() || '0'}`}
          change={`₦${stats?.monthlyEarnings.toLocaleString()} this month`}
          bgColor="bg-blue-100"
          color="text-blue-600"
        />
        <StatsCard
          icon={CheckCircle}
          label="Completed Jobs"
          value={stats?.completedJobs || 0}
          change={`${stats?.acceptanceRate}% acceptance rate`}
          bgColor="bg-green-100"
          color="text-green-600"
        />
        <StatsCard
          icon={Star}
          label="Average Rating"
          value={stats?.avgRating || 'New'}
          change={`${stats?.totalReviews} reviews`}
          bgColor="bg-yellow-100"
          color="text-yellow-600"
        />
        <StatsCard
          icon={Clock}
          label="Response Time"
          value={`${stats?.responseTime} min`}
          change={`${stats?.activeBookings} active bookings`}
          bgColor="bg-purple-100"
          color="text-purple-600"
        />
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
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium mb-2">No available bookings</h3>
                        <p>Check back later for new opportunities</p>
                      </div>
                    ) : (
                      availableBookings.map(booking => (
                        <BookingCard
                          key={booking.$id}
                          booking={booking}
                          isAvailable={true}
                          onView={handleViewBooking}
                          onAccept={handleAcceptBooking}
                          onMessage={handleMessageClient}
                          isAccepting={acceptingBookingId === booking.$id}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="accepted">
                  <div className="space-y-4">
                    {acceptedBookings.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium mb-2">No accepted bookings</h3>
                        <p>Start by accepting available bookings</p>
                      </div>
                    ) : (
                      acceptedBookings.map(booking => (
                        <BookingCard
                          key={booking.$id}
                          booking={booking}
                          onView={handleViewBooking}
                          onMessage={handleMessageClient}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions & Info */}
        <div className="space-y-6">
          {/* Balance Card */}
          <React.Suspense fallback={
            <Card>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                  <div className="h-6 bg-gray-200 rounded w-full" />
                  <div className="h-10 bg-gray-200 rounded w-3/4" />
                </div>
              </CardContent>
            </Card>
          }>
            
          </React.Suspense>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🚀 Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/worker/wallet">
                  <DollarSign className="h-4 w-4 mr-2" />
                  View Wallet
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/worker/profile">
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/worker/availability">
                  <Clock className="h-4 w-4 mr-2" />
                  Set Availability
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Booking Detail Modal */}
      <React.Suspense fallback={null}>
        <BookingDetailModal
          isOpen={showBookingDetail}
          onClose={() => setShowBookingDetail(false)}
          booking={selectedBooking}
          onOpenMessage={handleMessageClient}
        />
      </React.Suspense>

      {/* Message Modal */}
      <React.Suspense fallback={null}>
        <MessageModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          clientId={messageRecipient?.id}
          clientName={messageRecipient?.name}
        />
      </React.Suspense>
    </>
  );
} 