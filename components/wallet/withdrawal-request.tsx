"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, Loader2, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { WorkerPayoutService, type BankAccount, type WithdrawalRequest } from "@/lib/worker-payout-service";
import { WithdrawalWorkflowService } from "@/lib/withdrawal-workflow-service";

interface WithdrawalRequestProps {
  userId: string;
  availableBalance: number;
  onWithdrawalRequested?: () => void;
  isDialogOpen?: boolean;
  onDialogOpenChange?: (open: boolean) => void;
}

export function WithdrawalRequest({ 
  userId, 
  availableBalance, 
  onWithdrawalRequested,
  isDialogOpen: externalDialogOpen,
  onDialogOpenChange: externalDialogOpenChange
}: WithdrawalRequestProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
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

  const MIN_WITHDRAWAL = 100; // ₦100 (Paystack minimum transfer amount)

  // Load data
  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setIsLoadingData(true);
      if (!userId) {
        console.error('No userId provided');
        toast.error('User ID is required');
        return;
      }
      
      const [accounts, withdrawalHistory] = await Promise.all([
        WorkerPayoutService.getUserBankAccounts(userId),
        WorkerPayoutService.getWithdrawalHistory(userId, 20)
      ]);
      setBankAccounts(accounts);
      setWithdrawals(withdrawalHistory);
    } catch (error) {
      console.error('Error loading withdrawal data:', error);
      toast.error(`Failed to load withdrawal information: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    console.log('[WithdrawalRequest] User input:', { amount, withdrawalAmount });
    
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
      
      // Use the new withdrawal workflow service
      const result = await WithdrawalWorkflowService.initiateWithdrawal({
        userId,
        amount: withdrawalAmount,
        bankAccountId: selectedBankAccount,
        reason: 'Withdrawal request from worker dashboard'
      });

      if (result.success) {
        toast.success(result.message);
        setIsDialogOpen(false);
        resetForm();
        loadData();
        console.log('[WithdrawalRequest] Calling onWithdrawalRequested callback');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getBankAccountDisplay = (bankAccountId: string) => {
    const account = bankAccounts.find(acc => acc.$id === bankAccountId);
    if (!account) return 'Unknown Account';
    return `${account.bankName} - ${account.accountNumber}`;
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
              Withdraw your earnings to your bank account
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleWithdrawalRequest} disabled={isRequesting}>
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
            <CardTitle>Withdrawals</CardTitle>
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
                  Withdraw your earnings to your bank account
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleWithdrawalRequest} disabled={isRequesting}>
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
              You need to add a bank account before you can request withdrawals.
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
            {withdrawals.length === 0 ? (
              <div className="text-center py-8">
                <ArrowUpRight className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No withdrawal requests yet</p>
                <p className="text-sm text-gray-500">
                  Your withdrawal history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-medium">Recent Withdrawals</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Bank Account</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((withdrawal, index) => (
                      <TableRow key={withdrawal.$id || `withdrawal-${index}`}>
                        <TableCell>
                          {new Date(withdrawal.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {getBankAccountDisplay(withdrawal.bankAccountId)}
                        </TableCell>
                        <TableCell className="font-medium">
                          ₦{withdrawal.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(withdrawal.status)}
                            <Badge className={getStatusColor(withdrawal.status)}>
                              {withdrawal.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {withdrawal.reference}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 