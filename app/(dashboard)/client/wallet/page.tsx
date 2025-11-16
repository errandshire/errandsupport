"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { WalletService } from "@/lib/wallet.service";
import { PaystackService } from "@/lib/paystack.service";
import { SettingsService } from "@/lib/settings.service";
import type { Wallet, WalletTransaction } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownRight, Loader2, Eye, EyeOff, Check } from "lucide-react";
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

  // Withdrawal modal
  const [showWithdrawModal, setShowWithdrawModal] = React.useState(false);
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [isProcessingWithdraw, setIsProcessingWithdraw] = React.useState(false);
  const [bankAccounts, setBankAccounts] = React.useState<any[]>([]);
  const [selectedBankAccount, setSelectedBankAccount] = React.useState('');

  // Add bank modal
  const [showAddBankModal, setShowAddBankModal] = React.useState(false);
  const [banks, setBanks] = React.useState<any[]>([]);
  const [newBank, setNewBank] = React.useState({ accountNumber: '', bankCode: '', accountName: '' });
  const [isVerifyingAccount, setIsVerifyingAccount] = React.useState(false);
  const [isAddingBank, setIsAddingBank] = React.useState(false);

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
      const { databases, COLLECTIONS } = await import('@/lib/appwrite');
      const { Query } = await import('appwrite');

      const [walletData, transactionsData, bankAccountsData] = await Promise.all([
        WalletService.getOrCreateWallet(user.$id),
        WalletService.getTransactions(user.$id, 50),
        databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.BANK_ACCOUNTS,
          [Query.equal('userId', user.$id)]
        )
      ]);

      setWallet(walletData);
      setTransactions(transactionsData);
      setBankAccounts(bankAccountsData.documents);
    } catch (error) {
      console.error('Error loading wallet:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setIsLoadingWallet(false);
    }
  };

  // Load banks list
  const loadBanks = React.useCallback(async () => {
    try {
      const banksList = await PaystackService.getBanks();
      setBanks(banksList);
    } catch (error) {
      console.error('Error loading banks:', error);
    }
  }, []);

  // Load bank accounts
  const loadBankAccounts = React.useCallback(async () => {
    if (!user) return;
    try {
      const { databases, COLLECTIONS } = await import('@/lib/appwrite');
      const { Query } = await import('appwrite');
      const bankAccountsData = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS,
        [Query.equal('userId', user.$id)]
      );
      setBankAccounts(bankAccountsData.documents);
    } catch (error) {
      console.error('Error loading bank accounts:', error);
    }
  }, [user]);

  // Load banks when modal opens
  React.useEffect(() => {
    if (showAddBankModal) {
      loadBanks();
    }
  }, [showAddBankModal, loadBanks]);

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

  // Verify account
  const handleVerifyAccount = async () => {
    if (!newBank.accountNumber || !newBank.bankCode) {
      toast.error('Please enter account number and select bank');
      return;
    }

    try {
      setIsVerifyingAccount(true);
      const result = await PaystackService.verifyBankAccount({
        accountNumber: newBank.accountNumber,
        bankCode: newBank.bankCode
      });

      setNewBank(prev => ({ ...prev, accountName: result.accountName }));
      toast.success(`Account verified: ${result.accountName}`);
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to verify account');
    } finally {
      setIsVerifyingAccount(false);
    }
  };

  // Add bank account
  const handleAddBank = async () => {
    if (!user || !newBank.accountNumber || !newBank.bankCode || !newBank.accountName) {
      toast.error('Please verify account first');
      return;
    }

    try {
      setIsAddingBank(true);

      // Create recipient on Paystack
      const recipient = await PaystackService.createRecipient({
        accountNumber: newBank.accountNumber,
        bankCode: newBank.bankCode,
        accountName: newBank.accountName
      });

      // Save to database
      const { databases, COLLECTIONS } = await import('@/lib/appwrite');
      const { ID } = await import('appwrite');
      const bankName = banks.find(b => b.code === newBank.bankCode)?.name || 'Unknown Bank';

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS,
        ID.unique(),
        {
          userId: user.$id,
          accountNumber: newBank.accountNumber,
          accountName: newBank.accountName,
          bankName,
          bankCode: newBank.bankCode,
          paystackRecipientCode: recipient.recipientCode,
          isDefault: bankAccounts.length === 0,
          createdAt: new Date().toISOString()
        }
      );

      toast.success('Bank account added successfully');
      setShowAddBankModal(false);
      setNewBank({ accountNumber: '', bankCode: '', accountName: '' });
      loadBankAccounts();

    } catch (error) {
      console.error('Add bank error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add bank account');
    } finally {
      setIsAddingBank(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user || !withdrawAmount || !selectedBankAccount) {
      toast.error('Please fill all fields');
      return;
    }

    const amount = parseFloat(withdrawAmount);

    // Validate amount with settings
    const validation = await SettingsService.validateWithdrawalAmount(amount);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    if (isNaN(amount)) {
      toast.error('Invalid amount');
      return;
    }

    if (!wallet || amount > wallet.balance) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      setIsProcessingWithdraw(true);

      const bankAccount = bankAccounts.find(b => b.$id === selectedBankAccount);
      if (!bankAccount) {
        throw new Error('Invalid bank account');
      }

      // Calculate withdrawal fee using settings service
      const { fee: deduction, netAmount: amountToReceive } = await SettingsService.calculateWithdrawalFee(amount);
      const settings = await SettingsService.getSettings();

      // Import required services
      const { databases, COLLECTIONS } = await import('@/lib/appwrite');
      const { ID } = await import('appwrite');

      // Generate reference
      const reference = PaystackService.generateReference('withdraw');

      // Deduct from wallet
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        wallet.$id,
        {
          balance: wallet.balance - amount,
          updatedAt: new Date().toISOString()
        }
      );

      // Create withdrawal record
      const withdrawal = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS,
        ID.unique(),
        {
          userId: user.$id,
          amount: amountToReceive, // Amount after fee deduction
          bankAccountId: selectedBankAccount,
          status: 'pending',
          reference,
          createdAt: new Date().toISOString()
        }
      );

      // Initiate Paystack transfer (with deducted amount)
      await PaystackService.initiateTransfer({
        amountInNaira: amountToReceive,
        recipientCode: bankAccount.paystackRecipientCode!,
        reference,
        reason: `Wallet withdrawal (${settings.clientWithdrawalFeePercent}% service fee applied)`
      });

      // Update withdrawal status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS,
        withdrawal.$id,
        {
          status: 'processing'
        }
      );

      // Create transaction record for the deduction
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WALLET_TRANSACTIONS,
        `deduction_${reference}`,
        {
          userId: user.$id,
          type: 'withdraw',
          amount: deduction,
          reference: `deduction_${reference}`,
          status: 'completed',
          description: `Service fee (20% of ₦${amount.toLocaleString()})`,
          createdAt: new Date().toISOString()
        }
      );

      // Send SMS notification
      try {
        const { TermiiSMSService } = await import('@/lib/termii-sms.service');
        if (user.phone) {
          await TermiiSMSService.sendPaymentNotification(user.phone, {
            amount: amountToReceive,
            type: 'withdrawal',
            reference
          });
        }
      } catch (smsError) {
        console.error('Failed to send SMS:', smsError);
      }

      toast.success(`Withdrawal initiated! You'll receive ₦${amountToReceive.toLocaleString()} (₦${deduction.toLocaleString()} service fee deducted).`);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setSelectedBankAccount('');
      loadWalletData();

    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process withdrawal');
    } finally {
      setIsProcessingWithdraw(false);
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

                {/* {wallet && wallet.escrow > 0 && (
                  <div className="pt-4 border-t border-blue-400/30">
                    <p className="text-blue-100 text-sm">In Escrow (Active Bookings)</p>
                    <p className="text-2xl font-semibold mt-1">
                      {showBalance ? `₦${(wallet?.escrow ?? 0).toLocaleString()}` : '••••••'}
                    </p>
                  </div>
                )} */}

                <div className="pt-4 border-t border-blue-400/30 space-y-2">
                  <Button
                    onClick={() => setShowTopUpModal(true)}
                    className="w-full bg-white text-blue-700 hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Money
                  </Button>
                  <Button
                    onClick={() => setShowWithdrawModal(true)}
                    variant="outline"
                    className="w-full bg-white border-white text-blue-100 hover:bg-blue-600"
                  >
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Withdraw Money
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

      {/* Withdraw Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Money</DialogTitle>
            <DialogDescription>
              Withdraw funds to your bank account (20% service fee applies)
            </DialogDescription>
          </DialogHeader>

          {bankAccounts.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-gray-600 mb-4">No bank account added yet</p>
              <Button onClick={() => {
                setShowWithdrawModal(false);
                setShowAddBankModal(true);
              }}>
                Add Bank Account
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="withdraw-amount">Amount (₦)</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="Enter amount (min ₦100)"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    min="100"
                    className="mt-2"
                  />
                  {withdrawAmount && parseFloat(withdrawAmount) >= 100 && (
                    <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded text-sm">
                      <p className="text-orange-800">
                        Service fee (20%): <strong>₦{(parseFloat(withdrawAmount) * 0.20).toLocaleString()}</strong>
                      </p>
                      <p className="text-orange-900 font-semibold mt-1">
                        You'll receive: <strong>₦{(parseFloat(withdrawAmount) * 0.80).toLocaleString()}</strong>
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="bank-account">Bank Account</Label>
                  <select
                    id="bank-account"
                    value={selectedBankAccount}
                    onChange={(e) => setSelectedBankAccount(e.target.value)}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select bank account</option>
                    {bankAccounts.map((account) => (
                      <option key={account.$id} value={account.$id}>
                        {account.bankName} - {account.accountNumber} ({account.accountName})
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setShowWithdrawModal(false);
                      setShowAddBankModal(true);
                    }}
                    className="mt-2 p-0 h-auto text-sm"
                  >
                    + Add new bank account
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowWithdrawModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleWithdraw} disabled={isProcessingWithdraw}>
                  {isProcessingWithdraw ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Withdraw'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Bank Account Modal */}
      <Dialog open={showAddBankModal} onOpenChange={setShowAddBankModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <DialogDescription>
              Add your bank account for withdrawals
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="bank">Select Bank</Label>
              <Select
                value={newBank.bankCode}
                onValueChange={(value) => setNewBank(prev => ({ ...prev, bankCode: value, accountName: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose your bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                placeholder="0123456789"
                value={newBank.accountNumber}
                onChange={(e) => setNewBank(prev => ({ ...prev, accountNumber: e.target.value, accountName: '' }))}
                maxLength={10}
              />
            </div>

            {newBank.accountNumber.length === 10 && newBank.bankCode && !newBank.accountName && (
              <Button
                onClick={handleVerifyAccount}
                disabled={isVerifyingAccount}
                variant="outline"
                className="w-full"
              >
                {isVerifyingAccount ? 'Verifying...' : 'Verify Account'}
              </Button>
            )}

            {newBank.accountName && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>Account Verified</AlertTitle>
                <AlertDescription>{newBank.accountName}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddBankModal(false);
              setNewBank({ accountNumber: '', bankCode: '', accountName: '' });
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddBank}
              disabled={!newBank.accountName || isAddingBank}
            >
              {isAddingBank ? 'Adding...' : 'Add Bank Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
