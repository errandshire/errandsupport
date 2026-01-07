import { databases, COLLECTIONS } from './appwrite';
import { ID, Query } from 'appwrite';
import type { Wallet, WalletTransaction } from './types';
import { COMMISSION_RATE } from './constants';

/**
 * SIMPLE WALLET SERVICE
 *
 * SECURITY PRINCIPLES:
 * 1. Use Paystack reference as transaction ID = automatic idempotency
 * 2. Always check balance before deducting
 * 3. Every operation creates a transaction record
 * 4. All amounts in NAIRA (no conversion bugs)
 * 5. Platform commission deducted from worker payments (15%)
 */

export class WalletService {

  /**
   * Get or create wallet for user
   * @param userId - User ID to get/create wallet for
   * @param dbClient - Optional database client (use serverDatabases for server-side calls)
   */
  static async getOrCreateWallet(userId: string, dbClient?: any): Promise<Wallet> {
    const db = dbClient || databases;

    try {
      // Try to get existing wallet
      const wallets = await db.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        [Query.equal('userId', userId), Query.limit(1)]
      );

      if (wallets.documents.length > 0) {
        return wallets.documents[0] as unknown as Wallet;
      }

      // Create new wallet
      const wallet = await db.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        ID.unique(),
        {
          userId,
          balance: 0,
          escrow: 0,
          totalEarned: 0,
          totalSpent: 0,
          updatedAt: new Date().toISOString()
        }
      );

