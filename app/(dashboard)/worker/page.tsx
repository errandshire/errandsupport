"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  DollarSign, 
  Calendar, 
  Star, 
  Clock, 
  Users,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Settings,
  Eye,
  MessageCircle,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WorkerSidebar, SidebarToggle } from "@/components/layout/worker-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { WorkerProfile } from "@/lib/types/marketplace";
import { cn } from "@/lib/utils";

export default function WorkerDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [isAvailable, setIsAvailable] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [workerProfile, setWorkerProfile] = React.useState<WorkerProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [upcomingJobs, setUpcomingJobs] = React.useState([]);
  const [stats, setStats] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch worker profile and dashboard data
  React.useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;
      
      try {
        const { databases, COLLECTIONS } = await import('@/lib/appwrite');
        const { Query } = await import('appwrite');
        
        // Fetch worker profile
        const workersResponse = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WORKERS,
          [Query.equal('userId', user.$id)]
        );
        
        if (workersResponse.documents.length > 0) {
          const profile = workersResponse.documents[0] as unknown as WorkerProfile;
          setWorkerProfile(profile);
          setIsAvailable(profile.isActive);
        }

        // Fetch all bookings for this worker
        const bookingsResponse = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.BOOKINGS,
          [
            Query.equal('workerId', workerProfile?.id || ''),
            Query.orderDesc('$createdAt'),
            Query.limit(10)
          ]
        );

        // Fetch client profiles for the bookings
        const clientIds = [...new Set(bookingsResponse.documents.map(booking => booking.clientId))];
        const clientsResponse = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.USERS,
          [Query.equal('$id', clientIds)]
        );

        const clientMap = clientsResponse.documents.reduce((acc, client) => {
          acc[client.$id] = client;
          return acc;
        }, {});

        // Process bookings with client info
        const processedBookings = bookingsResponse.documents.map(booking => ({
          id: booking.$id,
          service: booking.title || 'Service Booking',
          client: clientMap[booking.clientId]?.name || 'Client',
          date: new Date(booking.scheduledDate).toLocaleString(),
          location: booking.locationAddress || 'Location not specified',
          price: `₦${booking.budgetAmount}`,
          duration: `${booking.estimatedDuration} hours`,
          status: booking.status
        }));

        setUpcomingJobs(processedBookings);

        // Calculate stats
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const monthlyBookings = bookingsResponse.documents.filter(b => 
          new Date(b.$createdAt) >= firstDayOfMonth
        );

        const totalEarnings = monthlyBookings.reduce((sum, b) => sum + (b.workerEarnings || 0), 0);
        const previousEarnings = monthlyBookings.reduce((sum, b) => {
          const date = new Date(b.$createdAt);
          if (date.getMonth() === now.getMonth() - 1) {
            return sum + (b.workerEarnings || 0);
          }
          return sum;
        }, 0);

        const earningsDiff = totalEarnings - previousEarnings;

        setStats([
          {
            label: "This Month's Earnings",
            value: `₦${totalEarnings.toFixed(2)}`,
            change: `${earningsDiff >= 0 ? '+' : '-'}₦${Math.abs(earningsDiff).toFixed(2)} from last month`,
            icon: DollarSign,
            color: "text-green-600",
            bgColor: "bg-green-100",
          },
          {
            label: "Total Jobs",
            value: bookingsResponse.total.toString(),
            change: `+${monthlyBookings.length} this month`,
            icon: CheckCircle,
            color: "text-blue-600",
            bgColor: "bg-blue-100",
          },
          {
            label: "Average Rating",
            value: workerProfile?.rating?.toFixed(1) || "N/A",
            change: `Based on ${workerProfile?.totalReviews || 0} reviews`,
            icon: Star,
            color: "text-yellow-600",
            bgColor: "bg-yellow-100",
          },
          {
            label: "Response Time",
            value: "< 2h",
            change: "85% faster than average",
            icon: Clock,
            color: "text-primary-600",
            bgColor: "bg-primary-100",
          },
        ]);

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
        setIsLoading(false);
      }
    }
    
    if (!loading && isAuthenticated && user) {
      fetchDashboardData();
    }
  }, [user, loading, isAuthenticated, workerProfile?.id]);

  // Handle availability toggle
  const handleAvailabilityToggle = async (newValue: boolean) => {
    if (!workerProfile) return;
    
    try {
      setIsUpdating(true);
      const { databases, DATABASE_ID, COLLECTIONS } = await import('@/lib/appwrite');
      
      // Update the document using $id instead of id
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.WORKERS,
        (workerProfile as any).$id,
        {
          isActive: newValue,
          updatedAt: new Date().toISOString()
        }
      );
      
      setIsAvailable(newValue);
      toast.success(newValue ? "You are now available for work" : "You are now marked as unavailable");
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error("Failed to update availability status");
      // Revert the toggle if update fails
      setIsAvailable(!newValue);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle authentication and loading
  React.useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/worker");
      return;
    }

    if (user.role !== "worker") {
      router.replace(`/${user.role}`);
      return;
    }

    // If worker is not onboarded, redirect to onboarding
    if (!user.isOnboarded) {
      router.replace("/onboarding");
      return;
    }
  }, [loading, isAuthenticated, user, router]);

  // Handle responsive sidebar behavior
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show loading state
  if (loading || !user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  // Ensure user is a worker
  if (user.role !== "worker") {
    return null; // Will redirect in useEffect
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmed";
      case "pending":
        return "Pending";
      case "in_progress":
        return "In Progress";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar */}
      <WorkerSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        <Header>
          <SidebarToggle onToggle={() => setSidebarOpen(!sidebarOpen)} />
        </Header>
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
                  Welcome back, {workerProfile?.displayName || user.name}! 👋
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
                  <Link href="/profile">
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
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        stat.bgColor
                      )}
                    >
                      <stat.icon className={cn("h-5 w-5", stat.color)} />
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
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upcoming Jobs */}
            <div className="lg:col-span-2">
              <Card variant="elevated">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Upcoming Jobs</CardTitle>
                      <CardDescription>Your scheduled services</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/jobs">View All</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingJobs.map(job => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 hover:border-primary-300 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-primary-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-neutral-900">{job.service}</h4>
                            <p className="text-sm text-neutral-600">for {job.client}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Clock className="h-3 w-3 text-neutral-400" />
                              <span className="text-xs text-neutral-500">{job.date}</span>
                              <MapPin className="h-3 w-3 text-neutral-400 ml-2" />
                              <span className="text-xs text-neutral-500">{job.location}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(job.status)}>
                            {getStatusText(job.status)}
                          </Badge>
                          <p className="text-sm font-medium text-neutral-900 mt-1">{job.price}</p>
                          <p className="text-xs text-neutral-500 mt-1">{job.duration}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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
                      {workerProfile?.profileViews || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Active Chats</span>
                    <Badge variant="outline">
                      <MessageCircle className="h-3 w-3 mr-1" />
                      {workerProfile?.activeChats || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Completion Rate</span>
                    <Badge variant="outline">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {workerProfile?.completionRate || 0}%
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
        </main>
      </div>
      <Footer />
    </div>
  );
} 