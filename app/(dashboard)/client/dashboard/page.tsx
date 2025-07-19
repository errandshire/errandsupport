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
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProcessedBooking {
  id: string;
  service: string;
  worker: string;
  date: string;
  status: string;
  price: string;
  rating: number;
}

function ClientDashboardContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = React.useState<ProcessedBooking[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

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

        // Process bookings
        const processedBookings = bookingsResponse.documents.map((booking: any) => ({
          id: booking.$id,
          service: booking.title || 'Service Booking',
          worker: booking.workerName || 'Worker',
          date: new Date(booking.scheduledDate).toLocaleString(),
          status: booking.status,
          price: `₦${booking.budgetAmount}`,
          rating: booking.rating || 0
        }));

        setBookings(processedBookings);
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

  return (
    <>
      {/* Welcome Section */}
      <div className="mb-8">
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

      <div className="flex items-center justify-between mb-8">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search for services..."
            className="pl-10"
          />
        </div>
        <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white" asChild>
          <Link href="/workers">
            <Plus className="h-5 w-5 mr-2" />
            Book a Service
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-2xl font-semibold mb-1">12</h3>
          <p className="text-gray-600 text-sm">Total Bookings</p>
          <p className="text-green-600 text-sm mt-2">+10 this month</p>
        </Card>

        <Card className="p-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-2xl font-semibold mb-1">0</h3>
          <p className="text-gray-600 text-sm">Completed Tasks</p>
          <p className="text-gray-600 text-sm mt-2">0% completion rate</p>
        </Card>

        <Card className="p-6">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-2xl font-semibold mb-1">0</h3>
          <p className="text-gray-600 text-sm">Active Bookings</p>
          <p className="text-gray-600 text-sm mt-2">Awaiting completion</p>
        </Card>

        <Card className="p-6">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <h3 className="text-2xl font-semibold mb-1">0</h3>
          <p className="text-gray-600 text-sm">Pending Tasks</p>
          <p className="text-gray-600 text-sm mt-2">0 in progress</p>
        </Card>
      </div>

      {/* Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-serif">Recent Bookings</h3>
              <p className="text-gray-600 text-sm">Your latest service requests</p>
            </div>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>

          <div className="space-y-4">
            {bookings.map(booking => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 rounded-xl border hover:border-primary-300 transition-colors"
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
                      <span className="text-xs text-gray-500">{booking.date}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs",
                    booking.status === "completed" ? "bg-green-100 text-green-800" :
                    booking.status === "in_progress" ? "bg-blue-100 text-blue-800" :
                    booking.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                    "bg-gray-100 text-gray-800"
                  )}>
                    {booking.status}
                  </span>
                  <p className="text-sm font-medium mt-1">{booking.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xl font-serif mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/workers">Find Workers</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/client/bookings">View Bookings</Link>
            </Button>
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
