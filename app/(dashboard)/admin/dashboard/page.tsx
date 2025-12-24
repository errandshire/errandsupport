"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Users,
  UserCircle,
  Settings,
  Shield,
  AlertTriangle,
  Activity,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { adminDashboardService } from "@/lib/admin-dashboard-service";
import type { DashboardStats, RecentRegistration, SystemAlert } from "@/lib/admin-dashboard-service";
import { toast } from "sonner";

// Lazy load heavy components
const DashboardSkeleton = React.lazy(() => 
  import("@/components/admin/dashboard-skeleton").then(module => ({ 
    default: module.DashboardSkeleton 
  }))
);

// Memoized components for better performance
const StatsCard = React.memo(({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend 
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-neutral-500">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold">{value}</div>
        <Icon className="h-4 w-4 text-neutral-400" />
      </div>
      {trend && <p className="text-xs text-neutral-500 mt-1">{trend}</p>}
      {description && !trend && <p className="text-xs text-neutral-500 mt-1">{description}</p>}
    </CardContent>
  </Card>
));

const RegistrationCard = React.memo(({ 
  registration,
  onApprove,
  onReview 
}: {
  registration: RecentRegistration;
  onApprove: (id: string) => void;
  onReview: (id: string) => void;
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl border border-neutral-200 hover:border-red-300 transition-colors">
    <div className="flex items-start space-x-3 sm:space-x-4">
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0">
        <Users className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
      </div>
      <div>
        <h4 className="font-medium text-neutral-900">{registration.name}</h4>
        <p className="text-sm text-neutral-600">
          {registration.type === 'worker' ? 'Worker' : 'Client'} - {registration.category}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            {registration.status === 'pending' ? 'Pending Review' : registration.status}
          </Badge>
          <span className="text-xs text-neutral-500">{registration.timeAgo}</span>
        </div>
      </div>
    </div>
    <div className="flex gap-2 mt-3 sm:mt-0 ml-13 sm:ml-0">
      <Button 
        variant="ghost" 
        size="sm" 
        className="flex-1 sm:flex-initial"
        onClick={() => onReview(registration.id)}
      >
        <Eye className="h-3 w-3 mr-1" />
        Review
      </Button>
      <Button 
        size="sm" 
        className="flex-1 sm:flex-initial"
        onClick={() => onApprove(registration.id)}
      >
        Approve
      </Button>
    </div>
  </div>
));

const AlertItem = React.memo(({ alert }: { alert: SystemAlert }) => {
  const getIcon = () => {
    switch (alert.icon) {
      case 'check':
        return <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />;
      case 'alert':
        return <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />;
      case 'x':
        return <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />;
    }
  };

  return (
    <div className="flex items-start gap-3">
      {getIcon()}
      <div>
        <p className="font-medium text-sm">{alert.title}</p>
        <p className="text-xs text-neutral-500">{alert.message}</p>
      </div>
    </div>
  );
});

export default function AdminDashboard() {
  const { user } = useAuth();
  
  // State management
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [registrations, setRegistrations] = React.useState<RecentRegistration[]>([]);
  const [alerts, setAlerts] = React.useState<SystemAlert[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load dashboard data
  const loadDashboardData = React.useCallback(async (force = false) => {
    try {
      if (force) {
        setIsRefreshing(true);
        adminDashboardService.clearCache();
      } else {
        setIsLoading(true);
      }
      
      setError(null);

      const { stats, registrations, alerts } = await adminDashboardService.getDashboardData();
      
      setStats(stats);
      setRegistrations(registrations);
      setAlerts(alerts);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Prefetch data on mount for better UX
  React.useEffect(() => {
    adminDashboardService.prefetchData();
  }, []);

  // Handle refresh
  const handleRefresh = React.useCallback(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  // Handle actions
  const handleApprove = React.useCallback((id: string) => {
    toast.success('Registration approved successfully');
    // In production, would make API call and refresh data
  }, []);

  const handleReview = React.useCallback((id: string) => {
    // In production, would navigate to detailed review page
  }, []);

  // Loading state
  if (isLoading && !stats) {
    return (
      <React.Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      }>
        <DashboardSkeleton />
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
          <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-neutral-600">
            Manage users, monitor platform activity, and maintain system health.
          </p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers.toLocaleString() || '0'}
          description="Total platform users"
          icon={Users}
          trend={stats?.userGrowth}
        />
        <StatsCard
          title="Active Workers"
          value={stats?.activeWorkers.toLocaleString() || '0'}
          description="Currently active workers"
          icon={Shield}
          trend={stats?.workerGrowth}
        />
        <StatsCard
          title="Active Clients"
          value={stats?.activeClients.toLocaleString() || '0'}
          description={`${stats?.totalClients || 0} total clients`}
          icon={UserCircle}
          trend={stats?.clientGrowth}
        />
        <StatsCard
          title="Pending Verifications"
          value={stats?.pendingVerifications || '0'}
          description="Requires attention"
          icon={AlertTriangle}
        />
        <StatsCard
          title="System Health"
          value={`${stats?.systemHealth || 0}%`}
          description="All systems operational"
          icon={Activity}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Registrations</CardTitle>
              <CardDescription>Latest user sign-ups requiring review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {registrations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No pending registrations</p>
                  </div>
                ) : (
                  registrations.map(registration => (
                    <RegistrationCard
                      key={registration.id}
                      registration={registration}
                      onApprove={handleApprove}
                      onReview={handleReview}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          {/* System Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Recent notifications and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">All systems running smoothly</p>
                  </div>
                ) : (
                  alerts.map(alert => (
                    <AlertItem key={alert.id} alert={alert} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🚀 Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/users">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/clients">
                  <UserCircle className="h-4 w-4 mr-2" />
                  Manage Clients
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/transactions">
                  <FileText className="h-4 w-4 mr-2" />
                  View Transactions
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/admin/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  System Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
} 