"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Search, 
  Calendar, 
  Plus,
  CheckCircle,
  TrendingUp,
  Clock,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Users,
  MessageCircle,
  Wallet,
  Settings,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { clientDashboardService } from "@/lib/client-dashboard-service";
import type { ClientStats, RecentBooking, QuickAction } from "@/lib/client-dashboard-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Lazy load heavy components
const ClientDashboardSkeleton = React.lazy(() => 
  import("@/components/client/dashboard-skeleton").then(module => ({ 
    default: module.ClientDashboardSkeleton 
  }))
);

// Memoized components for better performance
const StatsCard = React.memo(({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  color = "text-neutral-400"
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  color?: string;
}) => (
  <Card className="p-6">
    <div className={`w-12 h-12 ${color.replace('text-', 'bg-').replace('-400', '-100')} rounded-full flex items-center justify-center mb-4`}>
      <Icon className={`h-6 w-6 ${color}`} />
    </div>
    <h3 className="text-2xl font-semibold mb-1">{value}</h3>
    <p className="text-gray-600 text-sm">{title}</p>
    {trend && <p className="text-green-600 text-sm mt-2">{trend}</p>}
    {description && !trend && <p className="text-gray-600 text-sm mt-2">{description}</p>}
  </Card>
));

const BookingCard = React.memo(({ 
  booking,
  onClick 
}: {
  booking: RecentBooking;
  onClick: (booking: RecentBooking) => void;
}) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "confirmed":
      case "accepted":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl border hover:border-primary-300 transition-colors cursor-pointer"
      onClick={() => onClick(booking)}
    >
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
          <Calendar className="h-6 w-6 text-primary-600" />
        </div>
        <div>
          <h4 className="font-medium">{booking.service}</h4>
          <p className="text-sm text-gray-600">with {booking.worker}</p>
          <div className="flex items-center mt-1">
            <Clock className="h-3 w-3 text-gray-400 mr-1" />
            <span className="text-xs text-gray-500">{booking.timeAgo}</span>
            {booking.rating > 0 && (
              <>
                <Star className="h-3 w-3 text-yellow-400 ml-2 mr-1" />
                <span className="text-xs text-gray-500">{booking.rating}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <Badge className={cn("text-xs", getStatusColor(booking.status))}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('_', ' ')}
        </Badge>
        <p className="text-sm font-medium mt-1">{booking.price}</p>
      </div>
    </div>
  );
});

