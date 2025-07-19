import { databases, COLLECTIONS } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { EscrowService } from '@/lib/escrow-service';
import { EscrowUtils, TRANSACTION_TYPES, TRANSACTION_STATUS } from '@/lib/escrow-utils';
import { paystack } from '@/lib/paystack';
import type { UserBalance, Transaction } from '@/lib/types';

/**
 * Virtual Wallet Service - Phase 3
 * Handles client virtual wallets for pre-loaded funds and instant payments
 */

export interface VirtualWallet {
  $id?: string;
  userId: string;
  availableBalance: number; // Available funds for spending
  pendingBalance: number;   // Funds being processed (top-ups in progress)
  totalDeposits: number;    // Lifetime deposits
  totalSpent: number;       // Lifetime spending from wallet
  totalWithdrawn: number;   // Lifetime withdrawals
  isActive: boolean;        // Wallet status
  dailySpendLimit: number;  // Daily spending limit (fraud protection)
  monthlySpendLimit: number; // Monthly spending limit
  currentDailySpent: number; // Spending today
  currentMonthlySpent: number; // Spending this month
  lastResetDate: string;    // Last time daily/monthly counters reset
  createdAt: string;
  updatedAt: string;
}

export interface WalletTopUpRequest {
  userId: string;
  amount: number; // In NGN
  paymentMethod: 'card' | 'bank_transfer';
  description?: string;
}

export interface WalletWithdrawalRequest {
  userId: string;
  amount: number;
  bankDetails: {
    accountNumber: string;
    bankCode: string;
    accountName: string;
  };
  reason?: string;
}

export interface InstantPaymentRequest {
  userId: string;
  bookingId: string;
  amount: number;
  workerId: string;
  clientId: string;
  description: string;
}

export interface WalletSpendingLimits {
  daily: number;
  monthly: number;
  perTransaction: number;
}

export class VirtualWalletService {

