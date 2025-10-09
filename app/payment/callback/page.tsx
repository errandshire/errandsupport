"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { paystack } from "@/lib/paystack";
import { databases, COLLECTIONS } from "@/lib/appwrite";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type PaymentStatus = 'verifying' | 'success' | 'failed' | 'cancelled';

function PaymentCallbackContent() {
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
          
          // Update booking status in database
          await updateBookingPaymentStatus(verification.data);
          
          setStatus('success');
          toast.success('Payment successful! Your booking is confirmed.');
          
          // Redirect to client dashboard after 3 seconds
          setTimeout(() => {
            router.push('/client');
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

  const updateBookingPaymentStatus = async (paymentData: any) => {
    try {
      const { metadata } = paymentData;
      const bookingId = metadata?.bookingId;
      
      if (!bookingId) {
        console.error('Missing booking ID in payment metadata:', metadata);
        throw new Error('Booking ID not found in payment metadata');
      }

      console.log('Attempting to update booking:', {
        bookingId,
        metadata,
        paymentReference: paymentData.reference
      });

      // First verify the booking exists and get its details
      let booking;
      try {
        booking = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.BOOKINGS,
          bookingId
        );
      } catch (error) {
        console.error('Booking not found:', bookingId);
        throw new Error(`Booking with ID ${bookingId} not found. The booking may not have been created successfully before payment.`);
      }

      // Update booking with payment information (existing functionality)
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          paymentReference: paymentData.reference,
          paymentStatus: 'escrowed',
          paymentAmount: paymentData.amount / 100, // Convert from kobo
          paymentDate: paymentData.paid_at,
          paystackTransactionId: String(paymentData.id), // Convert to string
          status: 'accepted', // Auto-accept booking after payment
          updatedAt: new Date().toISOString()
        }
      );

      console.log('Successfully updated booking payment status');

      // Create payment record (existing functionality)
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PAYMENTS,
        paymentData.reference,
        {
          bookingId,
          clientId: metadata.clientId,
          workerId: metadata.workerId,
          amount: paymentData.amount / 100,
          status: 'escrowed',
          paymentReference: paymentData.reference,
          paystackTransactionId: String(paymentData.id),
          paymentMethod: paymentData.channel,
          paidAt: paymentData.paid_at,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // 🆕 NEW: Create escrow transaction (Phase 1 Integration)
      try {
        const { EscrowService } = await import('@/lib/escrow-service');
        
        await EscrowService.createEscrowTransaction(
          bookingId,
          metadata.clientId,
          metadata.workerId,
          paymentData.amount, // Keep in kobo
          paymentData.reference,
          {
            serviceName: metadata.serviceName || 'Service Booking',
            workerName: metadata.workerName || 'Worker',
            clientName: metadata.clientName || 'Client',
            paymentMethod: paymentData.channel
          }
        );
        
        console.log('✅ Escrow transaction created successfully');
      } catch (escrowError) {
        console.error('❌ Failed to create escrow transaction:', escrowError);
        // Don't throw - let the existing payment flow continue
        // The payment is still valid even if escrow tracking fails
      }

      // Send notification to worker about new booking (card payment)
      try {
        const { notificationService } = await import('@/lib/notification-service');
        await notificationService.createNotification({
          userId: metadata.workerId,
          title: 'New Booking Request! 🎉',
          message: `You have a new booking request for "${booking.title || metadata.serviceName || 'Service'}" from a client. Payment has been confirmed and escrowed.`,
          type: 'success',
          bookingId: bookingId,
          actionUrl: `/worker/bookings?id=${bookingId}`,
          idempotencyKey: `new_booking_${bookingId}_${metadata.workerId}`
        });
        console.log('✅ Notification sent to worker about new booking (card payment)');
      } catch (notificationError) {
        console.error('Failed to send notification to worker:', notificationError);
        // Don't fail the payment flow if notification fails
      }

    } catch (error) {
      console.error('Error updating booking payment status:', error);
      throw error;
    }
  };

  const handleRetry = () => {
    router.push('/workers');
  };

  const handleGoToDashboard = () => {
    router.push('/client');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'verifying' && (
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-12 w-12 text-green-500" />
            )}
            {(status === 'failed' || status === 'cancelled') && (
              <XCircle className="h-12 w-12 text-red-500" />
            )}
          </div>
          
          <CardTitle className="text-xl">
            {status === 'verifying' && 'Verifying Payment...'}
            {status === 'success' && 'Payment Successful!'}
            {status === 'failed' && 'Payment Failed'}
            {status === 'cancelled' && 'Payment Cancelled'}
          </CardTitle>
          
          <CardDescription>
            {status === 'verifying' && 'Please wait while we verify your payment'}
            {status === 'success' && 'Your booking has been confirmed and payment is held in escrow'}
            {status === 'failed' && 'There was an issue processing your payment'}
            {status === 'cancelled' && 'You cancelled the payment process'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {status === 'success' && paymentDetails && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Payment Details</h4>
              <div className="space-y-1 text-sm text-green-800">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span>₦{(paymentDetails.amount / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reference:</span>
                  <span className="font-mono">{paymentDetails.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-medium">Escrowed</span>
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-900 mb-2">Error Details</h4>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          <div className="flex space-x-3">
            {status === 'success' && (
              <Button onClick={handleGoToDashboard} className="flex-1">
                Go to Dashboard
              </Button>
            )}
            
            {(status === 'failed' || status === 'cancelled') && (
              <>
                <Button variant="outline" onClick={handleRetry} className="flex-1">
                  Try Again
                </Button>
                <Button onClick={handleGoToDashboard} className="flex-1">
                  Dashboard
                </Button>
              </>
            )}
          </div>
          
          {status === 'success' && (
            <p className="text-xs text-gray-500 text-center">
              Redirecting to dashboard in 3 seconds...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            </div>
            <CardTitle className="text-xl">Loading...</CardTitle>
            <CardDescription>Please wait while we verify your payment</CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
} 