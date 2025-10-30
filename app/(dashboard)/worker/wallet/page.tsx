"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { WalletService } from "@/lib/wallet.service";
import { PaystackService } from "@/lib/paystack.service";
import { databases, COLLECTIONS } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import type { Wallet, WalletTransaction, BankAccount, Withdrawal } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownRight, Loader2, Eye, EyeOff, Building2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function WorkerWalletPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const [wallet, setWallet] = React.useState<Wallet | null>(null);
  const [transactions, setTransactions] = React.useState<WalletTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([]);
  const [banks, setBanks] = React.useState<Array<{ name: string; code: string }>>([]);
  const [isLoadingWallet, setIsLoadingWallet] = React.useState(true);
  const [showBalance, setShowBalance] = React.useState(true);

  // Withdraw modal
  const [showWithdrawModal, setShowWithdrawModal] = React.useState(false);
  const [withdrawAmount, setWithdrawAmount] = React.useState('');
  const [selectedBankAccount, setSelectedBankAccount] = React.useState('');
  const [isProcessingWithdraw, setIsProcessingWithdraw] = React.useState(false);

  // Add bank modal
  const [showAddBankModal, setShowAddBankModal] = React.useState(false);
  const [newBank, setNewBank] = React.useState({
    accountNumber: '',
    bankCode: '',
    accountName: ''
  });
  const [isVerifyingAccount, setIsVerifyingAccount] = React.useState(false);
  const [isAddingBank, setIsAddingBank] = React.useState(false);

  React.useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      router.replace("/login?callbackUrl=/worker/wallet");
      return;
    }

    if (user.role !== "worker") {
      router.replace(`/${user.role}`);
      return;
    }

    loadWalletData();
    loadBanks();
  }, [loading, isAuthenticated, user, router]);

  const loadWalletData = async () => {
    if (!user) return;

    try {
      setIsLoadingWallet(true);
      const [walletData, transactionsData, bankAccountsData] = await Promise.all([
        WalletService.getOrCreateWallet(user.$id),
        WalletService.getTransactions(user.$id, 50),
        loadBankAccounts()
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

  const loadBankAccounts = async (): Promise<BankAccount[]> => {
    if (!user) return [];

    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS,
        [Query.equal('userId', user.$id)]
      );

      const accounts = response.documents as unknown as BankAccount[];
      setBankAccounts(accounts);
      return accounts;
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      return [];
    }
  };

  const loadBanks = async () => {
    try {
      const bankList = await PaystackService.getBanks();
      setBanks(bankList);
    } catch (error) {
      console.error('Error loading banks:', error);
    }
  };

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

      setNewBank(prev => ({
        ...prev,
        accountName: result.accountName
      }));

      toast.success(`Account verified: ${result.accountName}`);
    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to verify account');
    } finally {
      setIsVerifyingAccount(false);
    }
  };

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
    if (isNaN(amount) || amount < 100) {
      toast.error('Minimum withdrawal amount is ₦100');
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

      // Generate reference
      const reference = PaystackService.generateReference('withdraw');

      // Deduct from wallet first
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
          amount,
          bankAccountId: selectedBankAccount,
          status: 'pending',
          reference,
          createdAt: new Date().toISOString()
        }
      );

      // Initiate Paystack transfer
      await PaystackService.initiateTransfer({
        amountInNaira: amount,
        recipientCode: bankAccount.paystackRecipientCode!,
        reference,
        reason: 'Wallet withdrawal'
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

      toast.success('Withdrawal initiated! Funds will arrive within 24 hours.');
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
        <p className="text-gray-600 mt-2">View your earnings and withdraw funds</p>
      </div>

      {isLoadingWallet ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Balance Card */}
          <Card className="bg-gradient-to-br from-green-500 to-green-700 text-white">
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
                  <p className="text-green-100 text-sm">Available Balance</p>
                  <p className="text-4xl font-bold mt-1">
                    {showBalance ? `₦${(wallet?.balance ?? 0).toLocaleString()}` : '••••••'}
                  </p>
                </div>

                <div className="pt-4 border-t border-green-400/30">
                  <Button
                    onClick={() => setShowWithdrawModal(true)}
                    disabled={!wallet || wallet.balance < 100 || bankAccounts.length === 0}
                    className="w-full bg-white text-green-700 hover:bg-green-50"
                  >
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Withdraw Money
                  </Button>
                  {bankAccounts.length === 0 && (
                    <p className="text-green-100 text-xs mt-2 text-center">
                      Add a bank account to withdraw
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Earned</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">₦{(wallet?.totalEarned ?? 0).toLocaleString() || '0'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Bank Accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{bankAccounts.length}</p>
                  <Button size="sm" variant="outline" onClick={() => setShowAddBankModal(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bank Accounts */}
          {bankAccounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Saved Bank Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bankAccounts.map((account) => (
                    <div key={account.$id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{account.bankName}</p>
                          <p className="text-sm text-gray-600">{account.accountNumber} - {account.accountName}</p>
                        </div>
                      </div>
                      {account.isDefault && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Default</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
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
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          tx.type === 'booking_release' ? 'bg-green-100 text-green-600' :
                          tx.type === 'withdraw' ? 'bg-blue-100 text-blue-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {tx.type === 'booking_release' ? (
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
                          tx.type === 'booking_release' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {tx.type === 'booking_release' ? '+' : '-'}₦{(tx.amount ?? 0).toLocaleString()}
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

      {/* Withdraw Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Transfer money to your bank account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Bank Account</Label>
              <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.$id} value={account.$id}>
                      {account.bankName} - {account.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="withdraw-amount">Amount (₦)</Label>
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="Minimum ₦100"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min="100"
                max={wallet?.balance}
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-1">
                Available: ₦{(wallet?.balance ?? 0).toLocaleString()}
              </p>
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
        </DialogContent>
      </Dialog>

      {/* Add Bank Modal */}
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
              <Label>Bank</Label>
              <Select
                value={newBank.bankCode}
                onValueChange={(value) => setNewBank(prev => ({ ...prev, bankCode: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select your bank" />
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
              <Label htmlFor="account-number">Account Number</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="account-number"
                  placeholder="0123456789"
                  value={newBank.accountNumber}
                  onChange={(e) => setNewBank(prev => ({ ...prev, accountNumber: e.target.value }))}
                  maxLength={10}
                />
                <Button
                  onClick={handleVerifyAccount}
                  disabled={isVerifyingAccount || !newBank.accountNumber || !newBank.bankCode}
                >
                  {isVerifyingAccount ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Verify'
                  )}
                </Button>
              </div>
            </div>

            {newBank.accountName && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm font-medium text-green-900">{newBank.accountName}</p>
              </div>
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
              disabled={isAddingBank || !newBank.accountName}
            >
              {isAddingBank ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Bank'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
