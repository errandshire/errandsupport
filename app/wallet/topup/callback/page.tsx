"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, ArrowLeft, Wallet } from "lucide-react";
import { paystack } from "@/lib/paystack";
import { VirtualWalletService } from "@/lib/virtual-wallet-service";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import Link from "next/link";

type PaymentStatus = 'verifying' | 'success' | 'failed';

function WalletTopUpCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState<PaymentStatus>('verifying');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get('reference');
      const trxref = searchParams.get('trxref');
      
      if (!reference && !trxref) {
        setStatus('failed');
        setError('No payment reference found');
        return;
      }

      const paymentRef = reference || trxref;
      
      try {
        // Verify payment with Paystack
        const verification = await paystack.verifyPayment(paymentRef!);
        
        if (verification.status && verification.data.status === 'success') {
          setPaymentDetails(verification.data);
          
          // Process wallet top-up
          await processWalletTopUp(verification.data);
          
          setStatus('success');
          toast.success('Wallet top-up successful!');
          
          // Redirect to wallet page after 3 seconds
          setTimeout(() => {
            router.push('/client/wallet');
          }, 3000);
        } else {
          setStatus('failed');
          setError(verification.data.gateway_response || 'Payment verification failed');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        setError('Failed to verify payment. Please contact support.');
      }
    };

    verifyPayment();
  }, [searchParams, router]);

  const processWalletTopUp = async (paymentData: any) => {
    try {
      const { metadata } = paymentData;
      
      if (!metadata || metadata.type !== 'wallet_topup') {
        throw new Error('Invalid payment metadata');
      }

      console.log('Processing wallet top-up:', {
        reference: paymentData.reference,
        amount: paymentData.amount / 100, // Convert from kobo
        metadata
      });

      // Process the successful top-up
      await VirtualWalletService.processTopUpSuccess(
        paymentData.reference,
        paymentData.amount / 100, // Convert from kobo to NGN
        metadata
      );

      console.log('✅ Wallet top-up processed successfully');

    } catch (error) {
      console.error('Error processing wallet top-up:', error);
      // Don't throw - payment was successful, just log the error
      toast.error('Payment successful but wallet update failed. Please contact support.');
    }
  };

  const handleRetry = () => {
    router.push('/client/wallet');
  };

  const handleGoToWallet = () => {
    router.push('/client/wallet');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'verifying' && (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            )}
            {status === 'failed' && (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            )}
          </div>
          
          <CardTitle className="text-xl">
            {status === 'verifying' && 'Verifying Payment...'}
            {status === 'success' && 'Wallet Top-Up Successful!'}
            {status === 'failed' && 'Payment Failed'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'verifying' && (
            <div className="text-center">
              <p className="text-gray-600">
                Please wait while we verify your payment and update your wallet...
              </p>
            </div>
          )}

          {status === 'success' && paymentDetails && (
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <Wallet className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-medium">
                  ₦{(paymentDetails.amount / 100).toLocaleString()} added to your wallet
                </p>
                <p className="text-green-600 text-sm mt-1">
                  You can now make instant bookings!
                </p>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">₦{(paymentDetails.amount / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Reference:</span>
                  <span className="font-mono text-xs">{paymentDetails.reference}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="capitalize">{paymentDetails.channel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                </div>
              </div>

              <p className="text-center text-sm text-gray-600">
                Redirecting to your wallet in a few seconds...
              </p>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <p className="text-red-800 font-medium">Payment could not be completed</p>
                <p className="text-red-600 text-sm mt-1">
                  {error || 'Please try again or contact support if the problem persists.'}
                </p>
              </div>

              {paymentDetails && (
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Reference:</span>
                    <span className="font-mono text-xs">{paymentDetails.reference}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <Badge variant="destructive">Failed</Badge>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {status === 'success' && (
              <>
                <Button variant="outline" className="flex-1" onClick={handleGoToWallet}>
                  <Wallet className="h-4 w-4 mr-2" />
                  View Wallet
                </Button>
                <Button className="flex-1" asChild>
                  <Link href="/workers">Book Service</Link>
                </Button>
              </>
            )}

            {status === 'failed' && (
              <>
                <Button variant="outline" className="flex-1" onClick={handleRetry}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Wallet
                </Button>
                <Button className="flex-1" onClick={handleRetry}>
                  Try Again
                </Button>
              </>
            )}

            {status === 'verifying' && (
              <Button variant="outline" className="w-full" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WalletTopUpCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
              <p className="mt-2 text-sm text-gray-600">Loading payment verification...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <WalletTopUpCallbackContent />
    </Suspense>
  );
} 