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
  bankAccountId: string; // Reference to saved bank account
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
        console.log(`[Wallet] initializeWallet: Wallet already exists for user ${userId}`);
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

    } catch (error: any) {
      // If wallet creation fails due to race condition, fetch the wallet that was created
      console.error('Error initializing virtual wallet:', error);

      // Check if another process created the wallet while we were trying
      const existingWallets = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        [Query.equal('userId', userId)]
      );

      if (existingWallets.documents.length > 0) {
        console.log(`[Wallet] initializeWallet: Wallet created by another process, using existing wallet`);
        return existingWallets.documents[0] as unknown as VirtualWallet;
      }

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

      // Gracefully resolve duplicates by always choosing the most recently updated/created
      const docs = response.documents as unknown as VirtualWallet[];
      if (docs.length > 1) {
        console.warn('[Wallet] getUserWallet:duplicate-wallets-detected', { userId, count: docs.length, walletIds: docs.map(d => d.$id) });
      }
      const wallet = docs
        .slice()
        .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())[0];
      
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
      console.log('[Wallet] topUpWallet: Generated new reference', { reference });

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
          type: 'wallet_topup',
          userId,
          walletId: wallet.$id!,
          description: description || 'Wallet top-up'
        }
      };

      const paymentResponse = await paystack.initializePayment(paymentData as any);

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
      console.log('[Wallet] processTopUpSuccess:start', { reference, amount, userId, walletId });

      // Get wallet first to validate
      const wallet = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        walletId
      ) as unknown as VirtualWallet;
      console.log('[Wallet] processTopUpSuccess:wallet-before', {
        walletId,
        availableBalance: wallet.availableBalance,
        pendingBalance: wallet.pendingBalance,
        totalDeposits: wallet.totalDeposits,
        amountToAdd: amount,
        reference
      });

      // CRITICAL IDEMPOTENCY FIX: Create the completed transaction record FIRST
      // Using the reference as the document ID ensures only ONE transaction can be created
      // If a duplicate webhook arrives, this will fail with a duplicate key error and prevent double-crediting

      // Create a unique but short document ID (max 36 chars for Appwrite)
      // Use the last part of the reference (timestamp + random) which is unique
      const referenceHash = reference.split('_').slice(-2).join('_'); // Get "1760135211090_v5k5cd"
      const completedTransactionId = `topup_${referenceHash}`; // Max ~21 chars

      try {
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WALLET_TRANSACTIONS,
          completedTransactionId,
          {
            userId,
            walletId,
            type: 'topup_completed',
            amount,
            reference,
            description: 'Wallet top-up completed',
            status: 'completed',
            metadata: JSON.stringify({ originalReference: reference }),
            createdAt: new Date().toISOString()
          }
        );
        console.log('[Wallet] processTopUpSuccess:created-idempotency-record', { completedTransactionId, reference });
      } catch (error: any) {
        // If document already exists, check if wallet was actually credited
        if (error?.code === 409 || error?.message?.includes('already exists') || error?.message?.includes('unique')) {
          console.log('[Wallet] processTopUpSuccess:idempotency-check - document exists, verifying wallet was credited', {
            reference,
            completedTransactionId
          });

          // IMPROVED IDEMPOTENCY: Verify wallet was actually credited
          // Re-fetch wallet to get fresh data
          const freshWallet = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.VIRTUAL_WALLETS,
            walletId
          ) as unknown as VirtualWallet;

          console.log('[Wallet] processTopUpSuccess:wallet-check', {
            reference,
            originalPendingBalance: wallet.pendingBalance,
            freshPendingBalance: freshWallet.pendingBalance,
            amountToCredit: amount,
            originalAvailableBalance: wallet.availableBalance,
            freshAvailableBalance: freshWallet.availableBalance
          });

          // Check if wallet was already credited by comparing available balance
          // If available balance increased by the amount, wallet was already credited
          const expectedAvailableBalance = wallet.availableBalance + amount;
          const wasAlreadyCredited = freshWallet.availableBalance >= expectedAvailableBalance;
          
          if (wasAlreadyCredited) {
            // Wallet was already credited successfully
            console.log('[Wallet] processTopUpSuccess:skip-duplicate - wallet already credited ✅', {
              reference,
              completedTransactionId,
              originalAvailable: wallet.availableBalance,
              currentAvailable: freshWallet.availableBalance,
              expectedAvailable: expectedAvailableBalance,
              message: 'This payment was already processed and wallet was credited. Skipping.'
            });
            return; // Exit gracefully - wallet already has the money
          } else {
            // Document exists but wallet wasn't credited (recovery mode)
            console.log('[Wallet] processTopUpSuccess:RECOVERY MODE - document exists but wallet not credited, crediting now', {
              reference,
              completedTransactionId,
              originalAvailable: wallet.availableBalance,
              currentAvailable: freshWallet.availableBalance,
              expectedAvailable: expectedAvailableBalance,
              amountToCredit: amount
            });

            // Proceed to credit the wallet (don't return early)
            // Update the wallet reference for the crediting logic below
            wallet.availableBalance = freshWallet.availableBalance;
            wallet.pendingBalance = freshWallet.pendingBalance;
            wallet.totalDeposits = freshWallet.totalDeposits;
          }
        } else {
          // Other errors should be thrown
          console.error('[Wallet] processTopUpSuccess:unexpected-error', { error, reference });
          throw error;
        }
      }

      // Now that we've secured the idempotency lock, update the wallet
      console.log('[Wallet] processTopUpSuccess:CREDITING-WALLET-NOW', {
        reference,
        completedTransactionId,
        amountToCredit: amount,
        currentAvailable: wallet.availableBalance,
        newAvailable: wallet.availableBalance + amount
      });

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        walletId,
        {
          availableBalance: wallet.availableBalance + amount,
          pendingBalance: Math.max((wallet.pendingBalance || 0) - amount, 0),
          totalDeposits: wallet.totalDeposits + amount,
          updatedAt: new Date().toISOString()
        }
      );
      console.log('[Wallet] processTopUpSuccess:wallet-after ✅ SUCCESSFULLY CREDITED', {
        walletId,
        reference,
        availableBalance: wallet.availableBalance + amount,
        pendingBalance: Math.max((wallet.pendingBalance || 0) - amount, 0),
        totalDeposits: wallet.totalDeposits + amount
      });

      // Update the original pending transaction status
      await this.updateWalletTransactionStatus(reference, 'completed');

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
    reference?: string;
    message: string;
  }> {
    try {
      const { userId, amount, bankAccountId, reason } = request;

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

      // Get bank account details
      const bankAccount = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS || 'bank_accounts',
        bankAccountId
      );

      if (!bankAccount || bankAccount.userId !== userId) {
        throw new Error('Invalid bank account');
      }

      // Generate reference
      const reference = EscrowUtils.generateTransactionReference('withdrawal', userId);

      // Create withdrawal request (following worker pattern)
      const withdrawalRequest = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WALLET_WITHDRAWALS,
        ID.unique(),
        {
          userId,
          bankAccountId,
          amount,
          reference,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
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
        description: `Withdrawal to ${bankAccount.bankName} - ${bankAccount.accountNumber}`,
        status: 'pending',
        metadata: {
          withdrawalId: withdrawalRequest.$id,
          bankAccountId,
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber
        }
      });

      console.log(`✅ Withdrawal requested: ${amount} NGN for user ${userId} to ${bankAccount.bankName}`);

      return {
        success: true,
        withdrawalId: withdrawalRequest.$id,
        reference,
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
      // Check for existing transaction with same reference to prevent duplicates
      const existingTransactions = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WALLET_TRANSACTIONS,
        [Query.equal('reference', data.reference), Query.limit(1)]
      );

      if (existingTransactions.documents.length > 0) {
        console.log('Wallet transaction already exists for reference:', data.reference);
        return;
      }

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
   * Credit worker earnings to virtual wallet (called when escrow is released)
   */
  static async creditWorkerEarnings(
    workerId: string,
    amount: number,
    bookingId: string,
    description: string = 'Booking payment released'
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Try to find actual user ID if workerId might be a worker profile ID
      let actualUserId = workerId;
      
      try {
        // Check if this is a worker profile ID by looking it up in WORKERS collection
        const workerProfile = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WORKERS,
          workerId
        );
        
        // If found and has userId field, use that instead
        if (workerProfile.userId) {
          actualUserId = workerProfile.userId;
          console.log(`🔄 Mapping worker profile ${workerId} to user ${actualUserId}`);
        }
      } catch (error) {
        // Not a worker profile ID, treat as user ID directly
        console.log(`✅ Using ${workerId} as user ID directly`);
      }

      // Get or create worker's virtual wallet using the actual user ID
      let wallet = await this.getUserWallet(actualUserId);
      if (!wallet) {
        wallet = await this.initializeWallet(actualUserId);
      }

      // Generate earnings reference
      const reference = EscrowUtils.generateTransactionReference('worker_earnings', actualUserId);

      // Credit the wallet
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        wallet.$id!,
        {
          availableBalance: wallet.availableBalance + amount,
          totalDeposits: wallet.totalDeposits + amount,
          updatedAt: new Date().toISOString()
        }
      );

      // Create transaction record
      await this.createWalletTransaction({
        userId: actualUserId,
        walletId: wallet.$id!,
        type: 'earnings_credit',
        amount,
        reference,
        description,
        status: 'completed',
        metadata: {
          bookingId,
          source: 'escrow_release',
          earnedAt: new Date().toISOString()
        }
      });

      console.log(`✅ Worker earnings credited: ₦${amount} to worker ${actualUserId} for booking ${bookingId}`);

      return {
        success: true,
        message: `₦${amount.toLocaleString()} credited to your virtual wallet`
      };

    } catch (error) {
      console.error('Error crediting worker earnings:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to credit earnings'
      };
    }
  }

  /**
   * Credit client refund to virtual wallet
   */
  static async creditClientRefund(
    clientId: string,
    amount: number,
    bookingId: string,
    description: string = 'Booking refund'
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Get or create client's virtual wallet
      let wallet = await this.getUserWallet(clientId);
      if (!wallet) {
        wallet = await this.initializeWallet(clientId);
      }

      // Generate refund reference
      const reference = EscrowUtils.generateTransactionReference('client_refund', clientId);

      // Credit the wallet
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        wallet.$id!,
        {
          availableBalance: wallet.availableBalance + amount,
          totalDeposits: wallet.totalDeposits + amount,
          updatedAt: new Date().toISOString()
        }
      );

      // Create transaction record
      await this.createWalletTransaction({
        userId: clientId,
        walletId: wallet.$id!,
        type: 'refund_credit',
        amount,
        reference,
        description,
        status: 'completed',
        metadata: {
          bookingId,
          source: 'escrow_refund',
          refundedAt: new Date().toISOString()
        }
      });

      console.log(`✅ Client refund credited: ₦${amount} to client ${clientId} for booking ${bookingId}`);

      return {
        success: true,
        message: `₦${amount.toLocaleString()} refunded to your virtual wallet`
      };

    } catch (error) {
      console.error('Error crediting client refund:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to credit refund'
      };
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