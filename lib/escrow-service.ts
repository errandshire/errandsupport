import { databases, COLLECTIONS } from './appwrite';
import { ID, Query } from 'appwrite';
import { EscrowUtils, TransactionDescriptions, ESCROW_STATUS, TRANSACTION_TYPES, TRANSACTION_STATUS } from './escrow-utils';
import type { EscrowTransaction, UserBalance, Transaction } from './types';

export class EscrowService {
  // Create escrow transaction when payment is successful
  static async createEscrowTransaction(
    bookingId: string,
    clientId: string,
    workerId: string,
    amount: number, // in kobo
    paystackReference: string,
    metadata: {
      serviceName?: string;
      workerName?: string;
      clientName?: string;
      paymentMethod?: string;
      [key: string]: any;
    } = {}
  ): Promise<EscrowTransaction> {
    try {
      // Validate required parameters
      if (!bookingId) {
        throw new Error('bookingId is required');
      }
      if (!clientId) {
        throw new Error('clientId is required');
      }
      if (!workerId) {
        throw new Error('workerId is required');
      }
      if (!paystackReference) {
        throw new Error('paystackReference is required');
      }

      // Validate amount
      const validation = EscrowUtils.validateAmount(amount);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Calculate fees
      const platformFee = EscrowUtils.calculatePlatformFee(amount);
      const workerAmount = EscrowUtils.calculateWorkerAmount(amount);

      // Create escrow transaction
      const escrowData = {
        bookingId,
        clientId,
        workerId,
        amount,
        platformFee,
        workerAmount,
        status: ESCROW_STATUS.HELD,
        paystackReference,
        createdAt: new Date().toISOString(),
        metadata: JSON.stringify(metadata)
      };

      const escrowTransaction = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.ESCROW_TRANSACTIONS,
        ID.unique(),
        escrowData
      ) as unknown as EscrowTransaction;

      // Create transaction log for escrow hold
      await this.createTransactionLog(
        clientId,
        TRANSACTION_TYPES.ESCROW_HOLD,
        amount,
        TransactionDescriptions.escrowHold(
          metadata.serviceName || 'Service',
          metadata.workerName || 'Worker'
        ),
        EscrowUtils.generateTransactionReference('escrow_hold', clientId),
        bookingId,
        TRANSACTION_STATUS.COMPLETED
      );

      // Update worker's balance (pending)
      await this.updateWorkerBalance(workerId, workerAmount, 'pending');

      console.log(`Escrow transaction created: ${escrowTransaction.$id}`);
      return escrowTransaction;

    } catch (error) {
      console.error('Error creating escrow transaction:', error);
      throw new Error(`Failed to create escrow transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Release escrow payment to worker
  static async releaseEscrowPayment(
    bookingId: string,
    releasedBy: string,
    reason: string = 'Job completed successfully'
  ): Promise<void> {
    try {
      // Get escrow transaction
      const escrowTransactions = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.ESCROW_TRANSACTIONS,
        [Query.equal('bookingId', bookingId)]
      );

      if (escrowTransactions.documents.length === 0) {
        throw new Error('Escrow transaction not found');
      }

      const escrowTransaction = escrowTransactions.documents[0] as unknown as EscrowTransaction;

      // Validate status transition
      const statusValidation = EscrowUtils.validateStatusTransition(
        escrowTransaction.status,
        ESCROW_STATUS.RELEASED
      );

      if (!statusValidation.isValid) {
        throw new Error(statusValidation.error);
      }

      // Update escrow status to released
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.ESCROW_TRANSACTIONS,
        escrowTransaction.$id,
        {
          status: ESCROW_STATUS.RELEASED,
          releasedAt: new Date().toISOString()
        }
      );

      // Update worker balance (move from pending to available)
      await this.updateWorkerBalance(
        escrowTransaction.workerId,
        escrowTransaction.workerAmount,
        'release'
      );

      // 🆕 Credit worker's virtual wallet with earnings
      try {
        const { VirtualWalletService } = await import('./virtual-wallet-service');
        await VirtualWalletService.creditWorkerEarnings(
          escrowTransaction.workerId,
          escrowTransaction.workerAmount,
          bookingId,
          `Payment released for booking #${bookingId.slice(-8)}`
        );
        console.log(`💰 Worker virtual wallet credited: ₦${escrowTransaction.workerAmount} for booking ${bookingId}`);
      } catch (walletError) {
        console.error('Error crediting worker virtual wallet:', walletError);
        // Don't throw - escrow release succeeded, wallet credit is additional
      }

