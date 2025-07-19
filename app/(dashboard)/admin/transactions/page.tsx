"use client";

import * as React from "react";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  TrendingDown,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { EscrowService } from "@/lib/escrow-service";
import { EscrowUtils, ESCROW_STATUS } from "@/lib/escrow-utils";
import { BalanceCard } from "@/components/wallet/balance-card";
import { TransactionList } from "@/components/wallet/transaction-list";
import type { EscrowTransaction, UserBalance, Transaction } from "@/lib/types";
import { toast } from "sonner";

interface TransactionOverview {
  totalEscrowAmount: number;
  totalPlatformFees: number;
  activeEscrows: number;
  completedTransactions: number;
  totalUsers: number;
  totalWorkerEarnings: number;
}

export default function AdminTransactionsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [escrowTransactions, setEscrowTransactions] = React.useState<EscrowTransaction[]>([]);
  const [userBalances, setUserBalances] = React.useState<UserBalance[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [overview, setOverview] = React.useState<TransactionOverview>({
    totalEscrowAmount: 0,
    totalPlatformFees: 0,
    activeEscrows: 0,
    completedTransactions: 0,
    totalUsers: 0,
    totalWorkerEarnings: 0
  });
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [dateFilter, setDateFilter] = React.useState("all");

  // Fetch all transaction data
  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);

      // Check if online
      if (!navigator.onLine) {
        toast.error("You're offline. Please check your internet connection.");
        return;
      }

      // Import database functions
      const { databases, COLLECTIONS } = await import('@/lib/appwrite');
      const { Query } = await import('appwrite');

      // Fetch escrow transactions
      const escrowResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.ESCROW_TRANSACTIONS,
        [Query.orderDesc('createdAt'), Query.limit(100)]
      );

      // Fetch user balances
      const balancesResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USER_BALANCES,
        [Query.orderDesc('updatedAt'), Query.limit(100)]
      );

      // Fetch transaction logs
      const transactionsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.TRANSACTIONS,
        [Query.orderDesc('createdAt'), Query.limit(100)]
      );

      const escrowData = escrowResponse.documents as unknown as EscrowTransaction[];
      const balanceData = balancesResponse.documents as unknown as UserBalance[];
      const transactionData = transactionsResponse.documents as unknown as Transaction[];

      setEscrowTransactions(escrowData);
      setUserBalances(balanceData);
      setTransactions(transactionData);

      // Calculate overview statistics
      const totalEscrowAmount = escrowData.reduce((sum, tx) => sum + tx.amount, 0);
      const totalPlatformFees = escrowData.reduce((sum, tx) => sum + tx.platformFee, 0);
      const activeEscrows = escrowData.filter(tx => tx.status === ESCROW_STATUS.HELD).length;
      const completedTransactions = escrowData.filter(tx => tx.status === ESCROW_STATUS.RELEASED).length;
      const totalWorkerEarnings = balanceData.reduce((sum, balance) => sum + balance.totalEarnings, 0);

      setOverview({
        totalEscrowAmount,
        totalPlatformFees,
        activeEscrows,
        completedTransactions,
        totalUsers: balanceData.length,
        totalWorkerEarnings
      });

    } catch (error) {
      console.error('Error fetching transaction data:', error);
      toast.error('Failed to load transaction data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Listen for online/offline events
  React.useEffect(() => {
    const handleOnline = () => {
      toast.success("You're back online!");
      fetchData();
    };

    const handleOffline = () => {
      toast.error("You're offline. Some features may be unavailable.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchData]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter escrow transactions
  const filteredEscrowTransactions = React.useMemo(() => {
    let filtered = escrowTransactions;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(tx => 
        tx.bookingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.clientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.workerId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [escrowTransactions, statusFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case ESCROW_STATUS.HELD:
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Held</Badge>;
      case ESCROW_STATUS.RELEASED:
        return <Badge variant="default" className="bg-green-100 text-green-800">Released</Badge>;
      case ESCROW_STATUS.REFUNDED:
        return <Badge variant="outline" className="border-blue-200 text-blue-800">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
            Transaction Management
          </h1>
          <p className="text-neutral-600">
            Monitor all platform transactions, escrow payments, and user balances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Total Escrow Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{EscrowUtils.formatAmount(overview.totalEscrowAmount)}</div>
              <DollarSign className="h-4 w-4 text-neutral-400" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">All active + completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Platform Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{EscrowUtils.formatAmount(overview.totalPlatformFees)}</div>
              <TrendingUp className="h-4 w-4 text-neutral-400" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">Total collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Active Escrows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{overview.activeEscrows}</div>
              <Clock className="h-4 w-4 text-neutral-400" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">Pending release</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Worker Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{EscrowUtils.formatAmount(overview.totalWorkerEarnings)}</div>
              <Users className="h-4 w-4 text-neutral-400" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">{overview.totalUsers} active wallets</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="escrow" className="space-y-6">
        <TabsList>
          <TabsTrigger value="escrow">Escrow Transactions</TabsTrigger>
          <TabsTrigger value="balances">User Balances</TabsTrigger>
          <TabsTrigger value="logs">Transaction Logs</TabsTrigger>
        </TabsList>

        {/* Escrow Transactions Tab */}
        <TabsContent value="escrow">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Escrow Transactions ({filteredEscrowTransactions.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="held">Held</SelectItem>
                      <SelectItem value="released">Released</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="h-12 w-12 bg-gray-200 rounded animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-20 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : filteredEscrowTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">No escrow transactions found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEscrowTransactions.map((transaction) => (
                    <div key={transaction.$id || transaction.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            Booking #{(transaction.bookingId || '').slice(-8) || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(transaction.createdAt).toLocaleDateString()} • 
                            Platform Fee: {EscrowUtils.formatAmount(transaction.platformFee)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Client: {(transaction.clientId || '').slice(-8) || 'N/A'} → Worker: {(transaction.workerId || '').slice(-8) || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="font-semibold text-lg">
                          {EscrowUtils.formatAmount(transaction.amount)}
                        </p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Balances Tab */}
        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle>User Balances ({userBalances.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-8 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : userBalances.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">No user balances found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userBalances.map((balance) => (
                    <BalanceCard
                      key={balance.$id}
                      balance={balance}
                      userRole="admin"
                      showDetails={true}
                      className="h-full"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction Logs Tab */}
        <TabsContent value="logs">
          <TransactionList
            transactions={transactions}
            escrowTransactions={escrowTransactions}
            userRole="admin"
            isLoading={isLoading}
            showFilters={true}
          />
        </TabsContent>
      </Tabs>
    </>
  );
} 