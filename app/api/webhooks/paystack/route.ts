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

    // Process wallet top-up
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

    console.log(`Payment escrowed for booking ${metadata.bookingId}`);
  } catch (error) {
    console.error('Error handling booking payment:', error);
  }
}

async function handleTransferSuccess(data: any) {
  try {
    const { reference, amount, recipient } = data;
    
    // Update payment status to released
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
    }
  } catch (error) {
    console.error('Error handling transfer success:', error);
  }
}

async function handleTransferFailed(data: any) {
  try {
    const { reference, amount } = data;
    
    // Update payment status to failed
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
    }
  } catch (error) {
    console.error('Error handling transfer failure:', error);
  }
} 