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
import { Trash2, Plus, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { WorkerPayoutService, type BankAccount } from "@/lib/worker-payout-service";

interface Bank {
  name: string;
  code: string;
  active: boolean;
  country: string;
  currency: string;
  type: string;
}

interface BankAccountSetupProps {
  userId: string;
  onBankAccountAdded?: () => void;
}

export function BankAccountSetup({ userId, onBankAccountAdded }: BankAccountSetupProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [selectedBank, setSelectedBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  // Load bank accounts and banks list
  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [accounts, banksList] = await Promise.all([
        WorkerPayoutService.getUserBankAccounts(userId),
        WorkerPayoutService.getBanks()
      ]);
      
      setBankAccounts(accounts);
      setBanks(banksList);
    } catch (error) {
      console.error('Error loading bank data:', error);
      toast.error('Failed to load bank information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBankAccount = async () => {
    if (!selectedBank || !accountNumber || !accountName) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsAddingAccount(true);
      
      // Find selected bank details
      const bank = banks.find(b => b.code === selectedBank);
      if (!bank) {
        toast.error('Invalid bank selected');
        return;
      }

      // Add bank account
      await WorkerPayoutService.addBankAccount(
        userId,
        accountNumber,
        selectedBank,
        bank.name,
        accountName
      );

      toast.success('Bank account added successfully');
      setIsDialogOpen(false);
      resetForm();
      loadData();
      onBankAccountAdded?.();
    } catch (error) {
      console.error('Error adding bank account:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add bank account');
    } finally {
      setIsAddingAccount(false);
    }
  };

  const handleSetDefault = async (bankAccountId: string) => {
    try {
      await WorkerPayoutService.setDefaultBankAccount(userId, bankAccountId);
      toast.success('Default bank account updated');
      loadData();
    } catch (error) {
      console.error('Error setting default bank account:', error);
      toast.error('Failed to set default bank account');
    }
  };

  const handleDeleteBankAccount = async (bankAccountId: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) {
      return;
    }

    try {
      await WorkerPayoutService.deleteBankAccount(bankAccountId);
      toast.success('Bank account deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting bank account:', error);
      toast.error('Failed to delete bank account');
    }
  };

  const resetForm = () => {
    setSelectedBank("");
    setAccountNumber("");
    setAccountName("");
  };

  const getBankName = (bankCode: string) => {
    return banks.find(b => b.code === bankCode)?.name || bankCode;
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Bank Accounts</CardTitle>
            <CardDescription>
              Add your bank accounts to receive withdrawals
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Bank Account</DialogTitle>
                <DialogDescription>
                  Enter your bank account details to receive withdrawals
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="bank">Bank</Label>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks
                        .filter(bank => bank.active)
                        .map((bank) => (
                          <SelectItem key={bank.code} value={bank.code}>
                            {bank.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    type="text"
                    placeholder="Enter 10-digit account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    maxLength={10}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    type="text"
                    placeholder="Enter account holder name"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddBankAccount} disabled={isAddingAccount}>
                  {isAddingAccount && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {bankAccounts.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">No bank accounts added yet</p>
            <p className="text-sm text-gray-500">
              Add a bank account to start receiving withdrawals
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bankAccounts.map((account, index) => (
              <div
                key={account.$id || `bank-account-${index}`}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {account.isDefault ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{getBankName(account.bankCode)}</p>
                      {account.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {account.accountName} • {account.accountNumber}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!account.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(account.$id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteBankAccount(account.$id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 