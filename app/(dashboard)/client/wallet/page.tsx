"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { WalletService } from "@/lib/wallet.service";
import { PaystackService } from "@/lib/paystack.service";
import type { Wallet, WalletTransaction } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownRight, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function ClientWalletPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const [wallet, setWallet] = React.useState<Wallet | null>(null);
  const [transactions, setTransactions] = React.useState<WalletTransaction[]>([]);
  const [isLoadingWallet, setIsLoadingWallet] = React.useState(true);
  const [showBalance, setShowBalance] = React.useState(true);

  // Top-up modal
  const [showTopUpModal, setShowTopUpModal] = React.useState(false);
  const [topUpAmount, setTopUpAmount] = React.useState('');
  const [isProcessingTopUp, setIsProcessingTopUp] = React.useState(false);

  // Redirect if not authenticated or not client
  React.useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/client/wallet");
      return;
    }

    if (user.role !== "client") {
      router.replace(`/${user.role}`);
      return;
    }

    loadWalletData();
  }, [loading, isAuthenticated, user, router]);

  const loadWalletData = async () => {
    if (!user) return;

    try {
      setIsLoadingWallet(true);
      const [walletData, transactionsData] = await Promise.all([
        WalletService.getOrCreateWallet(user.$id),
        WalletService.getTransactions(user.$id, 50)
      ]);

      setWallet(walletData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading wallet:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setIsLoadingWallet(false);
    }
  };

  const handleTopUp = async () => {
    if (!user || !topUpAmount) {
      toast.error('Please enter an amount');
      return;
    }

    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount < 100) {
      toast.error('Minimum top-up amount is ₦100');
      return;
    }

    try {
      setIsProcessingTopUp(true);

      // Generate unique reference
      const reference = PaystackService.generateReference('topup');

      // Initialize payment
      const payment = await PaystackService.initializePayment({
        amountInNaira: amount,
        email: user.email,
        reference,
        callbackUrl: `${window.location.origin}/client/wallet`,
        metadata: {
          type: 'wallet_topup',
          userId: user.$id
        }
      });

      // Redirect to Paystack
      window.location.href = payment.authorizationUrl;

    } catch (error) {
      console.error('Top-up error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initialize payment');
      setIsProcessingTopUp(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Wallet</h1>
        <p className="text-gray-600 mt-2">Manage your funds and transactions</p>
      </div>

      {isLoadingWallet ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Balance Card */}
          <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WalletIcon className="h-5 w-5" />
                  <CardTitle className="text-white">Wallet Balance</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-white hover:bg-white/20"
                >
                  {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-blue-100 text-sm">Available Balance</p>
                  <p className="text-4xl font-bold mt-1">
                    {showBalance ? `₦${(wallet?.balance ?? 0).toLocaleString()}` : '••••••'}
                  </p>
                </div>

                {wallet && wallet.escrow > 0 && (
                  <div className="pt-4 border-t border-blue-400/30">
                    <p className="text-blue-100 text-sm">In Escrow (Active Bookings)</p>
                    <p className="text-2xl font-semibold mt-1">
                      {showBalance ? `₦${(wallet?.escrow ?? 0).toLocaleString()}` : '••••••'}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-blue-400/30">
                  <Button
                    onClick={() => setShowTopUpModal(true)}
                    className="w-full bg-white text-blue-700 hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Money
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Spent</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">₦{(wallet?.totalSpent ?? 0).toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Active Bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">₦{(wallet?.escrow ?? 0).toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your wallet activity</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <WalletIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.$id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          tx.type === 'topup' ? 'bg-green-100 text-green-600' :
                          tx.type === 'booking_hold' ? 'bg-orange-100 text-orange-600' :
                          tx.type === 'withdraw' ? 'bg-blue-100 text-blue-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {tx.type === 'topup' ? (
                            <ArrowDownRight className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{tx.description}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(tx.createdAt).toLocaleDateString('en-NG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          tx.type === 'topup' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {tx.type === 'topup' ? '+' : '-'}₦{(tx.amount ?? 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500 capitalize">{tx.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top-Up Modal */}
      <Dialog open={showTopUpModal} onOpenChange={setShowTopUpModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Money to Wallet</DialogTitle>
            <DialogDescription>
              Fund your wallet to book services
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="amount">Amount (₦)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount (min ₦100)"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                min="100"
                className="mt-2"
              />
            </div>

            <div className="flex gap-2">
              {[500, 1000, 2000, 5000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setTopUpAmount(amount.toString())}
                >
                  ₦{amount.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTopUpModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleTopUp} disabled={isProcessingTopUp}>
              {isProcessingTopUp ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Money
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
