"use client";

import * as React from "react";
import { databases, COLLECTIONS } from "@/lib/appwrite";
import { Query } from "appwrite";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");

  const loadTransactions = React.useCallback(async () => {
    try {
      setLoading(true);

      const queries: any[] = [
        Query.orderDesc('createdAt'),
        Query.limit(100)
      ];

      if (typeFilter !== "all") {
        queries.push(Query.equal('type', typeFilter));
      }

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WALLET_TRANSACTIONS,
        queries
      );

      setTransactions(response.documents);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  React.useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filteredTransactions = React.useMemo(() => {
    if (!searchQuery) return transactions;

    return transactions.filter(tx =>
      tx.userId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [transactions, searchQuery]);

  const stats = React.useMemo(() => {
    const topups = transactions.filter(t => t.type === 'topup').reduce((sum, t) => sum + (t.amount || 0), 0);
    const withdrawals = transactions.filter(t => t.type === 'withdraw').reduce((sum, t) => sum + (t.amount || 0), 0);
    const bookings = transactions.filter(t => t.type === 'booking_hold').reduce((sum, t) => sum + (t.amount || 0), 0);

    return { topups, withdrawals, bookings, total: transactions.length };
  }, [transactions]);

  const getTypeIcon = (type: string) => {
    if (type === 'topup') return <ArrowDownRight className="h-4 w-4 text-green-600" />;
    if (type === 'withdraw') return <ArrowUpRight className="h-4 w-4 text-blue-600" />;
    return <ArrowUpRight className="h-4 w-4 text-orange-600" />;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      topup: 'bg-green-100 text-green-800',
      withdraw: 'bg-blue-100 text-blue-800',
      booking_hold: 'bg-orange-100 text-orange-800',
      booking_release: 'bg-purple-100 text-purple-800',
      booking_refund: 'bg-red-100 text-red-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
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
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-gray-600 mt-2">View all wallet transactions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Top-ups</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">₦{stats.topups.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Withdrawals</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">₦{stats.withdrawals.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Booking Payments</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">₦{stats.bookings.toLocaleString()}</p>
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
                placeholder="Search by user ID, reference, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="topup">Top-ups</SelectItem>
                <SelectItem value="withdraw">Withdrawals</SelectItem>
                <SelectItem value="booking_hold">Booking Holds</SelectItem>
                <SelectItem value="booking_release">Releases</SelectItem>
                <SelectItem value="booking_refund">Refunds</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadTransactions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.$id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getTypeIcon(tx.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{tx.description}</p>
                        <Badge className={getTypeBadge(tx.type)}>
                          {tx.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        User: {tx.userId} • Ref: {tx.reference}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(tx.createdAt).toLocaleString('en-NG')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className={`font-semibold text-lg ${
                      tx.type === 'topup' || tx.type === 'booking_release'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {tx.type === 'topup' || tx.type === 'booking_release' ? '+' : '-'}
                      ₦{(tx.amount || 0).toLocaleString()}
                    </p>
                    <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                      {tx.status}
                    </Badge>
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
