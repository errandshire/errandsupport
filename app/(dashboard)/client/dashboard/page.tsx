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
  Star,
  ArrowRight,
  BookOpen
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
  <Card className="p-4 sm:p-6 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${color.replace('text-', 'bg-').replace('-600', '-100')} rounded-lg flex items-center justify-center mb-3 sm:mb-4`}>
          <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${color}`} />
        </div>
        <h3 className="text-xl sm:text-2xl font-semibold mb-1">{value}</h3>
        <p className="text-gray-600 text-xs sm:text-sm">{title}</p>
        {trend && <p className="text-green-600 text-xs sm:text-sm mt-1 sm:mt-2">{trend}</p>}
        {description && !trend && <p className="text-gray-600 text-xs sm:text-sm mt-1 sm:mt-2">{description}</p>}
      </div>
    </div>
  </Card>
));

const BookingCard = React.memo(({ 
  booking,
  onClick 
}: {
  booking: RecentBooking;
  onClick: (booking: RecentBooking) => void;
}) => (
  <Card 
    className="p-4 hover:shadow-md transition-all cursor-pointer border hover:border-primary-200"
    onClick={() => onClick(booking)}
  >
    <div className="flex items-start space-x-3">
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{booking.title}</h4>
            <p className="text-xs sm:text-sm text-gray-600 truncate">by {booking.workerName}</p>
            <div className="flex items-center gap-2 sm:gap-4 text-xs text-gray-500 mt-2">
              <span>{booking.timeAgo}</span>
              <span>{booking.price}</span>
            </div>
          </div>
          <div className="flex flex-col items-end ml-2">
            <Badge className={getStatusColor(booking.status)} variant="secondary">
              {getStatusDisplayName(booking.status)}
            </Badge>
            <div className="mt-2">
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </Card>
));

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
        return <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />;
      case 'bookings':
        return <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />;
      case 'messages':
        return <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />;
      case 'wallet':
        return <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-white" />;
      case 'settings':
        return <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-white" />;
      default:
        return <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />;
    }
  };

  return (
    <Button 
      variant="outline" 
      className="w-full justify-start h-auto p-3 sm:p-4 text-left hover:bg-gray-50 transition-colors"
      onClick={() => onClick(action)}
    >
      <div className="flex items-center space-x-3 w-full">
        <div className={`w-10 h-10 sm:w-10 sm:h-10 ${action.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm sm:text-base truncate">{action.title}</span>
            {action.count && (
              <Badge className="bg-red-500 text-white text-xs h-5 min-w-[20px] flex items-center justify-center">
                {action.count}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-600 truncate">{action.description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </div>
    </Button>
  );
});

// Helper functions
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed': return 'bg-green-100 text-green-800';
    case 'in_progress': return 'bg-blue-100 text-blue-800';
    case 'confirmed': return 'bg-yellow-100 text-yellow-800';
    case 'pending': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusDisplayName = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed': return 'Completed';
    case 'in_progress': return 'In Progress';
    case 'confirmed': return 'Confirmed';
    case 'pending': return 'Pending';
    default: return status;
  }
};

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
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-medium text-gray-900 mb-2">Oops! Something went wrong</h2>
        <p className="text-gray-600 mb-4 text-sm sm:text-base">{error}</p>
        <Button onClick={() => loadDashboardData()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold mb-2">
            Welcome back, {user.name?.split(' ')[0] || 'Client'}! 👋
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Here's what's happening with your services today.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="self-start"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Search and Book Service */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search for services..."
              className="pl-10 h-11 sm:h-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
        <Button 
          size="lg" 
          className="bg-green-500 hover:bg-green-600 text-white h-11 sm:h-12 px-4 sm:px-6" 
          asChild
        >
          <Link href="/workers">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="whitespace-nowrap">Book Service</span>
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatsCard
          title="Total Bookings"
          value={stats?.totalBookings || 0}
          description={`${stats?.totalBookings || 0} services booked`}
          icon={Calendar}
          trend={stats && stats.totalBookings > 0 ? `+${Math.floor(stats.totalBookings * 0.1)} this month` : undefined}
          color="text-blue-600"
        />
        <StatsCard
          title="Completed"
          value={stats?.completedTasks || 0}
          description={`${stats?.completionRate || 0}% completion rate`}
          icon={CheckCircle}
          color="text-green-600"
        />
        <StatsCard
          title="Active"
          value={stats?.activeBookings || 0}
          description="Currently in progress"
          icon={TrendingUp}
          color="text-purple-600"
        />
        <StatsCard
          title="Pending"
          value={stats?.pendingTasks || 0}
          description="Awaiting worker acceptance"
          icon={Clock}
          color="text-orange-600"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-serif font-semibold">Recent Bookings</h3>
              <p className="text-gray-600 text-xs sm:text-sm">Your latest service requests</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/client/bookings">
                <span className="hidden sm:inline">View All</span>
                <span className="sm:hidden">All</span>
              </Link>
            </Button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {isLoading ? (
              // Loading skeleton for bookings
              [...Array(3)].map((_, i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                      <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
                      <div className="h-3 w-28 bg-gray-200 rounded" />
                    </div>
                    <div className="h-6 w-16 bg-gray-200 rounded" />
                  </div>
                </Card>
              ))
            ) : recentBookings.length === 0 ? (
              <Card className="p-6 sm:p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
                <p className="text-gray-600 mb-4 text-sm sm:text-base">Start by booking your first service</p>
                <Button asChild>
                  <Link href="/workers">Find Workers</Link>
                </Button>
              </Card>
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
        <div className="space-y-4 sm:space-y-6">
          <h3 className="text-lg sm:text-xl font-serif font-semibold">Quick Actions</h3>
          <div className="space-y-2 sm:space-y-3">
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
    </div>
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