      console.log(`✅ Created wallet for user ${userId}`);
      return wallet as unknown as Wallet;

    } catch (error) {
      console.error('Error getting/creating wallet:', error);
      throw new Error('Failed to access wallet');
    }
  }

  /**
   * Add funds to wallet (from Paystack payment)
   *
   * IDEMPOTENCY: Uses Paystack reference as transaction ID
   * If called twice with same reference, second call does nothing
   */
  static async creditWallet(params: {
    userId: string;
    amountInNaira: number;
    paystackReference: string;
    description: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { userId, amountInNaira, paystackReference, description } = params;

      // IDEMPOTENCY CHECK: Try to create transaction with reference as ID
      try {
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WALLET_TRANSACTIONS,
          paystackReference, // Use reference as ID for idempotency
          {
            userId,
            type: 'topup',
            amount: amountInNaira,
            reference: paystackReference,
            status: 'completed',
            description,
            createdAt: new Date().toISOString()
          }
        );
      } catch (error: any) {
        // If document already exists, payment already processed
        if (error.code === 409 || error.message?.includes('already exists')) {
          console.log(`⚠️ Payment ${paystackReference} already processed`);
          return {
            success: true,
            message: 'Payment already processed'
          };
        }
        throw error;
      }

      // Get wallet
      const wallet = await this.getOrCreateWallet(userId);

      // Update wallet balance
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        wallet.$id,
        {
          balance: wallet.balance + amountInNaira,
          updatedAt: new Date().toISOString()
        }
      );

      console.log(`✅ Credited ₦${amountInNaira} to ${userId} (ref: ${paystackReference})`);

      return {
        success: true,
        message: `₦${amountInNaira.toLocaleString()} added to wallet`
      };

    } catch (error) {
      console.error('Error crediting wallet:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to credit wallet'
      };
    }
  }

  /**
   * Hold funds for a booking (client pays, money goes to escrow)
   *
   * IDEMPOTENCY: Uses bookingId as part of transaction reference
   * @param dbClient - Optional database client (use serverDatabases for server-side calls)
   */
  static async holdFundsForBooking(params: {
    clientId: string;
    bookingId: string;
    amountInNaira: number;
    dbClient?: any;
  }): Promise<{ success: boolean; message: string }> {
    const db = params.dbClient || databases;

    try {
      const { clientId, bookingId, amountInNaira } = params;

      // Get wallet
      const wallet = await this.getOrCreateWallet(clientId, db);

      // CHECK BALANCE
      if (wallet.balance < amountInNaira) {
        return {
          success: false,
          message: `Insufficient balance. You have ₦${wallet.balance.toLocaleString()}, need ₦${amountInNaira.toLocaleString()}`
        };
      }

      // IDEMPOTENCY: Try to create transaction
      const transactionId = `hold_${bookingId}`;
      try {
        await db.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WALLET_TRANSACTIONS,
          transactionId,
          {
            userId: clientId,
            type: 'booking_hold',
            amount: amountInNaira,
            bookingId,
            reference: transactionId,
            status: 'completed',
            description: `Payment held for booking #${bookingId}`,
            createdAt: new Date().toISOString()
          }
        );
      } catch (error: any) {
        if (error.code === 409 || error.message?.includes('already exists')) {
          console.log(`⚠️ Booking ${bookingId} already paid`);
          return {
            success: true,
            message: 'Booking already paid'
          };
        }
        throw error;
      }

      // Move from balance to escrow
      await db.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        wallet.$id,
        {
          balance: wallet.balance - amountInNaira,
          escrow: wallet.escrow + amountInNaira,
          totalSpent: wallet.totalSpent + amountInNaira,
          updatedAt: new Date().toISOString()
        }
      );

      console.log(`✅ Held ₦${amountInNaira} for booking ${bookingId}`);

      return {
        success: true,
        message: 'Payment successful'
      };

    } catch (error) {
      console.error('Error holding funds:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Payment failed'
      };
    }
  }

  /**
   * Release funds from escrow to worker (job completed)
   *
   * IDEMPOTENCY: Uses bookingId as part of transaction reference
   *
   * COMMISSION DEDUCTION:
   * - Platform takes 15% commission from gross amount
   * - Worker receives 85% of the payment
   * - Commission is tracked in separate transaction
   */
  static async releaseFundsToWorker(params: {
    clientId: string;
    workerId: string;
    bookingId: string;
    amountInNaira: number;
  }): Promise<{ success: boolean; message: string; workerAmount?: number; commission?: number }> {
    try {
      const { clientId, workerId, bookingId, amountInNaira } = params;

      // Calculate commission
      const commissionAmount = Math.round(amountInNaira * COMMISSION_RATE);
      const workerAmount = amountInNaira - commissionAmount;

      // Get both wallets
      const [clientWallet, workerWallet] = await Promise.all([
        this.getOrCreateWallet(clientId),
        this.getOrCreateWallet(workerId)
      ]);

      // CHECK ESCROW
      if (clientWallet.escrow < amountInNaira) {
        return {
          success: false,
          message: 'Insufficient escrowed funds'
        };
      }

      // IDEMPOTENCY: Try to create worker payment transaction
      const transactionId = `release_${bookingId}`;
      try {
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WALLET_TRANSACTIONS,
          transactionId,
          {
            userId: workerId,
            type: 'booking_release',
            amount: workerAmount,
            bookingId,
            reference: transactionId,
            status: 'completed',
            description: `Payment for booking #${bookingId} (after ${COMMISSION_RATE * 100}% commission)`,
            createdAt: new Date().toISOString()
          }
        );
      } catch (error: any) {
        if (error.code === 409 || error.message?.includes('already exists')) {
          console.log(`⚠️ Booking ${bookingId} already released`);
          return {
            success: true,
            message: 'Payment already released',
            workerAmount,
            commission: commissionAmount
          };
        }
        throw error;
      }

      // Create platform commission transaction record
      const commissionTransactionId = `commission_${bookingId}`;
      try {
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WALLET_TRANSACTIONS,
          commissionTransactionId,
          {
            userId: 'platform',
            type: 'commission',
            amount: commissionAmount,
            bookingId,
            reference: commissionTransactionId,
            status: 'completed',
            description: `Platform commission (${COMMISSION_RATE * 100}%) for booking #${bookingId}`,
            createdAt: new Date().toISOString()
          }
        );
      } catch (error: any) {
        // Commission transaction already exists, continue
        if (error.code !== 409 && !error.message?.includes('already exists')) {
          throw error;
        }
      }

      // Update client wallet (remove from escrow)
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        clientWallet.$id,
        {
          escrow: clientWallet.escrow - amountInNaira,
          updatedAt: new Date().toISOString()
        }
      );

      // Update worker wallet (add NET amount after commission)
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        workerWallet.$id,
        {
          balance: workerWallet.balance + workerAmount,
          totalEarned: workerWallet.totalEarned + workerAmount,
          updatedAt: new Date().toISOString()
        }
      );

      console.log(`✅ Released ₦${amountInNaira} for booking ${bookingId}:`);
      console.log(`   Worker receives: ₦${workerAmount.toLocaleString()}`);
      console.log(`   Platform commission: ₦${commissionAmount.toLocaleString()} (${COMMISSION_RATE * 100}%)`);

      return {
        success: true,
        message: 'Payment released to worker',
        workerAmount,
        commission: commissionAmount
      };

    } catch (error) {
      console.error('Error releasing funds:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to release payment'
      };
    }
  }

  /**
   * Get wallet transactions
   */
  static async getTransactions(userId: string, limit: number = 50): Promise<WalletTransaction[]> {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WALLET_TRANSACTIONS,
        [
          Query.equal('userId', userId),
          Query.orderDesc('createdAt'),
          Query.limit(limit)
        ]
      );

      return response.documents as unknown as WalletTransaction[];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  /**
   * ROLLBACK: Reverse a payment release (move funds back from worker to escrow)
   *
   * USE CASE:
   * - Payment released to worker ✅
   * - Booking update FAILS ❌
   * - Need to reverse payment to maintain consistency
   *
   * BENEFIT:
   * - Prevents double payments if client retries
   * - Maintains data integrity
   * - Allows safe retrying of failed operations
   *
   * NOTE: Rolls back the NET amount (after commission) that was paid to worker
   */
  static async rollbackRelease(params: {
    clientId: string;
    workerId: string;
    bookingId: string;
    amountInNaira: number;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { clientId, workerId, bookingId, amountInNaira } = params;

      console.log(`🔄 Rolling back payment release for booking ${bookingId}...`);

      // Calculate what was actually paid to worker (after commission)
      const commissionAmount = Math.round(amountInNaira * COMMISSION_RATE);
      const workerAmount = amountInNaira - commissionAmount;

      // Get both wallets
      const [clientWallet, workerWallet] = await Promise.all([
        this.getOrCreateWallet(clientId),
        this.getOrCreateWallet(workerId)
      ]);

      // Verify worker has the NET amount (what they actually received)
      if (workerWallet.balance < workerAmount) {
        console.error(`❌ Rollback failed: Worker has insufficient balance`);
        return {
          success: false,
          message: 'Cannot rollback: Worker has insufficient balance'
        };
      }

      // Create rollback transaction record
      const rollbackTransactionId = `rollback_${bookingId}_${Date.now()}`;
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WALLET_TRANSACTIONS,
        rollbackTransactionId,
        {
          userId: workerId,
          type: 'rollback',
          amount: -workerAmount, // Negative amount indicates reversal (NET amount)
          bookingId,
          reference: rollbackTransactionId,
          status: 'completed',
          description: `Rollback payment for booking #${bookingId}`,
          createdAt: new Date().toISOString()
        }
      );

      // Remove NET amount from worker balance
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        workerWallet.$id,
        {
          balance: workerWallet.balance - workerAmount,
          totalEarned: workerWallet.totalEarned - workerAmount,
          updatedAt: new Date().toISOString()
        }
      );

      // Add FULL amount back to client escrow (including the commission that was deducted)
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        clientWallet.$id,
        {
          escrow: clientWallet.escrow + amountInNaira,
          updatedAt: new Date().toISOString()
        }
      );

      console.log(`✅ Rolled back payment for booking ${bookingId}:`);
      console.log(`   Deducted from worker: ₦${workerAmount.toLocaleString()}`);
      console.log(`   Returned to escrow: ₦${amountInNaira.toLocaleString()}`);

      return {
        success: true,
        message: 'Payment rollback successful'
      };

    } catch (error) {
      console.error('Error rolling back payment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to rollback payment'
      };
    }
  }

  /**
   * ROLLBACK: Reverse an escrow hold (refund to client balance)
   *
   * USE CASE:
   * - Funds held in escrow ✅
   * - Booking creation FAILS ❌
   * - Need to release funds back to client balance
   *
   * BENEFIT:
   * - Prevents stuck funds in escrow
   * - Allows safe retrying of booking creation
   */
  static async rollbackHold(params: {
    clientId: string;
    bookingId: string;
    amountInNaira: number;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { clientId, bookingId, amountInNaira } = params;

      console.log(`🔄 Rolling back escrow hold for booking ${bookingId}...`);

      // Get wallet
      const wallet = await this.getOrCreateWallet(clientId);

      // Verify escrow has the funds
      if (wallet.escrow < amountInNaira) {
        console.error(`❌ Rollback failed: Insufficient escrow balance`);
        return {
          success: false,
          message: 'Cannot rollback: Insufficient escrow balance'
        };
      }

      // Create rollback transaction record
      const rollbackTransactionId = `rollback_hold_${bookingId}_${Date.now()}`;
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WALLET_TRANSACTIONS,
        rollbackTransactionId,
        {
          userId: clientId,
          type: 'rollback_hold',
          amount: amountInNaira,
          bookingId,
          reference: rollbackTransactionId,
          status: 'completed',
          description: `Rollback escrow hold for booking #${bookingId}`,
          createdAt: new Date().toISOString()
        }
      );

      // Move from escrow back to balance
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        wallet.$id,
        {
          balance: wallet.balance + amountInNaira,
          escrow: wallet.escrow - amountInNaira,
          totalSpent: wallet.totalSpent - amountInNaira,
          updatedAt: new Date().toISOString()
        }
      );

      console.log(`✅ Rolled back ₦${amountInNaira} from escrow to ${clientId} balance`);

      return {
        success: true,
        message: 'Escrow rollback successful'
      };

    } catch (error) {
      console.error('Error rolling back escrow hold:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to rollback escrow'
      };
    }
  }
}
