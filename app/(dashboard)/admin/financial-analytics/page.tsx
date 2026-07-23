"use client";

import * as React from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet,
  CreditCard,
  BarChart3,
  RefreshCw,
  Calendar,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { financialAnalyticsService, type FinancialAnalytics } from "@/lib/financial-analytics-service";
import { toast } from "sonner";

interface StatsCardProps {
  title: string;
  value: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  trendLabel?: string;
  variant?: "default" | "success" | "danger" | "warning";
}

const StatsCard = React.memo(({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  trendLabel,
  variant = "default"
}: StatsCardProps) => {
  const variantColors = {
    default: "text-neutral-900",
    success: "text-green-600",
    danger: "text-red-600",
    warning: "text-orange-600"
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-neutral-500 flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variantColors[variant]}`}>{value}</div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(trend).toFixed(1)}%</span>
            {trendLabel && <span className="text-neutral-500 ml-1">{trendLabel}</span>}
          </div>
        )}
        {description && !trend && <p className="text-xs text-neutral-500 mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
});

const formatNaira = (amount: number) => {
  return `₦${amount.toLocaleString('en-NG')}`;
};

const formatCompactNaira = (amount: number) => {
  if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(1)}K`;
  return `₦${amount.toLocaleString()}`;
};

export default function FinancialAnalyticsPage() {
  const [analytics, setAnalytics] = React.useState<FinancialAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [period, setPeriod] = React.useState("all");

  const loadAnalytics = React.useCallback(async (force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`/api/admin/financial-analytics?period=${period}`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        throw new Error(data.message || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Error loading financial analytics:', error);
      toast.error('Failed to load financial analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  React.useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center py-12">
          <Activity className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2">Failed to load analytics</h2>
          <Button onClick={() => loadAnalytics(true)}>Try Again</Button>
        </div>
      </div>
    );
  }

  const { summary, monthlyRevenue, transactionsByType, recentTransactions, withdrawalsByStatus, periodComparison } = analytics;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Financial Analytics</h1>
          <p className="text-gray-600 mt-2">Track revenue, commissions, money flow, and withdrawals</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => loadAnalytics(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Revenue (20% Commission)"
          value={formatNaira(summary.totalRevenue)}
          icon={DollarSign}
          trend={periodComparison.revenueChange}
          trendLabel="vs last month"
          variant="success"
        />
        <StatsCard
          title="Total Money In"
          value={formatNaira(summary.totalMoneyIn)}
          description="Top-ups + booking holds"
          icon={ArrowDownLeft}
        />
        <StatsCard
          title="Total Money Out"
          value={formatNaira(summary.totalMoneyOut)}
          description="Worker payments + withdrawals"
          icon={ArrowUpRight}
          variant="danger"
        />
        <StatsCard
          title="Net Platform Profit"
          value={formatNaira(summary.netProfit)}
          description={`${summary.totalCompletedJobs} completed jobs`}
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Withdrawals"
          value={formatNaira(summary.totalWithdrawals)}
          icon={CreditCard}
          trend={periodComparison.withdrawalsChange}
          trendLabel="vs last month"
        />
        <StatsCard
          title="Pending Withdrawals"
          value={formatNaira(summary.pendingWithdrawals)}
          icon={Wallet}
          variant="warning"
        />
        <StatsCard
          title="Escrow Balance"
          value={formatNaira(summary.escrowBalance)}
          description="Held in active bookings"
          icon={Wallet}
        />
        <StatsCard
          title="Avg. Commission/Job"
          value={formatNaira(summary.averageCommissionPerJob)}
          description="Per completed job"
          icon={BarChart3}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Revenue & Money Flow</CardTitle>
            <CardDescription>Revenue, money in, and money out over time</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyRevenue.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No monthly data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 text-xs font-medium text-gray-500 border-b pb-2">
                  <span>Month</span>
                  <span className="text-right">Revenue</span>
                  <span className="text-right">Money In</span>
                  <span className="text-right">Money Out</span>
                </div>
                {[...monthlyRevenue].reverse().slice(0, 12).map((month) => (
                  <div key={`${month.year}-${month.monthNumber}`} className="grid grid-cols-4 text-sm py-2 border-b border-gray-100 last:border-0">
                    <span className="font-medium">{month.month}</span>
                    <span className="text-right text-green-600">{formatCompactNaira(month.revenue)}</span>
                    <span className="text-right text-blue-600">{formatCompactNaira(month.moneyIn)}</span>
                    <span className="text-right text-red-600">{formatCompactNaira(month.moneyOut)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Types */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions by Type</CardTitle>
            <CardDescription>Volume and value breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsByType.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No transactions found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactionsByType.map((type) => (
                  <div key={type.type} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{type.label}</p>
                      <p className="text-xs text-gray-500">{type.count} transactions</p>
                    </div>
                    <p className="font-semibold">{formatCompactNaira(type.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest financial activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No recent transactions</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentTransactions.map((tx) => (
                  <div key={tx.$id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{tx.description || tx.type}</p>
                      <p className="text-xs text-gray-500 truncate">{tx.reference || tx.userId}</p>
                      <p className="text-xs text-gray-400">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-NG') : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className={`font-semibold ${tx.type === 'commission' || tx.type === 'topup' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatNaira(Math.abs(tx.amount))}
                      </p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {tx.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Withdrawals by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Status</CardTitle>
            <CardDescription>Withdrawal distribution by status</CardDescription>
          </CardHeader>
          <CardContent>
            {withdrawalsByStatus.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No withdrawals found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawalsByStatus.map((status) => (
                  <div key={status.status} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm capitalize">{status.status}</p>
                      <p className="text-xs text-gray-500">{status.count} requests</p>
                    </div>
                    <p className="font-semibold">{formatNaira(status.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