      // Create transaction log for release
      await this.createTransactionLog(
        escrowTransaction.workerId,
        TRANSACTION_TYPES.ESCROW_RELEASE,
        escrowTransaction.workerAmount,
        `${reason} - ${TransactionDescriptions.escrowRelease('Service', 'Worker')}`,
        EscrowUtils.generateTransactionReference('escrow_release', escrowTransaction.workerId),
        bookingId,
        TRANSACTION_STATUS.COMPLETED
      );

      console.log(`Escrow payment released for booking: ${bookingId}`);

    } catch (error) {
      console.error('Error releasing escrow payment:', error);
      throw new Error(`Failed to release escrow payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Refund escrow payment to client
  static async refundEscrowPayment(
    bookingId: string,
    refundedBy: string,
    reason: string = 'Service cancelled'
  ): Promise<void> {
    try {
      // Get escrow transaction
      const escrowTransactions = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.ESCROW_TRANSACTIONS,
        [Query.equal('bookingId', bookingId)]
      );

      if (escrowTransactions.documents.length === 0) {
        throw new Error('Escrow transaction not found');
      }

      const escrowTransaction = escrowTransactions.documents[0] as unknown as EscrowTransaction;

      // Validate status transition
      const statusValidation = EscrowUtils.validateStatusTransition(
        escrowTransaction.status,
        ESCROW_STATUS.REFUNDED
      );

      if (!statusValidation.isValid) {
        throw new Error(statusValidation.error);
      }

      // Update escrow status to refunded
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.ESCROW_TRANSACTIONS,
        escrowTransaction.$id,
        {
          status: ESCROW_STATUS.REFUNDED,
          releasedAt: new Date().toISOString()
        }
      );

      // Update worker balance (remove pending amount)
      await this.updateWorkerBalance(
        escrowTransaction.workerId,
        escrowTransaction.workerAmount,
        'remove_pending'
      );

      // Create transaction log for refund
      await this.createTransactionLog(
        escrowTransaction.clientId,
        TRANSACTION_TYPES.REFUND,
        escrowTransaction.amount,
        TransactionDescriptions.refund('Service', reason),
        EscrowUtils.generateTransactionReference('refund', escrowTransaction.clientId),
        bookingId,
        TRANSACTION_STATUS.COMPLETED
      );

      console.log(`Escrow payment refunded for booking: ${bookingId}`);

    } catch (error) {
      console.error('Error refunding escrow payment:', error);
      throw new Error(`Failed to refund escrow payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user balance with error handling
   */
  static async getUserBalance(userId: string): Promise<UserBalance | null> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Check if online
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USER_BALANCES,
        [Query.equal('userId', userId)]
      );

      if (response.documents.length === 0) {
        // Create default balance if none exists
        const defaultBalance: Partial<UserBalance> = {
          userId,
          availableBalance: 0,
          pendingBalance: 0,
          totalEarnings: 0,
          totalWithdrawn: 0,
          updatedAt: new Date().toISOString()
        };

        const newBalance = await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.USER_BALANCES,
          ID.unique(),
          defaultBalance
        );

        return newBalance as unknown as UserBalance;
      }

      return response.documents[0] as unknown as UserBalance;
    } catch (error) {
      console.error('Error getting user balance:', error);
      // Return null instead of throwing to handle gracefully in UI
      return null;
    }
  }

  // Initialize user balance (create if doesn't exist)
  static async initializeUserBalance(userId: string): Promise<UserBalance> {
    try {
      // Check if balance already exists
      const existingBalance = await this.getUserBalance(userId);
      if (existingBalance) {
        return existingBalance;
      }

      // Create new balance record
      const balanceData = {
        userId,
        availableBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        currency: 'NGN',
        updatedAt: new Date().toISOString()
      };

      const balance = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USER_BALANCES,
        ID.unique(),
        balanceData
      ) as unknown as UserBalance;

      console.log(`User balance initialized for: ${userId}`);
      return balance;

    } catch (error) {
      console.error('Error initializing user balance:', error);
      throw new Error('Failed to initialize user balance');
    }
  }

  // Update worker balance
  private static async updateWorkerBalance(
    workerId: string,
    amount: number,
    operation: 'pending' | 'release' | 'remove_pending'
  ): Promise<void> {
    try {
      // Get or initialize balance
      let balance = await this.getUserBalance(workerId);
      if (!balance) {
        balance = await this.initializeUserBalance(workerId);
      }

      let updateData: Partial<UserBalance> = {
        updatedAt: new Date().toISOString()
      };

      switch (operation) {
        case 'pending':
          updateData.pendingBalance = balance.pendingBalance + amount;
          break;
        
        case 'release':
          updateData.availableBalance = balance.availableBalance + amount;
          updateData.pendingBalance = balance.pendingBalance - amount;
          updateData.totalEarnings = balance.totalEarnings + amount;
          break;
        
        case 'remove_pending':
          updateData.pendingBalance = balance.pendingBalance - amount;
          break;
      }

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USER_BALANCES,
        balance.$id,
        updateData
      );

    } catch (error) {
      console.error('Error updating worker balance:', error);
      throw new Error('Failed to update worker balance');
    }
  }

  // Create transaction log
  private static async createTransactionLog(
    userId: string,
    type: string,
    amount: number,
    description: string,
    reference: string,
    bookingId?: string,
    status: string = TRANSACTION_STATUS.COMPLETED
  ): Promise<void> {
    try {
      const transactionData = {
        userId,
        type,
        amount,
        description,
        reference,
        bookingId: bookingId || undefined,
        status,
        createdAt: new Date().toISOString()
      };

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.TRANSACTIONS,
        ID.unique(),
        transactionData
      );

    } catch (error) {
      console.error('Error creating transaction log:', error);
      // Don't throw here - transaction logging is secondary
    }
  }

  /**
   * Get user escrow transactions with error handling
   */
  static async getUserEscrowTransactions(
    userId: string, 
    role: 'worker' | 'client', 
    limit: number = 50
  ): Promise<EscrowTransaction[]> {
    if (!userId || !role) {
      throw new Error('User ID and role are required');
    }

    try {
      // Check if online
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.ESCROW_TRANSACTIONS,
        [
          Query.equal(role === 'worker' ? 'workerId' : 'clientId', userId),
          Query.orderDesc('createdAt'),
          Query.limit(limit)
        ]
      );

      return response.documents as unknown as EscrowTransaction[];
    } catch (error) {
      console.error('Error getting user escrow transactions:', error);
      // Return empty array instead of throwing to handle gracefully in UI
      return [];
    }
  }

  /**
   * Get user transactions with error handling
   */
  static async getUserTransactions(userId: string, limit: number = 50): Promise<Transaction[]> {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Check if online
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.TRANSACTIONS,
        [
          Query.equal('userId', userId),
          Query.orderDesc('createdAt'),
          Query.limit(limit)
        ]
      );

      return response.documents as unknown as Transaction[];
    } catch (error) {
      console.error('Error getting user transactions:', error);
      // Return empty array instead of throwing to handle gracefully in UI
      return [];
    }
  }
} 