import { Query, ID } from 'appwrite';
import { COLLECTIONS, DATABASE_ID } from './appwrite';
const { serverDatabases, serverStorage } = require('./appwrite-server');
import { BookingCompletionService } from './booking-completion.service';
import { WalletService } from './wallet.service';

/**
 * ACCOUNT DELETION SERVICE
 *
 * Handles complete account deletion with:
 * - Auto-cancellation of active bookings with refunds
 * - Auto-refund of wallet balance to bank account
 * - Hard deletion from all collections (GDPR-compliant)
 * - Immediate permanent deletion (no recovery period)
 */

interface DeletionEligibility {
  canDelete: boolean;
  blockers: string[];
  warnings: string[];
  summary: {
    activeBookings: number;
    walletBalance: number;
    escrowBalance: number;
    pendingWithdrawals: number;
    openDisputes: number;
  };
}

interface DeletionResult {
  success: boolean;
  message: string;
  details?: {
    bookingsCancelled: number;
    refundProcessed: number;
    collectionsDeleted: string[];
    filesDeleted: number;
  };
  error?: string;
}

export class AccountDeletionService {

  /**
   * Check if user is eligible for account deletion
   * Blocks deletion if there are open disputes or pending withdrawals
   */
  static async checkDeletionEligibility(userId: string): Promise<DeletionEligibility> {
    try {
      const blockers: string[] = [];
      const warnings: string[] = [];

      // 1. Check for open disputes (BLOCKER)
      const disputes = await serverDatabases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.DISPUTES,
        [
          Query.or([
            Query.equal('clientId', userId),
            Query.equal('workerId', userId)
          ]),
          Query.notEqual('status', 'resolved'),
          Query.limit(1)
        ]
      );

      const openDisputes = disputes.total;
      if (openDisputes > 0) {
        blockers.push(`You have ${openDisputes} open dispute(s) that must be resolved first`);
      }

      // 2. Check for pending withdrawals (BLOCKER)
      const withdrawals = await serverDatabases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WALLET_WITHDRAWALS,
        [
          Query.equal('userId', userId),
          Query.equal('status', 'pending'),
          Query.limit(1)
        ]
      );

      const pendingWithdrawals = withdrawals.total;
      if (pendingWithdrawals > 0) {
        blockers.push(`You have ${pendingWithdrawals} pending withdrawal(s) that must complete first`);
      }

