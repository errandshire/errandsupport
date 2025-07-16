"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Search, 
  Calendar, 
  MapPin, 
  Star, 
  Clock, 
  Plus,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";

interface WorkerProfile {
  $id: string;
  displayName: string;
  rating?: number;
}

interface Booking {
  $id: string;
  title: string;
  workerId: string;
  scheduledDate: string;
  status: string;
  budgetAmount: number;
}

interface ProcessedBooking {
  id: string;
  service: string;
  worker: string;
  date: string;
  status: string;
  price: string;
  rating: number;
}

interface StatItem {
  label: string;
  value: string;
  change: string;
  icon: any; // Using any for Lucide icon component type
  color: string;
  bgColor: string;
}

export default function ClientDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = React.useState<ProcessedBooking[]>([]);
  const [stats, setStats] = React.useState<StatItem[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Handle authentication and loading
  React.useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/client");
      return;
    }

    if (user.role !== "client") {
      router.replace(`/${user.role}`);
      return;
    }
  }, [loading, isAuthenticated, user, router]);

  // Fetch bookings and stats
  React.useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;
      
      try {
        const { databases, COLLECTIONS } = await import('@/lib/appwrite');
        const { Query } = await import('appwrite');
        
        // Fetch all bookings for this client
        const bookingsResponse = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.BOOKINGS,
          [
            Query.equal('clientId', user.$id),
            Query.orderDesc('$createdAt'),
            Query.limit(10)
          ]
        );

        // Fetch worker profiles for the bookings
        const workerIds = [...new Set(bookingsResponse.documents.map(booking => booking.workerId))].filter(Boolean);
        
        // Skip worker fetching if no valid worker IDs
        const workerMap: Record<string, WorkerProfile> = {};
        if (workerIds.length > 0) {
          try {
            // Fetch each worker profile individually and combine results
            const workerPromises = workerIds.map(workerId =>
              databases.listDocuments(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                COLLECTIONS.WORKERS,
                [Query.equal('$id', workerId)]
              ).catch(error => {
                console.error(`Error fetching worker ${workerId}:`, error);
                return { documents: [] }; // Return empty result on error
              })
            );
            
            const workersResponses = await Promise.all(workerPromises);
            workersResponses.forEach(response => {
              if (response.documents.length > 0) {
                const worker = response.documents[0] as WorkerProfile;
                workerMap[worker.$id] = worker;
              }
            });
          } catch (error) {
            console.error('Error fetching worker profiles:', error);
          }
        }

        // Process bookings with worker info
        const processedBookings = bookingsResponse.documents.map((booking: Booking) => ({
          id: booking.$id,
          service: booking.title || 'Service Booking',
          worker: workerMap[booking.workerId]?.displayName || 'Worker',
          date: new Date(booking.scheduledDate).toLocaleString(),
          status: booking.status,
          price: `₦${booking.budgetAmount}`,
          rating: workerMap[booking.workerId]?.rating || 0
        }));

        setBookings(processedBookings);

        // Calculate stats
        const totalBookings = bookingsResponse.total;
        const completedBookings = bookingsResponse.documents.filter(b => b.status === 'completed').length;
        const pendingBookings = bookingsResponse.documents.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status)).length;
        const thisMonthBookings = bookingsResponse.documents.filter(b => {
          const bookingDate = new Date(b.$createdAt);
          const now = new Date();
          return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear();
        }).length;

        setStats([
          {
            label: "Total Bookings",
            value: totalBookings.toString(),
            change: `+${thisMonthBookings} this month`,
            icon: Calendar,
            color: "text-blue-600",
            bgColor: "bg-blue-100",
          },
          {
            label: "Completed Tasks",
            value: completedBookings.toString(),
            change: `${Math.round((completedBookings / totalBookings) * 100)}% completion rate`,
            icon: CheckCircle,
            color: "text-green-600",
            bgColor: "bg-green-100",
          },
          {
            label: "Active Bookings",
            value: pendingBookings.toString(),
            change: "Awaiting completion",
            icon: TrendingUp,
            color: "text-primary-600",
            bgColor: "bg-primary-100",
          },
          {
            label: "Pending Tasks",
            value: pendingBookings.toString(),
            change: `${pendingBookings} in progress`,
            icon: AlertCircle,
            color: "text-orange-600",
            bgColor: "bg-orange-100",
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
  }, [user, loading, isAuthenticated]);

  // Show loading state
  if (loading || !user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  // Ensure user is a client
  if (user.role !== "client") {
    return null; // Will redirect in useEffect
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "confirmed":
        return "bg-primary-100 text-primary-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      case "confirmed":
        return "Confirmed";
      case "pending":
        return "Pending";
      default:
        return status;
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-neutral-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
              Welcome back, {user.name}! 👋
            </h1>
            <p className="text-neutral-600">
              Here's what's happening with your services today.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <Input
                    type="search"
                    placeholder="Search for services..."
                    className="pl-10"
                  />
                </div>
              </div>
              <Button size="lg" asChild>
                <Link href="/workers" className="inline-flex items-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Book a Service
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats?.map((stat, index) => (
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
            {/* Recent Bookings */}
            <div className="lg:col-span-2">
              <Card variant="elevated">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Recent Bookings</CardTitle>
                      <CardDescription>Your latest service requests</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/bookings">View All</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bookings?.map(booking => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 hover:border-primary-300 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-primary-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-neutral-900">{booking.service}</h4>
                            <p className="text-sm text-neutral-600">with {booking.worker}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Clock className="h-3 w-3 text-neutral-400" />
                              <span className="text-xs text-neutral-500">{booking.date}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(booking.status)}>
                            {getStatusText(booking.status)}
                          </Badge>
                          <p className="text-sm font-medium text-neutral-900 mt-1">{booking.price}</p>
                          {booking.rating > 0 && (
                            <div className="flex items-center mt-1">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-neutral-500 ml-1">{booking.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Quick Actions Card */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/workers">
                      <Search className="mr-2 h-4 w-4" />
                      Find Workers
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/bookings">
                      <Calendar className="mr-2 h-4 w-4" />
                      View Bookings
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/profile">
                      <MapPin className="mr-2 h-4 w-4" />
                      Update Address
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Tips Card */}
              <Card variant="outlined">
                <CardHeader>
                  <CardTitle className="text-lg">💡 Pro Tip</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600 mb-3">
                    Book recurring services to save time and get better rates from your favorite workers!
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
} 