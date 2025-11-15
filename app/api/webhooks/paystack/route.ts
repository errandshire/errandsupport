import { NextRequest, NextResponse } from 'next/server';
import { PaystackService } from '@/lib/paystack.service';
import { WalletService } from '@/lib/wallet.service';
import { databases, COLLECTIONS } from '@/lib/appwrite';
import { Query } from 'appwrite';

/**
 * PAYSTACK WEBHOOK HANDLER
 *
 * Security: ALWAYS verify signature before processing
 * Idempotency: Wallet service handles duplicate webhooks
 */

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      console.error('❌ Webhook rejected: Missing signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // SECURITY: Verify webhook is from Paystack
    const isValid = PaystackService.verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.error('❌ Webhook rejected: Invalid signature');
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
    }

    return NextResponse.json({ status: 'success' });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment (wallet top-up)
 */
async function handleChargeSuccess(data: any) {
  try {
    const { reference, amount, metadata, customer } = data;

    // Amount from Paystack is in kobo, convert to Naira
    const amountInNaira = amount / 100;


    // Check if this is a wallet top-up
    if (metadata?.type === 'wallet_topup' && metadata?.userId) {
      const result = await WalletService.creditWallet({
        userId: metadata.userId,
        amountInNaira,
        paystackReference: reference,
        description: `Wallet top-up via ${data.channel}`
      });

      if (result.success) {
      } else {
        console.error(`❌ Failed to credit wallet: ${result.message}`);
      }
    } else {
    }

  } catch (error) {
    console.error('❌ Error handling charge success:', error);
    throw error;
  }
}

/**
 * Handle successful transfer (withdrawal completed)
 */
async function handleTransferSuccess(data: any) {
  try {
    const { reference, amount, recipient } = data;


    // Find withdrawal by reference
    const withdrawals = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.WITHDRAWALS,
      [Query.equal('reference', reference)]
    );

    if (withdrawals.documents.length > 0) {
      const withdrawal = withdrawals.documents[0];

      // Update withdrawal status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS,
        withdrawal.$id,
        {
          status: 'completed',
          completedAt: new Date().toISOString()
        }
      );

      // Create transaction record
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WALLET_TRANSACTIONS,
        reference, // Use reference for idempotency
        {
          userId: withdrawal.userId,
          type: 'withdraw',
          amount: withdrawal.amount,
          reference,
          status: 'completed',
          description: 'Withdrawal to bank account',
          createdAt: new Date().toISOString()
        }
      );

    }

  } catch (error) {
    console.error('❌ Error handling transfer success:', error);
    throw error;
  }
}

/**
 * Handle failed transfer (withdrawal failed)
 */
async function handleTransferFailed(data: any) {
  try {
    const { reference, reason } = data;


    // Find withdrawal by reference
    const withdrawals = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.WITHDRAWALS,
      [Query.equal('reference', reference)]
    );

    if (withdrawals.documents.length > 0) {
      const withdrawal = withdrawals.documents[0];

      // Update withdrawal status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS,
        withdrawal.$id,
        {
          status: 'failed',
          failureReason: reason,
          completedAt: new Date().toISOString()
        }
      );

      // Refund to wallet
      const wallet = await WalletService.getOrCreateWallet(withdrawal.userId);
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        wallet.$id,
        {
          balance: wallet.balance + withdrawal.amount,
          updatedAt: new Date().toISOString()
        }
      );

    }

  } catch (error) {
    console.error('❌ Error handling transfer failure:', error);
    throw error;
  }
}
