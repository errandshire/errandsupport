"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Star,
  Calendar,
  Users,
  Clock,
  Target,
  Award,
  Activity,
  Filter,
  Download,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { workerAnalyticsService } from "@/lib/worker-analytics-service";
import type { AnalyticsData, AnalyticsMetric } from "@/lib/worker-analytics-service";

// Memoized components for better performance
const MetricCard = React.memo(({ 
  metric 
}: { 
  metric: AnalyticsMetric 
}) => {
  const Icon = React.useMemo(() => {
    const icons: { [key: string]: React.ComponentType<any> } = {
      DollarSign: BarChart3,
      CheckCircle: Target,
      Star: Star,
      Clock: Clock,
      Award: Award,
      Activity: Activity
    };
    return icons[metric.icon] || Activity;
  }, [metric.icon]);

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

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className={cn("p-2 rounded-lg", metric.color.replace('text-', 'bg-').replace('-600', '-100'))}>
            <Icon className={cn("h-5 w-5", metric.color)} />
          </div>
          <div className={cn("flex items-center gap-1 text-sm", getChangeColor(metric.changeType))}>
            {getChangeIcon(metric.changeType)}
            <span>{metric.change}%</span>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-neutral-600">{metric.label}</p>
          <h4 className="text-2xl font-bold text-neutral-900 mt-1">{metric.value}</h4>
        </div>
      </CardContent>
    </Card>
  );
});

const PerformanceCard = React.memo(({ 
  title, 
  value, 
  target, 
  icon: Icon 
}: { 
  title: string; 
  value: number; 
  target: number;
  icon: React.ComponentType<any>;
}) => (
  <div className="flex items-center gap-4 p-4 border rounded-lg">
    <div className="p-2 bg-neutral-100 rounded-lg">
      <Icon className="h-5 w-5 text-neutral-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-neutral-600">{title}</p>
      <div className="mt-1">
        <Progress value={value} max={100} className="h-2" />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-sm text-neutral-600">{value}%</span>
        <span className="text-sm text-neutral-400">Target: {target}%</span>
      </div>
    </div>
  </div>
));

// Lazy load chart component
const AnalyticsChart = React.lazy(() => 
  import("@/components/worker/analytics-chart").then(module => ({ 
    default: module.AnalyticsChart 
  }))
);

export default function WorkerAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = React.useState("last-30-days");
  const [analytics, setAnalytics] = React.useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Load analytics data
  const loadAnalytics = React.useCallback(async (force = false) => {
    if (!user) return;

    try {
      if (force) {
        setIsRefreshing(true);
        workerAnalyticsService.clearCache(user.$id);
      } else {
        setIsLoading(true);
      }

      const data = await workerAnalyticsService.getAnalytics(user.$id, selectedPeriod);
      setAnalytics(data);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, selectedPeriod]);

  // Initial load
  React.useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Handle period change
  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    loadAnalytics(true);
  };

  // Handle refresh
  const handleRefresh = () => {
    loadAnalytics(true);
  };

  if (isLoading && !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-900 mb-2">No Analytics Data</h2>
          <p className="text-gray-600 mb-4">Start accepting bookings to see your analytics</p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
            Analytics & Insights
          </h1>
          <p className="text-neutral-600">
            Track your performance and earnings
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last-7-days">Last 7 Days</SelectItem>
              <SelectItem value="last-30-days">Last 30 Days</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {analytics.metrics.map((metric, index) => (
          <MetricCard key={index} metric={metric} />
        ))}
      </div>

      {/* Performance Metrics */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Track your service quality and efficiency</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PerformanceCard
            title="Response Rate"
            value={analytics.performance.responseRate}
            target={90}
            icon={Clock}
          />
          <PerformanceCard
            title="Completion Rate"
            value={analytics.performance.completionRate}
            target={85}
            icon={Target}
          />
          <PerformanceCard
            title="On-Time Rate"
            value={analytics.performance.onTimeRate}
            target={95}
            icon={Calendar}
          />
          <PerformanceCard
            title="Client Satisfaction"
            value={analytics.performance.satisfactionRate}
            target={90}
            icon={Users}
          />
        </CardContent>
      </Card>

      {/* Ratings Distribution */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Ratings Distribution</CardTitle>
          <CardDescription>
            Average Rating: {analytics.ratings.average.toFixed(1)} ({analytics.ratings.total} reviews)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = analytics.ratings.distribution[rating] || 0;
              const percentage = analytics.ratings.total > 0
                ? (count / analytics.ratings.total) * 100
                : 0;
              
              return (
                <div key={rating} className="flex items-center gap-4">
                  <div className="w-12 text-sm font-medium text-neutral-600">
                    {rating} {rating === 1 ? 'Star' : 'Stars'}
                  </div>
                  <div className="flex-1">
                    <Progress value={percentage} max={100} className="h-2" />
                  </div>
                  <div className="w-16 text-sm text-neutral-600 text-right">
                    {count} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Earnings & Bookings Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Earnings Trend</CardTitle>
            <CardDescription>
              Total: ₦{analytics.earnings.total.toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <React.Suspense fallback={
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                </div>
              }>
                <AnalyticsChart
                  data={analytics.earnings.data}
                  type="earnings"
                  color="#10b981"
                />
              </React.Suspense>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bookings Trend</CardTitle>
            <CardDescription>
              Total: {analytics.bookings.total} bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <React.Suspense fallback={
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                </div>
              }>
                <AnalyticsChart
                  data={analytics.bookings.data}
                  type="bookings"
                  color="#6366f1"
                />
              </React.Suspense>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 