"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Eye,
  Star,
  Calendar,
  Users,
  Clock,
  Target,
  Award,
  Activity,
  Filter,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WorkerSidebar, SidebarToggle } from "@/components/layout/worker-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface AnalyticsMetric {
  label: string;
  value: string;
  change: number;
  changeType: "increase" | "decrease" | "neutral";
  icon: any;
  color: string;
}

interface PerformanceData {
  period: string;
  profileViews: number;
  bookingRequests: number;
  conversationRate: number;
  avgResponseTime: number;
  completionRate: number;
  rating: number;
}

const analyticsMetrics: AnalyticsMetric[] = [
  {
    label: "Profile Views",
    value: "1,234",
    change: 12.5,
    changeType: "increase",
    icon: Eye,
    color: "text-blue-600"
  },
  {
    label: "Booking Requests",
    value: "89",
    change: 8.2,
    changeType: "increase",
    icon: Calendar,
    color: "text-green-600"
  },
  {
    label: "Conversion Rate",
    value: "72%",
    change: -2.1,
    changeType: "decrease",
    icon: Target,
    color: "text-purple-600"
  },
  {
    label: "Average Rating",
    value: "4.8",
    change: 0.3,
    changeType: "increase",
    icon: Star,
    color: "text-yellow-600"
  },
  {
    label: "Response Time",
    value: "2.3h",
    change: -15.8,
    changeType: "increase",
    icon: Clock,
    color: "text-indigo-600"
  },
  {
    label: "Completion Rate",
    value: "94%",
    change: 3.2,
    changeType: "increase",
    icon: Award,
    color: "text-teal-600"
  }
];

const performanceData: PerformanceData[] = [
  { period: "Jan 2024", profileViews: 850, bookingRequests: 65, conversationRate: 76, avgResponseTime: 2.1, completionRate: 91, rating: 4.7 },
  { period: "Feb 2024", profileViews: 920, bookingRequests: 72, conversationRate: 78, avgResponseTime: 2.0, completionRate: 93, rating: 4.8 },
  { period: "Mar 2024", profileViews: 1100, bookingRequests: 85, conversationRate: 77, avgResponseTime: 1.9, completionRate: 95, rating: 4.9 },
  { period: "Apr 2024", profileViews: 1234, bookingRequests: 89, conversationRate: 72, avgResponseTime: 2.3, completionRate: 94, rating: 4.8 }
];

