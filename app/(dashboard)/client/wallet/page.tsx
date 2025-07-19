"use client";

import * as React from "react";
import { 
  CreditCard, 
  TrendingDown, 
  Clock, 
  Download,
  ArrowUpLeft,
  RefreshCw,
  Plus,
  AlertCircle,
  Receipt,
  Wallet,
  ArrowUpRight,
  DollarSign,
  Shield,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { EscrowService } from "@/lib/escrow-service";
import { EscrowUtils } from "@/lib/escrow-utils";
import { VirtualWalletService } from "@/lib/virtual-wallet-service";
import { TransactionList } from "@/components/wallet/transaction-list";
import type { Transaction, EscrowTransaction } from "@/lib/types";
import type { VirtualWallet } from "@/lib/virtual-wallet-service";
import { toast } from "sonner";
import Link from "next/link";

export default function ClientWalletPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [escrowTransactions, setEscrowTransactions] = React.useState<EscrowTransaction[]>([]);
  const [virtualWallet, setVirtualWallet] = React.useState<VirtualWallet | null>(null);
  const [walletTransactions, setWalletTransactions] = React.useState<any[]>([]);
  const [walletStats, setWalletStats] = React.useState<any>(null);
  
  // Top-up modal state
  const [showTopUpModal, setShowTopUpModal] = React.useState(false);
  const [topUpAmount, setTopUpAmount] = React.useState('');
  const [isProcessingTopUp, setIsProcessingTopUp] = React.useState(false);
  
  // Withdrawal modal state
  const [showWithdrawalModal, setShowWithdrawalModal] = React.useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = React.useState('');
  const [bankDetails, setBankDetails] = React.useState({
    accountNumber: '',
    bankCode: '',
    accountName: ''
  });
  const [isProcessingWithdrawal, setIsProcessingWithdrawal] = React.useState(false);

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

      // Fetch escrow transaction history
      const userTransactions = await EscrowService.getUserTransactions(user.$id, 50);
      setTransactions(userTransactions);

      // Fetch escrow transactions for this client
      const clientEscrowTxs = await EscrowService.getUserEscrowTransactions(user.$id, 'client', 50);
      setEscrowTransactions(clientEscrowTxs);

      // Fetch virtual wallet
      let wallet = await VirtualWalletService.getUserWallet(user.$id);
      if (!wallet) {
        // Initialize wallet if it doesn't exist
        wallet = await VirtualWalletService.initializeWallet(user.$id);
      }
      setVirtualWallet(wallet);

      // Fetch wallet transactions
      const walletTxs = await VirtualWalletService.getWalletTransactions(user.$id, 50);
      setWalletTransactions(walletTxs);

      // Fetch wallet stats
      const stats = await VirtualWalletService.getWalletStats(user.$id);
      setWalletStats(stats);

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

  // Handle wallet top-up
  const handleTopUp = async () => {
    if (!user || !topUpAmount) return;

    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount < 100) {
      toast.error('Minimum top-up amount is ₦100');
      return;
    }

    try {
      setIsProcessingTopUp(true);
      
      const result = await VirtualWalletService.topUpWallet({
        userId: user.$id,
        amount,
        paymentMethod: 'card',
        description: 'Wallet top-up'
      });

      if (result.success && result.paymentUrl) {
        // Redirect to payment page
        window.location.href = result.paymentUrl;
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Top-up error:', error);
      toast.error('Failed to process top-up');
    } finally {
      setIsProcessingTopUp(false);
    }
  };

  // Handle withdrawal request
  const handleWithdrawal = async () => {
    if (!user || !withdrawalAmount) return;

    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount < 500) {
      toast.error('Minimum withdrawal amount is ₦500');
      return;
    }

    if (!bankDetails.accountNumber || !bankDetails.bankCode || !bankDetails.accountName) {
      toast.error('Please fill in all bank details');
      return;
    }

    try {
      setIsProcessingWithdrawal(true);
      
      const result = await VirtualWalletService.requestWithdrawal({
        userId: user.$id,
        amount,
        bankDetails,
        reason: 'Wallet withdrawal'
      });

      if (result.success) {
        toast.success(result.message);
        setShowWithdrawalModal(false);
        setWithdrawalAmount('');
        setBankDetails({ accountNumber: '', bankCode: '', accountName: '' });
        await fetchWalletData(); // Refresh data
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Failed to process withdrawal request');
    } finally {
      setIsProcessingWithdrawal(false);
    }
  };

  // Calculate spending stats
  const stats = React.useMemo(() => {
    const totalSpent = escrowTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const pendingPayments = escrowTransactions.filter(tx => tx.status === 'held').length;
    const completedBookings = escrowTransactions.filter(tx => tx.status === 'released').length;
    
    const thisMonthSpent = escrowTransactions
      .filter(tx => {
        const txDate = new Date(tx.createdAt);
        const now = new Date();
        return txDate.getMonth() === now.getMonth() && 
               txDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const refundedAmount = escrowTransactions
      .filter(tx => tx.status === 'refunded')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      totalSpent,
      pendingPayments,
      completedBookings,
      thisMonthSpent,
      refundedAmount,
      totalBookings: escrowTransactions.length
    };
  }, [escrowTransactions]);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
            My Wallet
          </h1>
          <p className="text-neutral-600">
            Manage your virtual wallet, payment history, and spending.
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
          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600" asChild>
            <Link href="/workers">
              <Plus className="h-4 w-4 mr-2" />
              Book Service
            </Link>
          </Button>
        </div>
      </div>

      {/* Virtual Wallet Card */}
      {virtualWallet && (
        <Card className="mb-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-white">Virtual Wallet</CardTitle>
                  <p className="text-blue-100">Instant payments & quick bookings</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {virtualWallet.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Available Balance */}
              <div>
                <p className="text-blue-100 text-sm mb-1">Available Balance</p>
                <p className="text-3xl font-bold">
                  ₦{virtualWallet.availableBalance.toLocaleString()}
                </p>
                <p className="text-blue-100 text-xs mt-1">Ready to spend</p>
              </div>

              {/* Pending Balance */}
              <div>
                <p className="text-blue-100 text-sm mb-1">Pending Balance</p>
                <p className="text-xl font-semibold">
                  ₦{virtualWallet.pendingBalance.toLocaleString()}
                </p>
                <p className="text-blue-100 text-xs mt-1">Processing...</p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col gap-2">
                <Dialog open={showTopUpModal} onOpenChange={setShowTopUpModal}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                      <Plus className="h-4 w-4 mr-2" />
                      Top Up
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="text-black">
                    <DialogHeader>
                      <DialogTitle>Top Up Wallet</DialogTitle>
                      <DialogDescription>
                        Add funds to your virtual wallet for instant payments
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="topup-amount">Amount (₦)</Label>
                        <Input
                          id="topup-amount"
                          type="number"
                          min="100"
                          max="1000000"
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(e.target.value)}
                          placeholder="Enter amount (min: ₦100)"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowTopUpModal(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleTopUp}
                          disabled={isProcessingTopUp}
                        >
                          {isProcessingTopUp ? 'Processing...' : 'Proceed to Payment'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showWithdrawalModal} onOpenChange={setShowWithdrawalModal}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="secondary" 
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                      disabled={virtualWallet.availableBalance < 500}
                    >
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Withdraw
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="text-black">
                    <DialogHeader>
                      <DialogTitle>Withdraw Funds</DialogTitle>
                      <DialogDescription>
                        Withdraw funds from your virtual wallet to your bank account
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="withdrawal-amount">Amount (₦)</Label>
                        <Input
                          id="withdrawal-amount"
                          type="number"
                          min="500"
                          max={virtualWallet.availableBalance}
                          value={withdrawalAmount}
                          onChange={(e) => setWithdrawalAmount(e.target.value)}
                          placeholder={`Enter amount (min: ₦500, max: ₦${virtualWallet.availableBalance.toLocaleString()})`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="account-number">Account Number</Label>
                          <Input
                            id="account-number"
                            value={bankDetails.accountNumber}
                            onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                            placeholder="0123456789"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bank-code">Bank Code</Label>
                          <Input
                            id="bank-code"
                            value={bankDetails.bankCode}
                            onChange={(e) => setBankDetails({...bankDetails, bankCode: e.target.value})}
                            placeholder="058"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="account-name">Account Name</Label>
                        <Input
                          id="account-name"
                          value={bankDetails.accountName}
                          onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowWithdrawalModal(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleWithdrawal}
                          disabled={isProcessingWithdrawal}
                        >
                          {isProcessingWithdrawal ? 'Processing...' : 'Request Withdrawal'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Spending Limits */}
            <div className="mt-6 pt-6 border-t border-white/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Daily Spending</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-white rounded-full h-2 transition-all"
                        style={{ 
                          width: `${Math.min((virtualWallet.currentDailySpent / virtualWallet.dailySpendLimit) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <span className="text-xs text-blue-100 whitespace-nowrap">
                      ₦{virtualWallet.currentDailySpent.toLocaleString()} / ₦{virtualWallet.dailySpendLimit.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-blue-100 text-sm mb-1">Monthly Spending</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-white rounded-full h-2 transition-all"
                        style={{ 
                          width: `${Math.min((virtualWallet.currentMonthlySpent / virtualWallet.monthlySpendLimit) * 100, 100)}%` 
                        }}
                      />
                    </div>
                    <span className="text-xs text-blue-100 whitespace-nowrap">
                      ₦{virtualWallet.currentMonthlySpent.toLocaleString()} / ₦{virtualWallet.monthlySpendLimit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{EscrowUtils.formatAmount(stats.totalSpent)}</div>
              <CreditCard className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">All time spending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Wallet Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {virtualWallet ? EscrowUtils.formatAmount(virtualWallet.availableBalance) : '₦0'}
              </div>
              <Wallet className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">Available for instant payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.pendingPayments}</div>
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">In escrow</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Completed Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.completedBookings}</div>
              <Receipt className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-xs text-neutral-500 mt-1">Services received</p>
          </CardContent>
        </Card>
      </div>

      {/* Benefits Info */}
      {virtualWallet && virtualWallet.availableBalance > 0 && (
        <Alert className="mb-8 border-emerald-200 bg-emerald-50">
          <Wallet className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800">
            <strong>Instant Booking Available!</strong> You have ₦{virtualWallet.availableBalance.toLocaleString()} in your wallet. 
            Book services instantly without payment delays.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="hover:bg-gray-50 transition-colors cursor-pointer" asChild>
          <Link href="/workers">
            <CardContent className="p-6 text-center">
              <Plus className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1">Book a Service</h3>
              <p className="text-sm text-gray-600">Find and hire workers</p>
            </CardContent>
          </Link>
        </Card>

        <Card 
          className="hover:bg-gray-50 transition-colors cursor-pointer" 
          onClick={() => setShowTopUpModal(true)}
        >
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Top Up Wallet</h3>
            <p className="text-sm text-gray-600">Add funds for instant payments</p>
          </CardContent>
        </Card>

        <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
          <CardContent className="p-6 text-center">
            <Shield className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <h3 className="font-medium text-gray-900 mb-1">Security Settings</h3>
            <p className="text-sm text-gray-600">Manage limits & security</p>
          </CardContent>
        </Card>
      </div>

      {/* No Transactions State */}
      {!isLoading && escrowTransactions.length === 0 && walletTransactions.length === 0 && (
        <Alert className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You haven't made any transactions yet. 
            <Link href="/workers" className="font-medium text-blue-600 hover:underline ml-1">
              Book your first service
            </Link> to get started!
          </AlertDescription>
        </Alert>
      )}

      {/* Transactions */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="wallet">Wallet Transactions</TabsTrigger>
          <TabsTrigger value="bookings">Booking Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <TransactionList
            transactions={transactions}
            escrowTransactions={escrowTransactions}
            userRole="client"
            isLoading={isLoading}
            showFilters={true}
          />
        </TabsContent>

        <TabsContent value="wallet">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Wallet Transaction History</CardTitle>
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
                  <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 mb-2">No wallet transactions found</p>
                  <Button size="sm" onClick={() => setShowTopUpModal(true)}>
                    Top Up Your Wallet
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {walletTransactions.map((transaction) => (
                    <div key={transaction.$id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          transaction.amount > 0 ? 'bg-emerald-100' : 'bg-blue-100'
                        }`}>
                          {transaction.amount > 0 ? (
                            <ArrowUpLeft className="h-6 w-6 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="h-6 w-6 text-blue-600" />
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
                          className={transaction.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
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

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking Payment History</CardTitle>
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
                  <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 mb-2">No bookings found</p>
                  <Button size="sm" asChild>
                    <Link href="/workers">Book Your First Service</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {escrowTransactions.map((transaction) => (
                    <div key={transaction.$id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <CreditCard className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            Booking #{transaction.bookingId.slice(-8)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Platform Fee: {EscrowUtils.formatAmount(transaction.platformFee)}
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
                            transaction.status === 'refunded' ? 'outline' :
                            'outline'
                          }
                          className={
                            transaction.status === 'released' ? 'bg-green-100 text-green-800' :
                            transaction.status === 'held' ? 'bg-yellow-100 text-yellow-800' :
                            transaction.status === 'refunded' ? 'bg-blue-100 text-blue-800' :
                            ''
                          }
                        >
                          {transaction.status === 'released' ? 'Completed' :
                           transaction.status === 'held' ? 'In Progress' :
                           transaction.status === 'refunded' ? 'Refunded' :
                           transaction.status}
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