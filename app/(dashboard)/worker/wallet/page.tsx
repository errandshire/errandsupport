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
import { VirtualWalletService } from "@/lib/virtual-wallet-service";
// Amounts in wallet/balances are stored in kobo; use EscrowUtils.formatAmount to render NGN
import { BalanceCard } from "@/components/wallet/balance-card";
import { TransactionList } from "@/components/wallet/transaction-list";
import { BankAccountSetup } from "@/components/wallet/bank-account-setup";
import { WithdrawalRequest } from "@/components/wallet/withdrawal-request";
import type { UserBalance, Transaction, EscrowTransaction } from "@/lib/types";
import type { VirtualWallet } from "@/lib/virtual-wallet-service";
import { toast } from "sonner";

export default function WorkerWalletPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [balance, setBalance] = React.useState<UserBalance | null>(null);
  const [virtualWallet, setVirtualWallet] = React.useState<VirtualWallet | null>(null);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [walletTransactions, setWalletTransactions] = React.useState<any[]>([]);
  const [escrowTransactions, setEscrowTransactions] = React.useState<EscrowTransaction[]>([]);
  const [showWithdrawalDialog, setShowWithdrawalDialog] = React.useState(false);

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
      console.log('[Wallet] Fetched user balance:', userBalance);
      setBalance(userBalance);

      // Fetch virtual wallet
      let wallet = await VirtualWalletService.getUserWallet(user.$id);
      if (!wallet) {
        // Initialize virtual wallet for worker if it doesn't exist
        wallet = await VirtualWalletService.initializeWallet(user.$id);
      }
      setVirtualWallet(wallet);

      // Fetch virtual wallet transactions
      const walletTxs = await VirtualWalletService.getWalletTransactions(user.$id, 50);
      setWalletTransactions(walletTxs);

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
    if (!balance && !virtualWallet) return null;

    const pendingEscrows = escrowTransactions.filter(tx => tx.status === 'held').length;
    const completedJobs = escrowTransactions.filter(tx => tx.status === 'released').length;
    
    // Calculate earnings from both regular transactions and wallet transactions
    const thisMonthEarnings = [
      ...transactions.filter(tx => {
        const txDate = new Date(tx.createdAt);
        const now = new Date();
        return txDate.getMonth() === now.getMonth() && 
               txDate.getFullYear() === now.getFullYear() &&
               tx.type.includes('release');
      }),
      ...walletTransactions.filter(tx => {
        const txDate = new Date(tx.createdAt);
        const now = new Date();
        return txDate.getMonth() === now.getMonth() && 
               txDate.getFullYear() === now.getFullYear() &&
               tx.type === 'earnings_credit';
      })
    ].reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    // Total available balance combines both systems
    const totalAvailableBalance = (balance?.availableBalance || 0) + (virtualWallet?.availableBalance || 0);
    const totalEarnings = (balance?.totalEarnings || 0) + (virtualWallet?.totalDeposits || 0);

    return {
      pendingEscrows,
      completedJobs,
      thisMonthEarnings,
      totalJobs: escrowTransactions.length,
      totalAvailableBalance,
      totalEarnings,
      virtualWalletBalance: virtualWallet?.availableBalance || 0
    };
  }, [balance, virtualWallet, transactions, walletTransactions, escrowTransactions]);

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
          <Button variant="outline" size="sm" onClick={() => {
            console.log('[Wallet] Manual refresh triggered');
            fetchWalletData();
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Force Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Virtual Wallet Card */}
      {virtualWallet && (
        <Card className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-white">Virtual Wallet</CardTitle>
                  <p className="text-emerald-100 text-sm">Instant access to your earnings</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {virtualWallet.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Available Balance */}
              <div>
                <p className="text-emerald-100 text-sm mb-1">Available Balance</p>
                <p className="text-3xl font-bold">{EscrowUtils.formatAmount(virtualWallet.availableBalance)}</p>
                <p className="text-emerald-100 text-xs mt-1">Ready to withdraw</p>
              </div>

              {/* Total Earnings */}
              <div>
                <p className="text-emerald-100 text-sm mb-1">Total Earned</p>
                <p className="text-xl font-semibold">{EscrowUtils.formatAmount(virtualWallet.totalDeposits)}</p>
                <p className="text-emerald-100 text-xs mt-1">All time earnings</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-white/20">
              <p className="text-emerald-100 text-sm mb-3">Quick Actions</p>
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  onClick={() => setShowWithdrawalDialog(true)}
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Withdraw
                </Button>
                <Button 
                  variant="secondary" 
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  onClick={() => {
                    // Switch to the "all" tab to show transaction history
                    const tabsList = document.querySelector('[role="tablist"]');
                    const allTab = document.querySelector('[value="all"]');
                    if (allTab) {
                      (allTab as HTMLElement).click();
                    }
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View History
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Virtual Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{EscrowUtils.formatAmount(stats.virtualWalletBalance)}</div>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-xs text-neutral-500 mt-1">Ready to withdraw</p>
            </CardContent>
          </Card>

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
              <CardTitle className="text-sm font-medium text-neutral-500">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{EscrowUtils.formatAmount(stats.totalEarnings)}</div>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-xs text-neutral-500 mt-1">All time</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Virtual Wallet Info */}
      {virtualWallet && virtualWallet.availableBalance > 0 && (
        <Alert className="mb-6 border-emerald-200 bg-emerald-50">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800">
            <strong>🎉 New!</strong> You have <strong>{EscrowUtils.formatAmount(virtualWallet.availableBalance)}</strong> in your virtual wallet.
            Earnings from completed bookings are now automatically added to your virtual wallet for instant access.
          </AlertDescription>
        </Alert>
      )}

      {/* Withdrawal Info */}
      {balance && balance.availableBalance > 0 && (
        <Alert className="mb-8 border-blue-200 bg-blue-50">
          <DollarSign className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            You have <strong>{EscrowUtils.formatAmount(balance.availableBalance)}</strong> in legacy balance available for withdrawal.
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
      <Tabs defaultValue="wallet" className="space-y-6">
        <TabsList>
          <TabsTrigger value="wallet">Wallet Earnings</TabsTrigger>
          <TabsTrigger value="payout">Payouts</TabsTrigger>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="earnings">Legacy Earnings</TabsTrigger>
          <TabsTrigger value="escrow">Escrow History</TabsTrigger>
        </TabsList>

        <TabsContent value="wallet">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Virtual Wallet Earnings</CardTitle>
              <p className="text-sm text-neutral-600">Recent earnings credited to your virtual wallet</p>
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
              ) : walletTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 mb-2">No wallet earnings yet</p>
                  <p className="text-xs text-gray-400">Complete bookings to start earning in your virtual wallet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {walletTransactions.map((transaction) => (
                    <div key={transaction.$id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          transaction.type === 'earnings_credit' ? 'bg-emerald-100' : 
                          transaction.type === 'withdrawal_pending' ? 'bg-yellow-100' :
                          'bg-blue-100'
                        }`}>
                          {transaction.type === 'earnings_credit' ? (
                            <DollarSign className="h-6 w-6 text-emerald-600" />
                          ) : transaction.type === 'withdrawal_pending' ? (
                            <ArrowUpRight className="h-6 w-6 text-yellow-600" />
                          ) : (
                            <RefreshCw className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Ref: {transaction.reference.slice(-8)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <p className={`font-semibold text-lg ${
                          transaction.amount > 0 ? 'text-emerald-600' : 'text-gray-900'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}₦{Math.abs(transaction.amount).toLocaleString()}
                        </p>
                        <Badge 
                          variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                          className={`text-xs ${transaction.status === 'completed' ? 'bg-green-100 text-green-800' : ''}`}
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

        <TabsContent value="payout">
          <div className="space-y-6">
            <BankAccountSetup 
              userId={user?.$id || ''} 
              onBankAccountAdded={fetchWalletData}
            />
            <WithdrawalRequest 
              userId={user?.$id || ''} 
              availableBalance={balance?.availableBalance || 0}
              onWithdrawalRequested={async () => {
                console.log('[Wallet] onWithdrawalRequested callback triggered');
                // Add a small delay to ensure database updates are complete
                setTimeout(async () => {
                  console.log('[Wallet] Refreshing wallet data after withdrawal');
                  await fetchWalletData();
                }, 1000);
              }}
            />
          </div>
        </TabsContent>

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

      {/* Withdrawal Dialog */}
      <WithdrawalRequest 
        userId={user?.$id || ''} 
        availableBalance={balance?.availableBalance || 0}
        isDialogOpen={showWithdrawalDialog}
        onDialogOpenChange={setShowWithdrawalDialog}
        onWithdrawalRequested={async () => {
          console.log('[Wallet] onWithdrawalRequested callback triggered (Quick Action)');
          // Add a small delay to ensure database updates are complete
          setTimeout(async () => {
            console.log('[Wallet] Refreshing wallet data after withdrawal (Quick Action)');
            await fetchWalletData();
          }, 1000);
          setShowWithdrawalDialog(false);
        }}
      />
    </>
  );
} 