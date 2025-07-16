import { NextRequest, NextResponse } from 'next/server';
import { paystack } from '@/lib/paystack';
import { databases, COLLECTIONS } from '@/lib/appwrite';

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
    
    if (!metadata || !metadata.bookingId) {
      console.error('Missing booking ID in payment metadata');
      return;
    }

    // Update booking payment status
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

    // Create or update payment record
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

    console.log(`Payment escrowed for booking ${metadata.bookingId}`);
  } catch (error) {
    console.error('Error handling charge success:', error);
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
        { attribute: 'transferReference', value: reference }
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
    const { reference, failures } = data;
    
    // Update payment status to failed
    const payments = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.PAYMENTS,
      [
        { attribute: 'transferReference', value: reference }
      ]
    );

    if (payments.documents.length > 0) {
      const payment = payments.documents[0];
      
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PAYMENTS,
        payment.$id,
        {
          transferStatus: 'failed',
          transferFailureReason: failures?.[0]?.message || 'Transfer failed',
          updatedAt: new Date().toISOString()
        }
      );

      console.log(`Transfer failed for booking ${payment.bookingId}: ${failures?.[0]?.message}`);
    }
  } catch (error) {
    console.error('Error handling transfer failed:', error);
  }
} 