export default function WorkerAnalyticsPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [selectedPeriod, setSelectedPeriod] = React.useState("last-30-days");

  React.useEffect(() => {
    if (loading) return;
    
    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/worker/analytics");
      return;
    }
    
    if (user.role !== "worker") {
      router.replace(`/${user.role}`);
      return;
    }
  }, [loading, isAuthenticated, user, router]);

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case "increase":
        return <TrendingUp className="h-4 w-4" />;
      case "decrease":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case "increase":
        return "text-green-600";
      case "decrease":
        return "text-red-600";
      default:
        return "text-neutral-600";
    }
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
      

      <div className="flex-1 flex flex-col lg:ml-0">
         
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
                  Analytics & Performance
                </h1>
                <p className="text-neutral-600">
                  Track your service performance and growth metrics
                </p>
              </div>
              <div className="flex gap-2">
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                    <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                    <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                    <SelectItem value="this-year">This Year</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {analyticsMetrics.map((metric, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn("p-2 rounded-lg bg-opacity-10", `bg-${metric.color.split('-')[1]}-100`)}>
                        <metric.icon className={cn("h-5 w-5", metric.color)} />
                      </div>
                      <div className={cn("flex items-center text-sm", getChangeColor(metric.changeType))}>
                        {getChangeIcon(metric.changeType)}
                        <span className="ml-1">{Math.abs(metric.change)}%</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-neutral-900 mb-1">
                        {metric.value}
                      </h3>
                      <p className="text-sm text-neutral-600">
                        {metric.label}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="clients">Clients</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Performance Trends</CardTitle>
                      <CardDescription>Your key metrics over the last 4 months</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {performanceData.map((data, index) => (
                          <div key={index} className="grid grid-cols-3 gap-4 p-3 bg-neutral-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-neutral-900">{data.period}</p>
                              <p className="text-xs text-neutral-600">Profile Views: {data.profileViews}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-green-600">{data.bookingRequests} bookings</p>
                              <p className="text-xs text-neutral-600">Conversion: {data.conversationRate}%</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-yellow-600">{data.rating} ⭐</p>
                              <p className="text-xs text-neutral-600">Completion: {data.completionRate}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Service Categories Performance</CardTitle>
                      <CardDescription>Revenue and booking distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">House Cleaning</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-neutral-600">₦45,000</span>
                            <Badge variant="outline">15 jobs</Badge>
                          </div>
                        </div>
                        <Progress value={36} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Plumbing</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-neutral-600">₦32,000</span>
                            <Badge variant="outline">8 jobs</Badge>
                          </div>
                        </div>
                        <Progress value={26} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Garden Care</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-neutral-600">₦28,000</span>
                            <Badge variant="outline">12 jobs</Badge>
                          </div>
                        </div>
                        <Progress value={22} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Electrical</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-neutral-600">₦20,000</span>
                            <Badge variant="outline">5 jobs</Badge>
                          </div>
                        </div>
                        <Progress value={16} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Response Time Analysis</CardTitle>
                      <CardDescription>Average response times by time of day</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Morning (6-12 PM)</span>
                          <Badge variant="outline" className="text-green-600">1.5h</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Afternoon (12-6 PM)</span>
                          <Badge variant="outline" className="text-yellow-600">2.1h</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Evening (6-12 AM)</span>
                          <Badge variant="outline" className="text-blue-600">3.2h</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Night (12-6 AM)</span>
                          <Badge variant="outline" className="text-gray-600">8.5h</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Booking Success Rate</CardTitle>
                      <CardDescription>Conversion funnel analysis</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Profile Views</span>
                          <span className="text-sm font-medium">1,234</span>
                        </div>
                        <Progress value={100} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Inquiries</span>
                          <span className="text-sm font-medium">247 (20%)</span>
                        </div>
                        <Progress value={20} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Bookings</span>
                          <span className="text-sm font-medium">89 (36%)</span>
                        </div>
                        <Progress value={36} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Completed</span>
                          <span className="text-sm font-medium">84 (94%)</span>
                        </div>
                        <Progress value={94} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quality Metrics</CardTitle>
                      <CardDescription>Service quality indicators</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Average Rating</span>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="text-sm font-medium">4.8</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Repeat Customers</span>
                          <Badge variant="outline" className="text-green-600">23%</Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Referrals</span>
                          <Badge variant="outline" className="text-blue-600">12%</Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Cancellation Rate</span>
                          <Badge variant="outline" className="text-red-600">3%</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="clients" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Client Demographics</CardTitle>
                      <CardDescription>Your client base breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">65%</div>
                            <div className="text-sm text-blue-800">Residential</div>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">35%</div>
                            <div className="text-sm text-green-800">Commercial</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">New Clients</span>
                            <Badge variant="outline">77%</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Returning Clients</span>
                            <Badge variant="outline">23%</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Performing Areas</CardTitle>
                      <CardDescription>Locations with highest demand</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Victoria Island</span>
                          <div className="flex items-center gap-2">
                            <Progress value={85} className="w-20 h-2" />
                            <span className="text-sm text-neutral-600">23 jobs</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Ikoyi</span>
                          <div className="flex items-center gap-2">
                            <Progress value={72} className="w-20 h-2" />
                            <span className="text-sm text-neutral-600">18 jobs</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Lekki</span>
                          <div className="flex items-center gap-2">
                            <Progress value={68} className="w-20 h-2" />
                            <span className="text-sm text-neutral-600">15 jobs</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Surulere</span>
                          <div className="flex items-center gap-2">
                            <Progress value={45} className="w-20 h-2" />
                            <span className="text-sm text-neutral-600">12 jobs</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="insights" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>💡 Growth Opportunities</CardTitle>
                      <CardDescription>AI-powered recommendations</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-1">Expand Service Hours</h4>
                          <p className="text-sm text-blue-800">
                            You receive 35% more inquiries during weekends. Consider extending your availability.
                          </p>
                        </div>
                        
                        <div className="p-3 bg-green-50 rounded-lg">
                          <h4 className="font-medium text-green-900 mb-1">Optimize Pricing</h4>
                          <p className="text-sm text-green-800">
                            Your conversion rate for jobs priced ₦8,000-₦15,000 is 85%. Consider pricing in this range.
                          </p>
                        </div>
                        
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <h4 className="font-medium text-purple-900 mb-1">Improve Response Time</h4>
                          <p className="text-sm text-purple-800">
                            Clients who receive responses within 1 hour book 60% more often.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>🎯 Monthly Goals</CardTitle>
                      <CardDescription>Track your progress</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Monthly Revenue</span>
                            <span className="text-sm text-neutral-600">₦125,000 / ₦150,000</span>
                          </div>
                          <Progress value={83} className="h-2" />
                          <p className="text-xs text-neutral-500 mt-1">83% complete</p>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Jobs Completed</span>
                            <span className="text-sm text-neutral-600">15 / 20</span>
                          </div>
                          <Progress value={75} className="h-2" />
                          <p className="text-xs text-neutral-500 mt-1">75% complete</p>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">New Clients</span>
                            <span className="text-sm text-neutral-600">12 / 15</span>
                          </div>
                          <Progress value={80} className="h-2" />
                          <p className="text-xs text-neutral-500 mt-1">80% complete</p>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium">Average Rating</span>
                            <span className="text-sm text-neutral-600">4.8 / 5.0</span>
                          </div>
                          <Progress value={96} className="h-2" />
                          <p className="text-xs text-neutral-500 mt-1">96% complete</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
} 