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
  Settings,
  Eye,
  EyeOff
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
import { formatCurrency } from "@/lib/utils";
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
  const [showBalance, setShowBalance] = React.useState(true);
  
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
    if (isNaN(amount) || amount < 50) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-900 mb-2">
            My Wallet
          </h1>
          <p className="text-neutral-600 text-sm sm:text-base">
            Manage your virtual wallet, payment history, and spending.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button variant="outline" size="sm" onClick={fetchWalletData} className="h-9">
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="outline" size="sm" className="h-9 hidden sm:flex">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 h-9" asChild>
            <Link href="/workers">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Book Service</span>
              <span className="sm:hidden">Book</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Virtual Wallet Card */}
      {virtualWallet && (
        <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <Wallet className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <CardTitle className="text-white text-base sm:text-lg">Virtual Wallet</CardTitle>
                  <p className="text-blue-100 text-xs sm:text-sm">Instant payments & quick bookings</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBalance(!showBalance)}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                  {virtualWallet.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Available Balance */}
              <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                <p className="text-blue-100 text-xs sm:text-sm mb-1">Available Balance</p>
                <p className="text-2xl sm:text-3xl font-bold">
                  {showBalance ? formatCurrency(virtualWallet.availableBalance) : '₦••••••'}
                </p>
                <p className="text-blue-100 text-xs mt-1">Ready to spend</p>
              </div>

              

              {/* Quick Actions */}
              <div className="flex flex-col gap-2 col-span-1 sm:col-span-2 lg:col-span-1">
                <Dialog open={showTopUpModal} onOpenChange={setShowTopUpModal}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-white/30 h-10 sm:h-11">
                      <Plus className="h-4 w-4 mr-2" />
                      Top Up
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="text-black sm:max-w-md">
                    <DialogHeader className="space-y-2">
                      <DialogTitle className="text-xl font-serif">Top Up Wallet</DialogTitle>
                      <DialogDescription className="text-sm">
                        Add funds to your virtual wallet for instant payments
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="topup-amount">Amount (₦)</Label>
                        <Input
                          id="topup-amount"
                          type="number"
                          min="100"
                          max="1000000"
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(e.target.value)}
                          placeholder="Enter amount (min: ₦100)"
                          className="h-12 text-base"
                        />
                      </div>
                      <div className="flex flex-col gap-3 pt-2">
                        <Button
                          onClick={handleTopUp}
                          disabled={isProcessingTopUp}
                          className="w-full h-12 bg-emerald-500 hover:bg-emerald-600"
                        >
                          {isProcessingTopUp ? 'Processing...' : 'Proceed to Payment'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowTopUpModal(false)}
                          className="w-full h-12"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showWithdrawalModal} onOpenChange={setShowWithdrawalModal}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="secondary" 
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 h-10 sm:h-11"
                      disabled={virtualWallet.availableBalance < 500}
                    >
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Withdraw
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="text-black sm:max-w-md">
                    <DialogHeader className="space-y-2">
                      <DialogTitle className="text-xl font-serif">Withdraw Funds</DialogTitle>
                      <DialogDescription className="text-sm">
                        Withdraw funds from your virtual wallet to your bank account
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="withdrawal-amount">Amount (₦)</Label>
                        <Input
                          id="withdrawal-amount"
                          type="number"
                          min="500"
                          max={virtualWallet.availableBalance}
                          value={withdrawalAmount}
                          onChange={(e) => setWithdrawalAmount(e.target.value)}
                          placeholder={`Min: ₦500, Max: ${formatCurrency(virtualWallet.availableBalance)}`}
                          className="h-12 text-base"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="account-number">Account Number</Label>
                          <Input
                            id="account-number"
                            value={bankDetails.accountNumber}
                            onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                            placeholder="0123456789"
                            className="h-12 text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bank-code">Bank Code</Label>
                          <Input
                            id="bank-code"
                            value={bankDetails.bankCode}
                            onChange={(e) => setBankDetails({...bankDetails, bankCode: e.target.value})}
                            placeholder="058"
                            className="h-12 text-base"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="account-name">Account Name</Label>
                        <Input
                          id="account-name"
                          value={bankDetails.accountName}
                          onChange={(e) => setBankDetails({...bankDetails, accountName: e.target.value})}
                          placeholder="John Doe"
                          className="h-12 text-base"
                        />
                      </div>
                      <div className="flex flex-col gap-3 pt-2">
                        <Button
                          onClick={handleWithdrawal}
                          disabled={isProcessingWithdrawal}
                          className="w-full h-12 bg-emerald-500 hover:bg-emerald-600"
                        >
                          {isProcessingWithdrawal ? 'Processing...' : 'Request Withdrawal'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowWithdrawalModal(false)}
                          className="w-full h-12"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Spending Limits */}
            <div className="pt-4 sm:pt-6 border-t border-white/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-blue-100 text-xs sm:text-sm mb-2">Daily Spending</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-white rounded-full h-2 transition-all"
                        style={{ 
                          width: `${Math.min((virtualWallet.currentDailySpent / virtualWallet.dailySpendLimit) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-blue-100 mt-1">
                    <span>{formatCurrency(virtualWallet.currentDailySpent)}</span>
                    <span>{formatCurrency(virtualWallet.dailySpendLimit)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-blue-100 text-xs sm:text-sm mb-2">Monthly Spending</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-white rounded-full h-2 transition-all"
                        style={{ 
                          width: `${Math.min((virtualWallet.currentMonthlySpent / virtualWallet.monthlySpendLimit) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-blue-100 mt-1">
                    <span>{formatCurrency(virtualWallet.currentMonthlySpent)}</span>
                    <span>{formatCurrency(virtualWallet.monthlySpendLimit)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-neutral-500 truncate">Total Spent</p>
              <div className="text-lg sm:text-2xl font-bold mt-1">{EscrowUtils.formatAmount(stats.totalSpent)}</div>
              <p className="text-xs text-neutral-500 mt-1">All time</p>
            </div>
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-neutral-500 truncate">Wallet Balance</p>
              <div className="text-lg sm:text-2xl font-bold mt-1">
                {virtualWallet ? formatCurrency(virtualWallet.availableBalance) : '₦0'}
              </div>
              <p className="text-xs text-neutral-500 mt-1">Available</p>
            </div>
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 flex-shrink-0" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-neutral-500 truncate">Pending</p>
              <div className="text-lg sm:text-2xl font-bold mt-1">{stats.pendingPayments}</div>
              <p className="text-xs text-neutral-500 mt-1">In escrow</p>
            </div>
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
          </div>
        </Card>

        <Card className="p-4 sm:p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-neutral-500 truncate">Completed</p>
              <div className="text-lg sm:text-2xl font-bold mt-1">{stats.completedBookings}</div>
              <p className="text-xs text-neutral-500 mt-1">Services</p>
            </div>
            <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 flex-shrink-0" />
          </div>
        </Card>
      </div>

      {/* Benefits Info */}
      {virtualWallet && virtualWallet.availableBalance > 0 && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <Wallet className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800 text-sm sm:text-base">
            <strong>Instant Booking Available!</strong> You have {formatCurrency(virtualWallet.availableBalance)} in your wallet. 
            Book services instantly without payment delays.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Link href="/workers" className="block">
          <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
            <CardContent className="p-4 sm:p-6 text-center">
              <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1 text-sm sm:text-base">Book a Service</h3>
              <p className="text-xs sm:text-sm text-gray-600">Find and hire workers</p>
            </CardContent>
          </Card>
        </Link>

        <Card 
          className="hover:bg-gray-50 transition-colors cursor-pointer" 
          onClick={() => setShowTopUpModal(true)}
        >
          <CardContent className="p-4 sm:p-6 text-center">
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 mx-auto mb-2" />
            <h3 className="font-medium text-gray-900 mb-1 text-sm sm:text-base">Top Up Wallet</h3>
            <p className="text-xs sm:text-sm text-gray-600">Add funds for instant payments</p>
          </CardContent>
        </Card>

        <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
          <CardContent className="p-4 sm:p-6 text-center">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 mx-auto mb-2" />
            <h3 className="font-medium text-gray-900 mb-1 text-sm sm:text-base">Security Settings</h3>
            <p className="text-xs sm:text-sm text-gray-600">Manage limits & security</p>
          </CardContent>
        </Card>
      </div>

      {/* No Transactions State */}
      {!isLoading && escrowTransactions.length === 0 && walletTransactions.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm sm:text-base">
            You haven't made any transactions yet. 
            <Link href="/workers" className="font-medium text-blue-600 hover:underline ml-1">
              Book your first service
            </Link> to get started!
          </AlertDescription>
        </Alert>
      )}

      {/* Transactions */}
      <Tabs defaultValue="all" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-3 h-10 sm:h-11">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All Transactions</TabsTrigger>
            <TabsTrigger value="wallet" className="text-xs sm:text-sm">Wallet</TabsTrigger>
            <TabsTrigger value="bookings" className="text-xs sm:text-sm">Bookings</TabsTrigger>
          </TabsList>
        </div>

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
              <CardTitle className="text-sm sm:text-base">Wallet Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3 sm:space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 border rounded-lg">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gray-200 rounded animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-16 sm:w-20 animate-pulse flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : walletTransactions.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <Wallet className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 mb-2">No wallet transactions found</p>
                  <Button size="sm" onClick={() => setShowTopUpModal(true)} className="h-9">
                    Top Up Your Wallet
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {walletTransactions.map((transaction) => (
                    <div key={transaction.$id} className="flex items-center justify-between p-3 sm:p-4 border border-gray-100 rounded-lg">
                      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          transaction.amount > 0 ? 'bg-emerald-100' : 'bg-blue-100'
                        }`}>
                          {transaction.amount > 0 ? (
                            <ArrowUpLeft className="h-4 w-4 sm:h-6 sm:w-6 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                            {transaction.description}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Ref: {transaction.reference.slice(-8)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1 sm:space-y-2 flex-shrink-0 ml-3">
                        <p className={`font-semibold text-sm sm:text-lg ${
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

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Booking Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3 sm:space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 border rounded-lg">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gray-200 rounded animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-16 sm:w-20 animate-pulse flex-shrink-0" />
                    </div>
                  ))}
                </div>
              ) : escrowTransactions.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <Receipt className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 mb-2">No bookings found</p>
                  <Button size="sm" asChild className="h-9">
                    <Link href="/workers">Book Your First Service</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {escrowTransactions.map((transaction) => (
                    <div key={transaction.$id} className="flex items-center justify-between p-3 sm:p-4 border border-gray-100 rounded-lg">
                      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CreditCard className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                            Booking #{transaction.bookingId.slice(-8)}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Platform Fee: {EscrowUtils.formatAmount(transaction.platformFee)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1 sm:space-y-2 flex-shrink-0 ml-3">
                        <p className="font-semibold text-sm sm:text-lg">
                          {EscrowUtils.formatAmount(transaction.amount)}
                        </p>
                        <Badge 
                          variant={
                            transaction.status === 'released' ? 'default' : 
                            transaction.status === 'held' ? 'secondary' : 
                            transaction.status === 'refunded' ? 'outline' :
                            'outline'
                          }
                          className={`text-xs ${
                            transaction.status === 'released' ? 'bg-green-100 text-green-800' :
                            transaction.status === 'held' ? 'bg-yellow-100 text-yellow-800' :
                            transaction.status === 'refunded' ? 'bg-blue-100 text-blue-800' :
                            ''
                          }`}
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
    </div>
  );
} 