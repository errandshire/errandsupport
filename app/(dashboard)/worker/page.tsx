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
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/hooks/use-auth";

export default function WorkerDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [isAvailable, setIsAvailable] = React.useState(true);

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
  }, [loading, isAuthenticated, user, router]);

  // Show loading state
  if (loading || !user) {
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

  // Mock data for worker dashboard
  const stats = [
    {
      label: "This Month's Earnings",
      value: "₦2,840",
      change: "+₦420 from last month",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      label: "Total Jobs",
      value: "156",
      change: "+12 this month",
      icon: CheckCircle,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      label: "Average Rating",
      value: "4.9",
      change: "Based on 142 reviews",
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
  ];

  const upcomingJobs = [
    {
      id: "1",
      service: "House Cleaning",
      client: "Alice Smith",
      date: "Today, 2:00 PM",
      location: "Downtown, 0.5 mi",
      price: "₦85",
      duration: "3 hours",
      status: "confirmed",
    },
    {
      id: "2",
      service: "Grocery Shopping",
      client: "John Doe",
      date: "Tomorrow, 10:00 AM",
      location: "Midtown, 1.2 mi",
      price: "₦45",
      duration: "2 hours",
      status: "pending",
    },
    {
      id: "3",
      service: "Pet Walking",
      client: "Sarah Johnson",
      date: "Dec 22, 4:00 PM",
      location: "Uptown, 0.8 mi",
        price: "₦30",
      duration: "1 hour",
      status: "confirmed",
    },
  ];

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

  return (
    <>
      <Header />
      <main className="min-h-screen bg-neutral-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
                  Hello, {user?.name}! 👋
                </h1>
                <p className="text-neutral-600">
                  Here's your work summary and upcoming jobs.
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-neutral-700">Available</span>
                  <Switch
                    checked={isAvailable}
                    onCheckedChange={setIsAvailable}
                  />
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
                    {upcomingJobs.map((job) => (
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
                            <div className="flex items-center space-x-4 mt-1">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3 text-neutral-400" />
                                <span className="text-xs text-neutral-500">{job.date}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-neutral-500">{job.location}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                          <p className="text-sm font-medium text-neutral-900 mt-1">{job.price}</p>
                          <p className="text-xs text-neutral-500">{job.duration}</p>
                          <div className="flex space-x-1 mt-2">
                            <Button size="sm" variant="outline">
                              <MessageCircle className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Profile */}
            <div className="space-y-6">
              {/* Profile Overview */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Profile Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Profile Views</span>
                    <span className="font-medium">124 this week</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Response Rate</span>
                    <span className="font-medium">98%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600">Completion Rate</span>
                    <span className="font-medium">100%</span>
                  </div>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/profile">View Full Profile</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/availability">
                      <Clock className="mr-2 h-4 w-4" />
                      Update Availability
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/earnings">
                      <DollarSign className="mr-2 h-4 w-4" />
                      View Earnings
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/reviews">
                      <Star className="mr-2 h-4 w-4" />
                      Manage Reviews
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Verification Status */}
              <Card variant="outlined" className="border-blue-200 bg-blue-50">
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-blue-900 mb-2">Verified Worker</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Your profile is verified and trusted by clients
                  </p>
                  <Badge className="bg-blue-100 text-blue-800">
                    Verified ✓
                  </Badge>
                </CardContent>
              </Card>

              {/* Tips Card */}
              <Card variant="flat">
                <CardContent className="p-4 text-center">
                  <h4 className="font-medium text-neutral-900 mb-2">💡 Pro Tip</h4>
                  <p className="text-sm text-neutral-600 mb-3">
                    Workers who respond within 1 hour get 3x more bookings!
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/tips">Learn More</Link>
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