const QuickActionCard = React.memo(({ 
  action,
  onClick 
}: {
  action: QuickAction;
  onClick: (action: QuickAction) => void;
}) => {
  const getIcon = () => {
    switch (action.icon) {
      case 'workers':
        return <Users className="h-6 w-6 text-white" />;
      case 'bookings':
        return <Calendar className="h-6 w-6 text-white" />;
      case 'messages':
        return <MessageCircle className="h-6 w-6 text-white" />;
      case 'wallet':
        return <Wallet className="h-6 w-6 text-white" />;
      case 'settings':
        return <Settings className="h-6 w-6 text-white" />;
      default:
        return <Calendar className="h-6 w-6 text-white" />;
    }
  };

  return (
    <Button 
      variant="outline" 
      className="w-full justify-start h-auto p-4 text-left"
      onClick={() => onClick(action)}
    >
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
          {getIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{action.title}</span>
            {action.count && (
              <Badge className="bg-red-500 text-white text-xs">
                {action.count}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600">{action.description}</p>
        </div>
      </div>
    </Button>
  );
});

function ClientDashboardContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  
  // State management
  const [stats, setStats] = React.useState<ClientStats | null>(null);
  const [recentBookings, setRecentBookings] = React.useState<RecentBooking[]>([]);
  const [quickActions, setQuickActions] = React.useState<QuickAction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Handle authentication and loading
  React.useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/client/dashboard");
      return;
    }

    if (user.role !== "client") {
      router.replace(`/${user.role}/dashboard`);
      return;
    }
  }, [loading, isAuthenticated, user, router]);

  // Load dashboard data
  const loadDashboardData = React.useCallback(async (force = false) => {
    if (!user) return;
    
    try {
      if (force) {
        setIsRefreshing(true);
        clientDashboardService.clearUserCache(user.$id);
      } else {
        setIsLoading(true);
      }
      
      setError(null);

      const { stats, recentBookings, quickActions } = await clientDashboardService.getDashboardData(user.$id);
      
      setStats(stats);
      setRecentBookings(recentBookings);
      setQuickActions(quickActions);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  // Initial load
  React.useEffect(() => {
    if (!loading && isAuthenticated && user) {
      loadDashboardData();
    }
  }, [user, loading, isAuthenticated, loadDashboardData]);

  // Prefetch data on mount
  React.useEffect(() => {
    if (user) {
      clientDashboardService.prefetchData(user.$id);
    }
  }, [user]);

  // Handle refresh
  const handleRefresh = React.useCallback(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  // Handle search
  const handleSearch = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/workers?search=${encodeURIComponent(searchQuery)}`);
    }
  }, [searchQuery, router]);

  // Handle booking click
  const handleBookingClick = React.useCallback((booking: RecentBooking) => {
    router.push(`/client/bookings?id=${booking.id}`);
  }, [router]);

  // Handle quick action click
  const handleQuickActionClick = React.useCallback((action: QuickAction) => {
    router.push(action.href);
  }, [router]);

  // Show loading state
  if (loading || !user || (isLoading && !stats)) {
    return (
      <React.Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      }>
        <ClientDashboardSkeleton />
      </React.Suspense>
    );
  }

  // Error state
  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-medium text-gray-900 mb-2">Oops! Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => loadDashboardData()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Welcome Section */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-serif mb-2">Dashboard</h1>
          <div>
            <h2 className="text-3xl font-serif mb-2">
              Welcome back, {user.name}! 👋
            </h2>
            <p className="text-gray-600">
              Here's what's happening with your services today.
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search and Book Service */}
      <div className="flex items-center justify-between mb-8">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search for services..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
        <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white ml-4" asChild>
          <Link href="/workers">
            <Plus className="h-5 w-5 mr-2" />
            Book a Service
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Bookings"
          value={stats?.totalBookings || 0}
          description={`${stats?.totalBookings || 0} services booked`}
          icon={Calendar}
          trend={stats && stats.totalBookings > 0 ? `+${Math.floor(stats.totalBookings * 0.1)} this month` : undefined}
          color="text-blue-600"
        />
        <StatsCard
          title="Completed Tasks"
          value={stats?.completedTasks || 0}
          description={`${stats?.completionRate || 0}% completion rate`}
          icon={CheckCircle}
          color="text-green-600"
        />
        <StatsCard
          title="Active Bookings"
          value={stats?.activeBookings || 0}
          description="Currently in progress"
          icon={TrendingUp}
          color="text-purple-600"
        />
        <StatsCard
          title="Pending Tasks"
          value={stats?.pendingTasks || 0}
          description="Awaiting worker acceptance"
          icon={Clock}
          color="text-orange-600"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Bookings */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-serif">Recent Bookings</h3>
              <p className="text-gray-600 text-sm">Your latest service requests</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/client/bookings">View All</Link>
            </Button>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              // Loading skeleton for bookings
              [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-2xl" />
                    <div>
                      <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
                      <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
                      <div className="h-3 w-28 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-6 w-16 bg-gray-200 rounded mb-1" />
                    <div className="h-4 w-12 bg-gray-200 rounded" />
                  </div>
                </div>
              ))
            ) : recentBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
                <p className="mb-4">Start by booking your first service</p>
                <Button asChild>
                  <Link href="/workers">Find Workers</Link>
                </Button>
              </div>
            ) : (
              recentBookings.map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onClick={handleBookingClick}
                />
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xl font-serif mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {quickActions.map(action => (
              <QuickActionCard
                key={action.id}
                action={action}
                onClick={handleQuickActionClick}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function ClientDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            <p className="mt-2 text-sm text-gray-600">Loading your dashboard...</p>
          </div>
        </Card>
      </div>
    }>
      <ClientDashboardContent />
    </Suspense>
  );
}
