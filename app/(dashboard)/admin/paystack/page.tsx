"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { PaystackService } from '@/lib/paystack';

export default function PaystackAdminPage() {
  const [balance, setBalance] = useState<any>(null);
  const [recipients, setRecipients] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPaystackData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const paystackService = new PaystackService();
      
      // Fetch balance
      const balanceData = await paystackService.getBalance();
      setBalance(balanceData);
      console.log('Paystack balance:', balanceData);
      
      // Fetch transfer recipients
      try {
        const recipientsData = await paystackService.getTransferRecipients();
        setRecipients(recipientsData);
        console.log('Paystack recipients:', recipientsData);
      } catch (recipientsError) {
        console.warn('Failed to fetch recipients:', recipientsError);
        // Don't fail the whole request if recipients fail
      }
    } catch (err) {
      console.error('Failed to fetch Paystack data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaystackData();
  }, []);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount / 100); // Convert from kobo to Naira
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paystack Account</h1>
          <p className="text-muted-foreground">
            Monitor your Paystack account balance and status
          </p>
        </div>
        <Button onClick={fetchPaystackData} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {balance && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Account Balance</span>
              </CardTitle>
              <CardDescription>
                Current available balance in your Paystack account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatAmount(balance.data?.[0]?.balance || 0)}
              </div>
              <div className="mt-2 space-y-1">
                <Badge variant="outline">
                  {balance.data?.[0]?.currency || 'NGN'}
                </Badge>
                {balance.data?.[0]?.balance && balance.data[0].balance > 0 ? (
                  <Badge variant="default" className="ml-2">
                    Available for Transfers
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="ml-2">
                    Insufficient Balance
                  </Badge>
                )}
              </div>
              {(balance.data?.[0]?.balance || 0) === 0 && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ No funds available for worker withdrawals
                </p>
              )}
              {balance.data && balance.data.length > 1 && (
                <p className="text-sm text-blue-600 mt-2">
                  ℹ️ Multiple balance accounts detected
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
              <CardDescription>
                Current status of your Paystack account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Environment:</span>
                  <Badge variant="outline">
                    {process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY?.startsWith('sk_live_') ? 'Live' : 'Test'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Manage your Paystack account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open('https://dashboard.paystack.com/#/settings/account', '_blank')}
              >
                Open Paystack Dashboard
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open('https://dashboard.paystack.com/#/transfers/balance', '_blank')}
              >
                Fund Account
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configuration Guide</CardTitle>
          <CardDescription>
            Steps to properly configure your Paystack account for withdrawals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Fund Your Paystack Account</h4>
            <p className="text-sm text-muted-foreground">
              Transfer money from your bank account to your Paystack account to enable withdrawals.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">2. Enable Transfers</h4>
            <p className="text-sm text-muted-foreground">
              Ensure transfers are enabled in your Paystack dashboard under Settings.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">3. Set Transfer Limits</h4>
            <p className="text-sm text-muted-foreground">
              Configure daily and monthly transfer limits based on your needs.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">4. Monitor Balance</h4>
            <p className="text-sm text-muted-foreground">
              Keep sufficient balance to cover worker withdrawals and platform operations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