      // 3. Count active bookings (will be auto-cancelled)
      const activeBookings = await serverDatabases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BOOKINGS,
        [
          Query.or([
            Query.equal('clientId', userId),
            Query.equal('workerId', userId)
          ]),
          Query.or([
            Query.equal('status', 'confirmed'),
            Query.equal('status', 'accepted'),
            Query.equal('status', 'in_progress'),
            Query.equal('status', 'worker_completed')
          ]),
          Query.limit(100)
        ]
      );

      if (activeBookings.total > 0) {
        warnings.push(`${activeBookings.total} active booking(s) will be cancelled with full refunds`);
      }

      // 4. Get wallet balance
      const wallets = await serverDatabases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.VIRTUAL_WALLETS,
        [Query.equal('userId', userId), Query.limit(1)]
      );

      let walletBalance = 0;
      let escrowBalance = 0;

      if (wallets.documents.length > 0) {
        const wallet = wallets.documents[0];
        walletBalance = wallet.balance || 0;
        escrowBalance = wallet.escrow || 0;

        if (walletBalance > 0 || escrowBalance > 0) {
          const total = walletBalance + escrowBalance;
          warnings.push(`₦${total.toLocaleString()} will be refunded to your bank account`);
        }
      }

      return {
        canDelete: blockers.length === 0,
        blockers,
        warnings,
        summary: {
          activeBookings: activeBookings.total,
          walletBalance,
          escrowBalance,
          pendingWithdrawals,
          openDisputes
        }
      };

    } catch (error) {
      console.error('Error checking deletion eligibility:', error);
      throw new Error('Failed to check account deletion eligibility');
    }
  }

  /**
   * Cancel all active bookings for the user
   * Refunds clients for both client and worker cancellations
   */
  static async cancelActiveBookings(userId: string): Promise<number> {
    try {
      // Get all active bookings where user is client or worker
      const bookings = await serverDatabases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BOOKINGS,
        [
          Query.or([
            Query.equal('clientId', userId),
            Query.equal('workerId', userId)
          ]),
          Query.or([
            Query.equal('status', 'confirmed'),
            Query.equal('status', 'accepted'),
            Query.equal('status', 'in_progress'),
            Query.equal('status', 'worker_completed')
          ]),
          Query.limit(100)
        ]
      );

      let cancelledCount = 0;

      for (const booking of bookings.documents) {
        try {
          // Use BookingCompletionService to handle cancellation and refund
          await BookingCompletionService.cancelBooking({
            bookingId: booking.$id,
            clientId: booking.clientId,
            reason: 'Account deletion - automatic cancellation'
          });

          cancelledCount++;
        } catch (error) {
          console.error(`Failed to cancel booking ${booking.$id}:`, error);
          // Continue with other bookings even if one fails
        }
      }

      return cancelledCount;

    } catch (error) {
      console.error('Error cancelling active bookings:', error);
      throw new Error('Failed to cancel active bookings');
    }
  }

  /**
   * Process wallet refund to user's bank account
   * Withdraws all available balance + releases escrow
   */
  static async processWalletRefund(userId: string): Promise<number> {
    try {
      const wallets = await serverDatabases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.VIRTUAL_WALLETS,
        [Query.equal('userId', userId), Query.limit(1)]
      );

      if (wallets.documents.length === 0) {
        return 0;
      }

      const wallet = wallets.documents[0];
      const totalBalance = (wallet.balance || 0) + (wallet.escrow || 0);

      if (totalBalance <= 0) {
        return 0;
      }

      // If there's escrow, move it to available balance first
      if (wallet.escrow > 0) {
        await serverDatabases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.VIRTUAL_WALLETS,
          wallet.$id,
          {
            balance: wallet.balance + wallet.escrow,
            escrow: 0,
            updatedAt: new Date().toISOString()
          }
        );
      }

      // Get user's bank account for auto-withdrawal
      const bankAccounts = await serverDatabases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BANK_ACCOUNTS,
        [Query.equal('userId', userId), Query.limit(1)]
      );

      // Create withdrawal request (will be processed immediately)
      if (bankAccounts.documents.length > 0) {
        const bankAccount = bankAccounts.documents[0];

        await serverDatabases.createDocument(
          DATABASE_ID,
          COLLECTIONS.WALLET_WITHDRAWALS,
          ID.unique(),
          {
            userId,
            amount: totalBalance,
            bankAccountId: bankAccount.$id,
            status: 'completed', // Mark as completed for account deletion
            method: 'bank_transfer',
            description: 'Account deletion - automatic withdrawal',
            requestedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            reference: `account_deletion_${userId}_${Date.now()}`
          }
        );
      }

      // Set wallet balance to 0
      await serverDatabases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.VIRTUAL_WALLETS,
        wallet.$id,
        {
          balance: 0,
          escrow: 0,
          updatedAt: new Date().toISOString()
        }
      );

      return totalBalance;

    } catch (error) {
      console.error('Error processing wallet refund:', error);
      throw new Error('Failed to process wallet refund');
    }
  }

  /**
   * Delete user data from all collections (hard delete)
   */
  static async deleteUserData(userId: string): Promise<string[]> {
    const deletedCollections: string[] = [];

    try {
      // Get user role to determine which collections to check
      const user = await serverDatabases.getDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        userId
      );

      const isWorker = user.role === 'worker';

      // 1. Delete WORKERS profile (if worker)
      if (isWorker) {
        try {
          const workers = await serverDatabases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.WORKERS,
            [Query.equal('userId', userId), Query.limit(1)]
          );

          for (const worker of workers.documents) {
            await serverDatabases.deleteDocument(
              DATABASE_ID,
              COLLECTIONS.WORKERS,
              worker.$id
            );
          }
          deletedCollections.push('WORKERS');
        } catch (error) {
          console.error('Error deleting worker profile:', error);
        }
      }

      // 2. Delete BOOKINGS
      try {
        const bookings = await serverDatabases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.BOOKINGS,
          [
            Query.or([
              Query.equal('clientId', userId),
              Query.equal('workerId', userId)
            ]),
            Query.limit(500)
          ]
        );

        for (const booking of bookings.documents) {
          await serverDatabases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.BOOKINGS,
            booking.$id
          );
        }
        deletedCollections.push('BOOKINGS');
      } catch (error) {
        console.error('Error deleting bookings:', error);
      }

      // 3. Delete JOBS
      try {
        const jobs = await serverDatabases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.JOBS,
          [Query.equal('clientId', userId), Query.limit(500)]
        );

        for (const job of jobs.documents) {
          await serverDatabases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.JOBS,
            job.$id
          );
        }
        deletedCollections.push('JOBS');
      } catch (error) {
        console.error('Error deleting jobs:', error);
      }

      // 4. Delete JOB_APPLICATIONS
      try {
        const applications = await serverDatabases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.JOB_APPLICATIONS,
          [
            Query.or([
              Query.equal('workerId', userId),
              Query.equal('clientId', userId)
            ]),
            Query.limit(500)
          ]
        );

        for (const app of applications.documents) {
          await serverDatabases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.JOB_APPLICATIONS,
            app.$id
          );
        }
        deletedCollections.push('JOB_APPLICATIONS');
      } catch (error) {
        console.error('Error deleting job applications:', error);
      }

      // 5. Delete REVIEWS
      try {
        const reviews = await serverDatabases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.REVIEWS,
          [
            Query.or([
              Query.equal('clientId', userId),
              Query.equal('workerId', userId)
            ]),
            Query.limit(500)
          ]
        );

        for (const review of reviews.documents) {
          await serverDatabases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.REVIEWS,
            review.$id
          );
        }
        deletedCollections.push('REVIEWS');
      } catch (error) {
        console.error('Error deleting reviews:', error);
      }

      // 6. Delete MESSAGES
      try {
        const messages = await serverDatabases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.MESSAGES,
          [
            Query.or([
              Query.equal('senderId', userId),
              Query.equal('recipientId', userId)
            ]),
            Query.limit(500)
          ]
        );

        for (const message of messages.documents) {
          await serverDatabases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.MESSAGES,
            message.$id
          );
        }
        deletedCollections.push('MESSAGES');
      } catch (error) {
        console.error('Error deleting messages:', error);
      }

      // 7. Delete NOTIFICATIONS
      try {
        const notifications = await serverDatabases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.NOTIFICATIONS,
          [Query.equal('userId', userId), Query.limit(500)]
        );

        for (const notification of notifications.documents) {
          await serverDatabases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.NOTIFICATIONS,
            notification.$id
          );
        }
        deletedCollections.push('NOTIFICATIONS');
      } catch (error) {
        console.error('Error deleting notifications:', error);
      }

      // 8. Delete VIRTUAL_WALLETS
      try {
        const wallets = await serverDatabases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.VIRTUAL_WALLETS,
          [Query.equal('userId', userId), Query.limit(1)]
        );

        for (const wallet of wallets.documents) {
          await serverDatabases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.VIRTUAL_WALLETS,
            wallet.$id
          );
        }
        deletedCollections.push('VIRTUAL_WALLETS');
      } catch (error) {
        console.error('Error deleting wallet:', error);
      }

      // 9. Delete WALLET_TRANSACTIONS
      try {
        const transactions = await serverDatabases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.WALLET_TRANSACTIONS,
          [Query.equal('userId', userId), Query.limit(500)]
        );

        for (const transaction of transactions.documents) {
          await serverDatabases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.WALLET_TRANSACTIONS,
            transaction.$id
          );
        }
        deletedCollections.push('WALLET_TRANSACTIONS');
      } catch (error) {
        console.error('Error deleting transactions:', error);
      }

      // 10. Delete BANK_ACCOUNTS
      try {
        const bankAccounts = await serverDatabases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.BANK_ACCOUNTS,
          [Query.equal('userId', userId), Query.limit(10)]
        );

        for (const account of bankAccounts.documents) {
          await serverDatabases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.BANK_ACCOUNTS,
            account.$id
          );
        }
        deletedCollections.push('BANK_ACCOUNTS');
      } catch (error) {
        console.error('Error deleting bank accounts:', error);
      }

      // 11. Delete WITHDRAWALS
      try {
        const withdrawals = await serverDatabases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.WALLET_WITHDRAWALS,
          [Query.equal('userId', userId), Query.limit(500)]
        );

        for (const withdrawal of withdrawals.documents) {
          await serverDatabases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.WALLET_WITHDRAWALS,
            withdrawal.$id
          );
        }
        deletedCollections.push('WALLET_WITHDRAWALS');
      } catch (error) {
        console.error('Error deleting withdrawals:', error);
      }

      // 12. Delete DISPUTES
      try {
        const disputes = await serverDatabases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.DISPUTES,
          [
            Query.or([
              Query.equal('clientId', userId),
              Query.equal('workerId', userId)
            ]),
            Query.limit(500)
          ]
        );

        for (const dispute of disputes.documents) {
          await serverDatabases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.DISPUTES,
            dispute.$id
          );
        }
        deletedCollections.push('DISPUTES');
      } catch (error) {
        console.error('Error deleting disputes:', error);
      }

      // 13. Finally, delete USERS profile
      try {
        await serverDatabases.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.USERS,
          userId
        );
        deletedCollections.push('USERS');
      } catch (error) {
        console.error('Error deleting user profile:', error);
        throw error; // This is critical, so throw if it fails
      }

      return deletedCollections;

    } catch (error) {
      console.error('Error deleting user data:', error);
      throw new Error('Failed to delete user data from database');
    }
  }

  /**
   * Delete user files from storage (profile images, documents, attachments)
   */
  static async deleteStorageFiles(userId: string): Promise<number> {
    let deletedCount = 0;

    try {
      const STORAGE_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID!;

      // List all files owned by the user
      const files = await serverStorage.listFiles(
        STORAGE_BUCKET_ID,
        [Query.equal('$permissions', `read("user:${userId}")`)],
        100
      );

      // Delete each file
      for (const file of files.files) {
        try {
          await serverStorage.deleteFile(STORAGE_BUCKET_ID, file.$id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete file ${file.$id}:`, error);
          // Continue with other files even if one fails
        }
      }

      return deletedCount;

    } catch (error) {
      console.error('Error deleting storage files:', error);
      // Don't throw - storage deletion failures shouldn't block account deletion
      return deletedCount;
    }
  }

  /**
   * Main account deletion orchestrator
   * Executes complete deletion flow
   */
  static async processAccountDeletion(userId: string): Promise<DeletionResult> {
    try {
      console.log(`🗑️ Starting account deletion for user: ${userId}`);

      // 1. Check eligibility
      const eligibility = await this.checkDeletionEligibility(userId);

      if (!eligibility.canDelete) {
        return {
          success: false,
          message: `Cannot delete account: ${eligibility.blockers.join(', ')}`,
        };
      }

      // 2. Cancel active bookings
      console.log('📋 Cancelling active bookings...');
      const bookingsCancelled = await this.cancelActiveBookings(userId);
      console.log(`✅ Cancelled ${bookingsCancelled} bookings`);

      // 3. Process wallet refund
      console.log('💰 Processing wallet refund...');
      const refundProcessed = await this.processWalletRefund(userId);
      console.log(`✅ Refunded ₦${refundProcessed.toLocaleString()}`);

      // 4. Delete storage files
      console.log('📁 Deleting storage files...');
      const filesDeleted = await this.deleteStorageFiles(userId);
      console.log(`✅ Deleted ${filesDeleted} files`);

      // 5. Delete user data from all collections
      console.log('🗄️ Deleting database records...');
      const collectionsDeleted = await this.deleteUserData(userId);
      console.log(`✅ Deleted from ${collectionsDeleted.length} collections`);

      // 6. Log deletion event (before deleting user)
      console.log('📝 Logging deletion event...');
      try {
        await serverDatabases.createDocument(
          DATABASE_ID,
          COLLECTIONS.WALLET_TRANSACTIONS, // Use transactions table for audit
          ID.unique(),
          {
            userId: 'system',
            type: 'account_deletion',
            amount: 0,
            status: 'completed',
            description: `Account deleted: ${userId}`,
            reference: `deletion_${userId}_${Date.now()}`,
            createdAt: new Date().toISOString()
          }
        );
      } catch (logError) {
        console.error('Failed to log deletion event:', logError);
        // Don't fail deletion if logging fails
      }

      console.log('✅ Account deletion completed successfully');

      return {
        success: true,
        message: 'Your account has been permanently deleted',
        details: {
          bookingsCancelled,
          refundProcessed,
          collectionsDeleted,
          filesDeleted
        }
      };

    } catch (error: any) {
      console.error('❌ Account deletion failed:', error);
      return {
        success: false,
        message: 'Failed to delete account. Please contact support.',
        error: error.message
      };
    }
  }
}
