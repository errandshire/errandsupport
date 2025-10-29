"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowUpRight, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { WorkerPayoutService, type BankAccount } from "@/lib/worker-payout-service";
import { VirtualWalletService } from "@/lib/virtual-wallet-service";

interface ClientWithdrawalRequestProps {
  userId: string;
  availableBalance: number;
  onWithdrawalRequested?: () => void;
  isDialogOpen?: boolean;
  onDialogOpenChange?: (open: boolean) => void;
}

export function ClientWithdrawalRequest({
  userId,
  availableBalance,
  onWithdrawalRequested,
  isDialogOpen: externalDialogOpen,
  onDialogOpenChange: externalDialogOpenChange
}: ClientWithdrawalRequestProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);

  // Use external dialog control if provided, otherwise use internal state
  const isDialogOpen = externalDialogOpen !== undefined ? externalDialogOpen : internalDialogOpen;
  const setIsDialogOpen = externalDialogOpenChange || setInternalDialogOpen;

  // Form state
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);

  const MIN_WITHDRAWAL = 500; // ₦500 minimum for clients

  // Load data on mount and when dialog opens
  useEffect(() => {
    loadData();
  }, [userId]);

  // Reload bank accounts when dialog opens to ensure fresh data
  useEffect(() => {
    if (isDialogOpen) {
      console.log('[ClientWithdrawalRequest] Dialog opened, reloading bank accounts');
      loadData();
    }
  }, [isDialogOpen]);

  const loadData = async () => {
    try {
      setIsLoadingData(true);
      if (!userId) {
        console.error('No userId provided');
        toast.error('User ID is required');
        return;
      }

      const accounts = await WorkerPayoutService.getUserBankAccounts(userId);
      setBankAccounts(accounts);
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      toast.error(`Failed to load bank accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingData(false);
      setIsLoading(false);
    }
  };

  const handleWithdrawalRequest = async () => {
    if (!selectedBankAccount || !amount) {
      toast.error('Please fill in all fields');
      return;
    }

    const withdrawalAmount = parseFloat(amount);
    console.log('[ClientWithdrawalRequest] User input:', { amount, withdrawalAmount });

    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (withdrawalAmount < MIN_WITHDRAWAL) {
      toast.error(`Minimum withdrawal amount is ₦${MIN_WITHDRAWAL.toLocaleString()}`);
      return;
    }

    if (withdrawalAmount > availableBalance) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      setIsRequesting(true);

      // Use VirtualWalletService for client withdrawals
      const result = await VirtualWalletService.requestWithdrawal({
        userId,
        amount: withdrawalAmount,
        bankAccountId: selectedBankAccount,
        reason: 'Withdrawal request from client wallet'
      });

      if (result.success) {
        toast.success(result.message);
        setIsDialogOpen(false);
        resetForm();
        loadData();
        console.log('[ClientWithdrawalRequest] Calling onWithdrawalRequested callback');
        onWithdrawalRequested?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process withdrawal request. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  const resetForm = () => {
    setSelectedBankAccount("");
    setAmount("");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // If externally controlled, only show the dialog
  if (externalDialogOpen !== undefined) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>
              Withdraw your funds to your bank account
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {bankAccounts.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You need to add a bank account first. Please add a bank account in the Bank Accounts section below.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="bankAccount">Bank Account</Label>
                  <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account, index) => (
                        <SelectItem key={account.$id || `bank-account-${index}`} value={account.$id}>
                          {account.bankName} - {account.accountNumber}
                          {account.isDefault && ' (Default)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount (₦)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder={`Minimum ₦${MIN_WITHDRAWAL.toLocaleString()}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={MIN_WITHDRAWAL}
                    max={availableBalance}
                  />
                  <p className="text-sm text-gray-500">
                    Available: ₦{availableBalance.toLocaleString()}
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleWithdrawalRequest}
              disabled={isRequesting || bankAccounts.length === 0}
            >
              {isRequesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Request Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Withdraw Funds</CardTitle>
            <CardDescription>
              Request withdrawals to your bank account
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                disabled={bankAccounts.length === 0 || availableBalance < MIN_WITHDRAWAL}
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Request Withdrawal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Request Withdrawal</DialogTitle>
                <DialogDescription>
                  Withdraw your funds to your bank account
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {bankAccounts.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You need to add a bank account first. Please add a bank account in the Bank Accounts section below.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="bankAccount">Bank Account</Label>
                      <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank account" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts.map((account, index) => (
                            <SelectItem key={account.$id || `bank-account-${index}`} value={account.$id}>
                              {account.bankName} - {account.accountNumber}
                              {account.isDefault && ' (Default)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Amount (₦)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder={`Minimum ₦${MIN_WITHDRAWAL.toLocaleString()}`}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min={MIN_WITHDRAWAL}
                        max={availableBalance}
                      />
                      <p className="text-sm text-gray-500">
                        Available: ₦{availableBalance.toLocaleString()}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleWithdrawalRequest}
                  disabled={isRequesting || bankAccounts.length === 0}
                >
                  {isRequesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Request Withdrawal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {bankAccounts.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need to add a bank account before you can request withdrawals. Please use the Bank Accounts section below to add your bank details.
            </AlertDescription>
          </Alert>
        ) : availableBalance < MIN_WITHDRAWAL ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need at least ₦{MIN_WITHDRAWAL.toLocaleString()} to request a withdrawal.
              Current balance: ₦{availableBalance.toLocaleString()}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Click "Request Withdrawal" to withdraw funds from your wallet to your bank account.
              Withdrawals are typically processed within 1-3 business days.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