  /**
   * Initialize virtual wallet for a user
   */
  static async initializeWallet(userId: string): Promise<VirtualWallet> {
    try {
      // Check if wallet already exists
      const existingWallets = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        [Query.equal('userId', userId)]
      );

      if (existingWallets.documents.length > 0) {
        return existingWallets.documents[0] as unknown as VirtualWallet;
      }

      // Create new virtual wallet
      const newWallet: Omit<VirtualWallet, '$id'> = {
        userId,
        availableBalance: 0,
        pendingBalance: 0,
        totalDeposits: 0,
        totalSpent: 0,
        totalWithdrawn: 0,
        isActive: true,
        dailySpendLimit: 50000, // 50,000 NGN default
        monthlySpendLimit: 500000, // 500,000 NGN default
        currentDailySpent: 0,
        currentMonthlySpent: 0,
        lastResetDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const wallet = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        ID.unique(),
        newWallet
      );

      console.log(`✅ Virtual wallet initialized for user ${userId}`);
      return wallet as unknown as VirtualWallet;

    } catch (error) {
      console.error('Error initializing virtual wallet:', error);
      throw new Error('Failed to initialize virtual wallet');
    }
  }

  /**
   * Get user's virtual wallet
   */
  static async getUserWallet(userId: string): Promise<VirtualWallet | null> {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        [Query.equal('userId', userId)]
      );

      if (response.documents.length === 0) {
        return null;
      }

      const wallet = response.documents[0] as unknown as VirtualWallet;
      
      // Reset daily/monthly counters if needed
      const updatedWallet = await this.resetSpendingCountersIfNeeded(wallet);
      
      return updatedWallet;
    } catch (error) {
      console.error('Error getting virtual wallet:', error);
      return null;
    }
  }

  /**
   * Top up virtual wallet
   */
  static async topUpWallet(request: WalletTopUpRequest): Promise<{
    success: boolean;
    paymentUrl?: string;
    reference?: string;
    message: string;
  }> {
    try {
      const { userId, amount, paymentMethod, description } = request;

      // Validate amount
      if (amount < 100) {
        throw new Error('Minimum top-up amount is ₦100');
      }

      if (amount > 1000000) { // 1M NGN limit
        throw new Error('Maximum top-up amount is ₦1,000,000');
      }

      // Get or create wallet
      let wallet = await this.getUserWallet(userId);
      if (!wallet) {
        wallet = await this.initializeWallet(userId);
      }

      // Generate payment reference
      const reference = paystack.generateReference('wallet_topup');

      // Get user details for payment
      const user = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        userId
      );

      // Initialize payment with Paystack
      const paymentData = {
        email: user.email,
        amount: amount * 100, // Convert to kobo
        currency: 'NGN',
        reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet/topup/callback`,
        metadata: {
          type: 'wallet_topup' as const,
          userId,
          walletId: wallet.$id!,
          description: description || 'Wallet top-up',
          // Add required fields for PaystackPaymentData compatibility
          bookingId: '', // Not applicable for wallet top-up
          clientId: userId,
          workerId: '', // Not applicable for wallet top-up
        }
      };

      const paymentResponse = await paystack.initializePayment(paymentData);

      if (!paymentResponse.status) {
        throw new Error('Failed to initialize payment');
      }

      // Create pending wallet transaction
      await this.createWalletTransaction({
        userId,
        walletId: wallet.$id!,
        type: 'topup_pending',
        amount,
        reference,
        description: description || 'Wallet top-up',
        status: 'pending',
        metadata: {
          paymentMethod,
          paystackReference: reference
        }
      });

      // Update wallet pending balance
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        wallet.$id!,
        {
          pendingBalance: wallet.pendingBalance + amount,
          updatedAt: new Date().toISOString()
        }
      );

      return {
        success: true,
        paymentUrl: paymentResponse.data.authorization_url,
        reference,
        message: 'Payment initialized successfully'
      };

    } catch (error) {
      console.error('Error topping up wallet:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to top up wallet'
      };
    }
  }

  /**
   * Process successful wallet top-up (called by webhook)
   */
  static async processTopUpSuccess(
    reference: string,
    amount: number,
    metadata: any
  ): Promise<void> {
    try {
      const { userId, walletId } = metadata;

      // Get wallet
      const wallet = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        walletId
      ) as unknown as VirtualWallet;

      // Update wallet balances
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        walletId,
        {
          availableBalance: wallet.availableBalance + amount,
          pendingBalance: wallet.pendingBalance - amount,
          totalDeposits: wallet.totalDeposits + amount,
          updatedAt: new Date().toISOString()
        }
      );

      // Update transaction status
      await this.updateWalletTransactionStatus(reference, 'completed');

      // Create completed transaction record
      await this.createWalletTransaction({
        userId,
        walletId,
        type: 'topup_completed',
        amount,
        reference,
        description: 'Wallet top-up completed',
        status: 'completed',
        metadata: {
          originalReference: reference
        }
      });

      console.log(`✅ Wallet top-up completed: ${amount} NGN for user ${userId}`);

    } catch (error) {
      console.error('Error processing top-up success:', error);
      throw new Error('Failed to process wallet top-up');
    }
  }

  /**
   * Make instant payment from wallet
   */
  static async makeInstantPayment(request: InstantPaymentRequest): Promise<{
    success: boolean;
    escrowTransactionId?: string;
    message: string;
  }> {
    try {
      const { userId, bookingId, amount, workerId, clientId, description } = request;

      // Get wallet
      const wallet = await this.getUserWallet(userId);
      if (!wallet) {
        throw new Error('Virtual wallet not found');
      }

      // Check if wallet is active
      if (!wallet.isActive) {
        throw new Error('Virtual wallet is deactivated');
      }

      // Check available balance
      if (wallet.availableBalance < amount) {
        return {
          success: false,
          message: `Insufficient wallet balance. Available: ₦${wallet.availableBalance.toLocaleString()}, Required: ₦${amount.toLocaleString()}`
        };
      }

      // Check spending limits
      const limitCheck = await this.checkSpendingLimits(wallet, amount);
      if (!limitCheck.allowed) {
        return {
          success: false,
          message: limitCheck.reason!
        };
      }

      // Create wallet payment reference
      const reference = EscrowUtils.generateTransactionReference('wallet_payment', userId);

      // Deduct from wallet
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        wallet.$id!,
        {
          availableBalance: wallet.availableBalance - amount,
          totalSpent: wallet.totalSpent + amount,
          currentDailySpent: wallet.currentDailySpent + amount,
          currentMonthlySpent: wallet.currentMonthlySpent + amount,
          updatedAt: new Date().toISOString()
        }
      );

      // Create escrow transaction
      const escrowTransactionId = await EscrowService.createEscrowTransaction(
        bookingId,
        clientId,
        workerId,
        amount * 100, // Convert to kobo for consistency
        reference,
        {
          serviceName: description,
          paymentMethod: 'virtual_wallet',
          walletPayment: true
        }
      );

      // Create wallet transaction record
      await this.createWalletTransaction({
        userId,
        walletId: wallet.$id!,
        type: 'payment',
        amount: -amount, // Negative for deduction
        reference,
        description: `Payment for booking: ${description}`,
        status: 'completed',
        metadata: {
          bookingId,
          workerId,
          escrowTransactionId: escrowTransactionId.$id
        }
      });

      console.log(`✅ Instant wallet payment: ${amount} NGN for booking ${bookingId}`);

      return {
        success: true,
        escrowTransactionId: escrowTransactionId.$id,
        message: 'Payment completed instantly from wallet'
      };

    } catch (error) {
      console.error('Error making instant payment:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process wallet payment'
      };
    }
  }

  /**
   * Request wallet withdrawal
   */
  static async requestWithdrawal(request: WalletWithdrawalRequest): Promise<{
    success: boolean;
    withdrawalId?: string;
    message: string;
  }> {
    try {
      const { userId, amount, bankDetails, reason } = request;

      // Get wallet
      const wallet = await this.getUserWallet(userId);
      if (!wallet) {
        throw new Error('Virtual wallet not found');
      }

      // Validate withdrawal amount
      if (amount < 500) {
        throw new Error('Minimum withdrawal amount is ₦500');
      }

      if (amount > wallet.availableBalance) {
        throw new Error('Insufficient balance for withdrawal');
      }

      // Create withdrawal request
      const withdrawalId = ID.unique();
      const reference = EscrowUtils.generateTransactionReference('withdrawal', userId);

      const withdrawal = {
        id: withdrawalId,
        userId,
        walletId: wallet.$id!,
        amount,
        status: 'pending',
        bankAccountNumber: bankDetails.accountNumber,
        bankCode: bankDetails.bankCode,
        accountName: bankDetails.accountName,
        reason: reason || 'Wallet withdrawal',
        reference,
        requestedAt: new Date().toISOString(),
        processedAt: null,
        transferReference: null
      };

      // Store withdrawal request
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WALLET_WITHDRAWALS,
        withdrawalId,
        withdrawal
      );

      // Reserve funds (move from available to pending)
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        wallet.$id!,
        {
          availableBalance: wallet.availableBalance - amount,
          pendingBalance: wallet.pendingBalance + amount,
          updatedAt: new Date().toISOString()
        }
      );

      // Create transaction record
      await this.createWalletTransaction({
        userId,
        walletId: wallet.$id!,
        type: 'withdrawal_pending',
        amount: -amount,
        reference,
        description: 'Withdrawal request pending',
        status: 'pending',
        metadata: {
          withdrawalId,
          bankDetails
        }
      });

      console.log(`✅ Withdrawal requested: ${amount} NGN for user ${userId}`);

      return {
        success: true,
        withdrawalId,
        message: 'Withdrawal request submitted. Processing within 1-3 business days.'
      };

    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to request withdrawal'
      };
    }
  }

  /**
   * Check spending limits
   */
  private static async checkSpendingLimits(
    wallet: VirtualWallet, 
    amount: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    
    // Check per-transaction limit (default: 100,000 NGN)
    const perTransactionLimit = 100000;
    if (amount > perTransactionLimit) {
      return {
        allowed: false,
        reason: `Transaction exceeds per-transaction limit of ₦${perTransactionLimit.toLocaleString()}`
      };
    }

    // Check daily limit
    if (wallet.currentDailySpent + amount > wallet.dailySpendLimit) {
      const remaining = wallet.dailySpendLimit - wallet.currentDailySpent;
      return {
        allowed: false,
        reason: `Transaction exceeds daily spending limit. Remaining today: ₦${remaining.toLocaleString()}`
      };
    }

    // Check monthly limit
    if (wallet.currentMonthlySpent + amount > wallet.monthlySpendLimit) {
      const remaining = wallet.monthlySpendLimit - wallet.currentMonthlySpent;
      return {
        allowed: false,
        reason: `Transaction exceeds monthly spending limit. Remaining this month: ₦${remaining.toLocaleString()}`
      };
    }

    return { allowed: true };
  }

  /**
   * Reset spending counters if needed
   */
  private static async resetSpendingCountersIfNeeded(wallet: VirtualWallet): Promise<VirtualWallet> {
    const now = new Date();
    const lastReset = new Date(wallet.lastResetDate);
    
    let needsUpdate = false;
    const updates: Partial<VirtualWallet> = {};

    // Reset daily counter if it's a new day
    if (now.getDate() !== lastReset.getDate() || 
        now.getMonth() !== lastReset.getMonth() || 
        now.getFullYear() !== lastReset.getFullYear()) {
      updates.currentDailySpent = 0;
      needsUpdate = true;
    }

    // Reset monthly counter if it's a new month
    if (now.getMonth() !== lastReset.getMonth() || 
        now.getFullYear() !== lastReset.getFullYear()) {
      updates.currentMonthlySpent = 0;
      needsUpdate = true;
    }

    if (needsUpdate) {
      updates.lastResetDate = now.toISOString();
      updates.updatedAt = now.toISOString();

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        wallet.$id!,
        updates
      );

      return { ...wallet, ...updates };
    }

    return wallet;
  }

  /**
   * Create wallet transaction record
   */
  private static async createWalletTransaction(data: {
    userId: string;
    walletId: string;
    type: string;
    amount: number;
    reference: string;
    description: string;
    status: string;
    metadata?: any;
  }): Promise<void> {
    try {
      const transactionId = ID.unique();
      
      const transaction = {
        userId: data.userId,
        walletId: data.walletId,
        type: data.type,
        amount: data.amount,
        reference: data.reference,
        description: data.description,
        status: data.status,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
        createdAt: new Date().toISOString()
      };

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WALLET_TRANSACTIONS,
        transactionId,
        transaction
      );
    } catch (error) {
      console.error('Error creating wallet transaction:', error);
      // Don't throw - transaction logging failure shouldn't break the main operation
    }
  }

  /**
   * Update wallet transaction status
   */
  private static async updateWalletTransactionStatus(
    reference: string, 
    status: string
  ): Promise<void> {
    try {
      const transactions = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WALLET_TRANSACTIONS,
        [Query.equal('reference', reference)]
      );

      if (transactions.documents.length > 0) {
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WALLET_TRANSACTIONS,
          transactions.documents[0].$id,
          {
            status,
            updatedAt: new Date().toISOString()
          }
        );
      }
    } catch (error) {
      console.error('Error updating wallet transaction status:', error);
    }
  }

  /**
   * Get wallet transaction history
   */
  static async getWalletTransactions(
    userId: string, 
    limit: number = 50
  ): Promise<any[]> {
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

      return response.documents;
    } catch (error) {
      console.error('Error getting wallet transactions:', error);
      return [];
    }
  }

  /**
   * Get wallet statistics
   */
  static async getWalletStats(userId: string): Promise<{
    totalDeposits: number;
    totalSpent: number;
    totalWithdrawn: number;
    transactionCount: number;
    avgTransactionAmount: number;
  }> {
    try {
      const wallet = await this.getUserWallet(userId);
      const transactions = await this.getWalletTransactions(userId, 1000);

      if (!wallet) {
        return {
          totalDeposits: 0,
          totalSpent: 0,
          totalWithdrawn: 0,
          transactionCount: 0,
          avgTransactionAmount: 0
        };
      }

      const avgTransactionAmount = transactions.length > 0 
        ? Math.abs(transactions.reduce((sum, tx) => sum + tx.amount, 0)) / transactions.length
        : 0;

      return {
        totalDeposits: wallet.totalDeposits,
        totalSpent: wallet.totalSpent,
        totalWithdrawn: wallet.totalWithdrawn,
        transactionCount: transactions.length,
        avgTransactionAmount
      };
    } catch (error) {
      console.error('Error getting wallet stats:', error);
      return {
        totalDeposits: 0,
        totalSpent: 0,
        totalWithdrawn: 0,
        transactionCount: 0,
        avgTransactionAmount: 0
      };
    }
  }
} 