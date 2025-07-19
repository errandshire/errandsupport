"use client";

import * as React from "react";
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Download,
  ArrowUpRight,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { EscrowService } from "@/lib/escrow-service";
import { EscrowUtils } from "@/lib/escrow-utils";
import { BalanceCard } from "@/components/wallet/balance-card";
import { TransactionList } from "@/components/wallet/transaction-list";
import type { UserBalance, Transaction, EscrowTransaction } from "@/lib/types";
import { toast } from "sonner";

export default function WorkerWalletPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [balance, setBalance] = React.useState<UserBalance | null>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [escrowTransactions, setEscrowTransactions] = React.useState<EscrowTransaction[]>([]);

  // Fetch wallet data
  const fetchWalletData = React.useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Check if online
      if (!navigator.onLine) {
        toast.error("You're offline. Please check your internet connection.");
        return;
      }

      // Fetch user balance
      const userBalance = await EscrowService.getUserBalance(user.$id);
      setBalance(userBalance);

      // Fetch transaction history
      const userTransactions = await EscrowService.getUserTransactions(user.$id, 50);
      setTransactions(userTransactions);

      // Fetch escrow transactions for this worker
      const workerEscrowTxs = await EscrowService.getUserEscrowTransactions(user.$id, 'worker', 50);
      setEscrowTransactions(workerEscrowTxs);

    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast.error('Failed to load wallet data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Listen for online/offline events
  React.useEffect(() => {
    const handleOnline = () => {
      toast.success("You're back online!");
      fetchWalletData();
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
  }, [fetchWalletData]);

  React.useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // Calculate stats
  const stats = React.useMemo(() => {
    if (!balance) return null;

    const pendingEscrows = escrowTransactions.filter(tx => tx.status === 'held').length;
    const completedJobs = escrowTransactions.filter(tx => tx.status === 'released').length;
    const thisMonthEarnings = transactions
      .filter(tx => {
        const txDate = new Date(tx.createdAt);
        const now = new Date();
        return txDate.getMonth() === now.getMonth() && 
               txDate.getFullYear() === now.getFullYear() &&
               tx.type.includes('release');
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      pendingEscrows,
      completedJobs,
      thisMonthEarnings,
      totalJobs: escrowTransactions.length
    };
  }, [balance, transactions, escrowTransactions]);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
            Your Wallet
          </h1>
          <p className="text-neutral-600">
            Track your earnings, pending payments, and transaction history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchWalletData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="mb-8">
        <BalanceCard
          balance={balance}
          userRole="worker"
          isLoading={isLoading}
          onRefresh={fetchWalletData}
          showDetails={true}
        />
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{EscrowUtils.formatAmount(stats.thisMonthEarnings)}</div>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-xs text-neutral-500 mt-1">Monthly earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Pending Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.pendingEscrows}</div>
                <Clock className="h-4 w-4 text-yellow-500" />
              </div>
              <p className="text-xs text-neutral-500 mt-1">In escrow</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Completed Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.completedJobs}</div>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-xs text-neutral-500 mt-1">Payments released</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Total Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.totalJobs}</div>
                <ArrowUpRight className="h-4 w-4 text-neutral-400" />
              </div>
              <p className="text-xs text-neutral-500 mt-1">All time</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Withdrawal Info */}
      {balance && balance.availableBalance > 0 && (
        <Alert className="mb-8 border-emerald-200 bg-emerald-50">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800">
            You have <strong>{EscrowUtils.formatAmount(balance.availableBalance)}</strong> available for withdrawal.
            Withdrawals are processed within 1-3 business days.
          </AlertDescription>
        </Alert>
      )}

      {/* No Earnings State */}
      {!isLoading && (!balance || balance.totalEarnings === 0) && (
        <Alert className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You haven't received any payments yet. Complete your first job to start earning!
          </AlertDescription>
        </Alert>
      )}

      {/* Transactions */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="escrow">Escrow History</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <TransactionList
            transactions={transactions}
            escrowTransactions={escrowTransactions}
            userRole="worker"
            isLoading={isLoading}
            showFilters={true}
          />
        </TabsContent>

        <TabsContent value="earnings">
          <TransactionList
            transactions={transactions.filter(tx => tx.type.includes('release'))}
            escrowTransactions={[]}
            userRole="worker"
            isLoading={isLoading}
            showFilters={false}
          />
        </TabsContent>

        <TabsContent value="escrow">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Escrow Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
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
              ) : escrowTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">No escrow transactions found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {escrowTransactions.map((transaction) => (
                    <div key={transaction.$id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            Booking #{transaction.bookingId.slice(-8)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Worker Amount: {EscrowUtils.formatAmount(transaction.workerAmount)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="font-semibold text-lg">
                          {EscrowUtils.formatAmount(transaction.amount)}
                        </p>
                        <Badge 
                          variant={
                            transaction.status === 'released' ? 'default' : 
                            transaction.status === 'held' ? 'secondary' : 
                            'outline'
                          }
                          className={
                            transaction.status === 'released' ? 'bg-green-100 text-green-800' :
                            transaction.status === 'held' ? 'bg-yellow-100 text-yellow-800' :
                            ''
                          }
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
} 