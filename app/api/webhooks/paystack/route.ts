import { NextRequest, NextResponse } from 'next/server';
import { paystack } from '@/lib/paystack';
import { databases, COLLECTIONS } from '@/lib/appwrite';
import { VirtualWalletService } from '@/lib/virtual-wallet-service';
import { Query } from 'appwrite';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');
    
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Verify webhook signature
    const isValid = paystack.verifyWebhookSignature(body, signature);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    
    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;
        
      case 'transfer.success':
        await handleTransferSuccess(event.data);
        break;
        
      case 'transfer.failed':
        await handleTransferFailed(event.data);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleChargeSuccess(data: any) {
  try {
    const { reference, amount, metadata, customer } = data;
    
    if (!metadata) {
      console.error('Missing metadata in payment');
      return;
    }

    // Handle wallet top-up payments
    if (metadata.type === 'wallet_topup') {
      await handleWalletTopUp(data);
      return;
    }

    // Handle booking payments (existing functionality)
    if (metadata.type === 'booking_payment') {
      await handleBookingPayment(data);
      return;
    }

    console.warn('Unknown payment type:', metadata.type);
  } catch (error) {
    console.error('Error handling charge success:', error);
  }
}

async function handleWalletTopUp(data: any) {
  try {
    const { reference, amount, metadata } = data;

    console.log('Processing wallet top-up webhook:', { reference, amount: amount / 100, metadata });

    // Process wallet top-up (idempotency is handled inside processTopUpSuccess using document ID)
    await VirtualWalletService.processTopUpSuccess(
      reference,
      amount / 100, // Convert from kobo to NGN
      metadata
    );

    console.log(`✅ Wallet top-up webhook processed: ${amount / 100} NGN for user ${metadata.userId}`);
  } catch (error) {
    console.error('❌ Failed to process wallet top-up webhook:', error);
    throw error;
  }
}

async function handleBookingPayment(data: any) {
  try {
    const { reference, amount, metadata, customer } = data;
    
    if (!metadata.bookingId) {
      console.error('Missing booking ID in payment metadata');
      return;
    }

    // Get booking details for notification
    let booking;
    try {
      booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        metadata.bookingId
      );
    } catch (error) {
      console.error('Failed to fetch booking for notification:', error);
    }

    // Update booking payment status (existing functionality)
    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.BOOKINGS,
      metadata.bookingId,
      {
        paymentStatus: 'escrowed',
        paymentReference: reference,
        paymentAmount: amount / 100,
        status: 'accepted',
        updatedAt: new Date().toISOString()
      }
    );

    // Create or update payment record (existing functionality)
    await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.PAYMENTS,
      reference,
      {
        bookingId: metadata.bookingId,
        clientId: metadata.clientId,
        workerId: metadata.workerId,
        amount: amount / 100,
        currency: data.currency,
        status: 'escrowed',
        paymentReference: reference,
        paystackTransactionId: String(data.id), // Convert to string
        paymentMethod: data.channel,
        customerEmail: customer.email,
        paidAt: data.paid_at,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );

    // 🆕 NEW: Create escrow transaction (Phase 1 Integration)
    try {
      const { EscrowService } = await import('@/lib/escrow-service');
      
      await EscrowService.createEscrowTransaction(
        metadata.bookingId,
        metadata.clientId,
        metadata.workerId,
        amount, // Keep in kobo
        reference,
        {
          serviceName: metadata.serviceName || 'Service Booking',
          workerName: metadata.workerName || 'Worker',
          clientName: metadata.clientName || 'Client',
          paymentMethod: data.channel
        }
      );
      
      console.log(`✅ Escrow transaction created via webhook for booking ${metadata.bookingId}`);
    } catch (escrowError) {
      console.error('❌ Failed to create escrow transaction via webhook:', escrowError);
      // Don't throw - webhook should still succeed
    }

    // Send notification to worker about new booking (webhook)
    try {
      const { notificationService } = await import('@/lib/notification-service');
      await notificationService.createNotification({
        userId: metadata.workerId,
        title: 'New Booking Request! 🎉',
        message: `You have a new booking request for "${booking?.title || metadata.serviceName || 'Service'}" from a client. Payment has been confirmed and escrowed.`,
        type: 'success',
        bookingId: metadata.bookingId,
        actionUrl: `/worker/bookings?id=${metadata.bookingId}`,
        idempotencyKey: `new_booking_webhook_${metadata.bookingId}_${metadata.workerId}`
      });
      console.log('✅ Notification sent to worker about new booking (webhook)');
    } catch (notificationError) {
      console.error('Failed to send notification to worker via webhook:', notificationError);
      // Don't fail the webhook if notification fails
    }

    console.log(`Payment escrowed for booking ${metadata.bookingId}`);
  } catch (error) {
    console.error('Error handling booking payment:', error);
  }
}

async function handleTransferSuccess(data: any) {
  try {
    const { reference, amount, recipient } = data;
    
    // Handle payment transfers (existing functionality)
    const payments = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.PAYMENTS,
      [
        Query.equal('transferReference', reference)
      ]
    );

    if (payments.documents.length > 0) {
      const payment = payments.documents[0];
      
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PAYMENTS,
        payment.$id,
        {
          status: 'released',
          transferStatus: 'success',
          releasedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // Update booking status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        payment.bookingId,
        {
          paymentStatus: 'released',
          status: 'completed',
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      console.log(`Payment released for booking ${payment.bookingId}`);
      return;
    }

    // Handle withdrawal transfers (new functionality)
    const withdrawals = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.WITHDRAWALS || 'withdrawals',
      [
        Query.equal('reference', reference)
      ]
    );

    if (withdrawals.documents.length > 0) {
      const withdrawal = withdrawals.documents[0];
      
      // Use WorkerPayoutService to handle withdrawal completion
      const { WorkerPayoutService } = await import('@/lib/worker-payout-service');
      await WorkerPayoutService.handleWithdrawalCompletion(
        withdrawal.$id,
        'completed'
      );

      console.log(`Withdrawal completed for user ${withdrawal.userId}`);
    }
  } catch (error) {
    console.error('Error handling transfer success:', error);
  }
}

async function handleTransferFailed(data: any) {
  try {
    const { reference, amount, reason } = data;
    
    // Handle payment transfers (existing functionality)
    const payments = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.PAYMENTS,
      [
        Query.equal('transferReference', reference)
      ]
    );

    if (payments.documents.length > 0) {
      const payment = payments.documents[0];
      
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PAYMENTS,
        payment.$id,
        {
          status: 'failed',
          transferStatus: 'failed',
          updatedAt: new Date().toISOString()
        }
      );

      console.log(`Payment transfer failed for booking ${payment.bookingId}`);
      return;
    }

    // Handle withdrawal transfers (new functionality)
    const withdrawals = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.WITHDRAWALS || 'withdrawals',
      [
        Query.equal('reference', reference)
      ]
    );

    if (withdrawals.documents.length > 0) {
      const withdrawal = withdrawals.documents[0];
      
      // Use WorkerPayoutService to handle withdrawal failure
      const { WorkerPayoutService } = await import('@/lib/worker-payout-service');
      await WorkerPayoutService.handleWithdrawalCompletion(
        withdrawal.$id,
        'failed',
        reason || 'Transfer failed'
      );

      console.log(`Withdrawal failed for user ${withdrawal.userId}: ${reason || 'Transfer failed'}`);
    }
  } catch (error) {
    console.error('Error handling transfer failure:', error);
  }
} 