"use client";

import * as React from "react";
import { databases, COLLECTIONS } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, RefreshCw, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const loadWithdrawals = React.useCallback(async () => {
    try {
      setLoading(true);

      const queries: any[] = [
        Query.orderDesc('createdAt'),
        Query.limit(100)
      ];

      if (statusFilter !== "all") {
        queries.push(Query.equal('status', statusFilter));
      }

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS,
        queries
      );

      setWithdrawals(response.documents);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  const filteredWithdrawals = React.useMemo(() => {
    if (!searchQuery) return withdrawals;

    return withdrawals.filter(w =>
      w.userId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.reference?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [withdrawals, searchQuery]);

  const stats = React.useMemo(() => {
    const pending = withdrawals.filter(w => w.status === 'pending');
    const processing = withdrawals.filter(w => w.status === 'processing');
    const completed = withdrawals.filter(w => w.status === 'completed');
    const failed = withdrawals.filter(w => w.status === 'failed');

    const totalAmount = withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
    const completedAmount = completed.reduce((sum, w) => sum + (w.amount || 0), 0);

    return {
      pending: pending.length,
      processing: processing.length,
      completed: completed.length,
      failed: failed.length,
      totalAmount,
      completedAmount
    };
  }, [withdrawals]);

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === 'failed') return <XCircle className="h-4 w-4 text-red-600" />;
    return <Clock className="h-4 w-4 text-orange-600" />;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Withdrawals</h1>
        <p className="text-gray-600 mt-2">Monitor all withdrawal requests from workers and clients</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Withdrawals</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₦{stats.totalAmount.toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-1">{withdrawals.length} requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">₦{stats.completedAmount.toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-1">{stats.completed} processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Status Summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-orange-600">Pending:</span>
                <span className="font-semibold">{stats.pending}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Processing:</span>
                <span className="font-semibold">{stats.processing}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600">Failed:</span>
                <span className="font-semibold">{stats.failed}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by user ID or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadWithdrawals}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawals List */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests ({filteredWithdrawals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredWithdrawals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No withdrawals found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWithdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.$id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getStatusIcon(withdrawal.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">Withdrawal Request</p>
                        <Badge className={getStatusBadge(withdrawal.status)}>
                          {withdrawal.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        User: {withdrawal.userId}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        Ref: {withdrawal.reference} • Bank Account: {withdrawal.bankAccountId}
                      </p>
                      <p className="text-xs text-gray-400">
                        Created: {new Date(withdrawal.createdAt).toLocaleString('en-NG')}
                        {withdrawal.completedAt && ` • Completed: ${new Date(withdrawal.completedAt).toLocaleString('en-NG')}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="font-semibold text-lg text-blue-600">
                      ₦{(withdrawal.amount || 0).toLocaleString()}
                    </p>
                    {withdrawal.failureReason && (
                      <p className="text-xs text-red-600 mt-1 max-w-xs truncate">
                        {withdrawal.failureReason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
