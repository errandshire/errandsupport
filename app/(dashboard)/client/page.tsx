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

export default function ClientDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login?redirect=/client");
    }
  }, [isAuthenticated, loading, router]);

  // Redirect if user is not a client
  React.useEffect(() => {
    if (user && user.role !== "client") {
      router.push(`/${user.role}`);
    }
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user || user.role !== "client") {
    return null; // Will redirect
  }

  // Mock data for dashboard
  const stats = [
    {
      label: "Total Bookings",
      value: "12",
      change: "+3 this month",
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      label: "Completed Tasks",
      value: "8",
      change: "67% completion rate",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      label: "Money Saved",
        value: "₦1,240",
      change: "+₦320 this month",
      icon: TrendingUp,
      color: "text-primary-600",
      bgColor: "bg-primary-100",
    },
    {
      label: "Pending Tasks",
      value: "4",
      change: "2 starting today",
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  const recentBookings = [
    {
      id: "1",
      service: "House Cleaning",
      worker: "Sarah Johnson",
      date: "Today, 2:00 PM",
      status: "in_progress",
      rating: 4.9,
      price: "₦85",
    },
    {
      id: "2",
      service: "Grocery Shopping",
      worker: "Mike Chen",
      date: "Yesterday, 10:00 AM",
      status: "completed",
      rating: 5.0,
      price: "₦45",
    },
    {
      id: "3",
      service: "Pet Walking",
      worker: "Emma Wilson",
      date: "Dec 20, 4:00 PM",
      status: "confirmed",
      rating: 4.8,
        price: "₦30",
    },
  ];

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
                    variant="filled"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index} variant="elevated">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-600">{stat.label}</p>
                      <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
                      <p className="text-xs text-neutral-500 mt-1">{stat.change}</p>
                    </div>
                    <div className={`p-3 rounded-2xl ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
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
                    {recentBookings.map((booking) => (
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
                          <div className="flex items-center mt-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-neutral-500 ml-1">{booking.rating}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Tips */}
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

              {/* Support Card */}
              <Card variant="flat">
                <CardContent className="p-4 text-center">
                  <h4 className="font-medium text-neutral-900 mb-2">Need Help?</h4>
                  <p className="text-sm text-neutral-600 mb-3">
                    Our support team is here 24/7
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/support">Contact Support</Link>
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