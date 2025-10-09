import { databases, COLLECTIONS } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { EscrowService } from '@/lib/escrow-service';
import { EscrowUtils } from '@/lib/escrow-utils';
import { emailService } from '@/lib/email-service';
import { notificationService } from '@/lib/notification-service';

export interface WithdrawalRequest {
  userId: string;
  amount: number;
  bankAccountId: string;
  reason?: string;
}

export interface WithdrawalApproval {
  withdrawalId: string;
  adminId: string;
  action: 'approve' | 'reject';
  reason?: string;
}

export class WithdrawalWorkflowService {
  /**
   * Initiate a withdrawal request
   * 1. Check user balance
   * 2. Create withdrawal request
   * 3. Update user balance (move to pending)
   * 4. Send notifications
   */
  static async initiateWithdrawal(request: WithdrawalRequest): Promise<{
    success: boolean;
    withdrawalId?: string;
    message: string;
  }> {
    try {
      const { userId, amount, bankAccountId, reason } = request;

      // 1. Validate user balance
      const userBalance = await EscrowService.getUserBalance(userId);
      if (!userBalance) {
        throw new Error('Unable to retrieve your balance. Please try again.');
      }

      if (userBalance.availableBalance < amount) {
        throw new Error(`Insufficient balance. Available: ₦${EscrowUtils.formatAmount(userBalance.availableBalance)}`);
      }

      // 2. Get bank account details
      const bankAccount = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS || 'bank_accounts',
        bankAccountId
      );

      if (!bankAccount || bankAccount.userId !== userId) {
        throw new Error('Invalid bank account');
      }

      // 3. Create withdrawal request
      const withdrawalRequest = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS || 'withdrawals',
        ID.unique(),
        {
          userId,
          amount,
          bankAccountId,
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber,
          accountName: bankAccount.accountName,
          status: 'pending_approval',
          reason: reason || 'Withdrawal request',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // 4. Update user balance (immediately deduct from available balance)
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USER_BALANCES,
        userBalance.$id,
        {
          availableBalance: userBalance.availableBalance - amount,
          totalWithdrawn: (userBalance.totalWithdrawn || 0) + amount,
          updatedAt: new Date().toISOString()
        }
      );

      // 5. Create transaction record (money immediately deducted)
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.TRANSACTIONS,
        ID.unique(),
        {
          userId,
          type: 'withdrawal_request',
          amount: -amount,
          description: `Withdrawal request to ${bankAccount.bankName} - ${bankAccount.accountNumber} (Amount deducted immediately)`,
          reference: `withdrawal_${withdrawalRequest.$id}`,
          status: 'pending_approval',
          withdrawalId: withdrawalRequest.$id,
          bankAccountId,
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // 6. Send notifications
      await this.sendWithdrawalNotifications(withdrawalRequest.$id, userId, amount, bankAccount);

      return {
        success: true,
        withdrawalId: withdrawalRequest.$id,
        message: 'Withdrawal request submitted successfully. You will be notified once it\'s approved.'
      };

    } catch (error) {
      console.error('Withdrawal initiation failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to initiate withdrawal'
      };
    }
  }

  /**
   * Send notifications for withdrawal request
   */
  private static async sendWithdrawalNotifications(
    withdrawalId: string,
    userId: string,
    amount: number,
    bankAccount: any
  ): Promise<void> {
    try {
      // Get user details for email
      const user = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        userId
      );

      // 1. Send in-app notification to user
      await notificationService.createNotification({
        userId,
        title: 'Withdrawal Request Submitted 📤',
        message: `Your withdrawal request of ₦${EscrowUtils.formatAmount(amount)} has been submitted and the amount has been deducted from your account. It's pending admin approval.`,
        type: 'info',
        actionUrl: '/worker/wallet',
        idempotencyKey: `withdrawal_submitted_${withdrawalId}`
      });

      // 2. Send email to user
      await emailService.sendWithdrawalRequestEmail({
        to: user.email,
        userName: user.name || 'User',
        amount: EscrowUtils.formatAmount(amount),
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        withdrawalId
      });

      // 3. Send email to admin
      await emailService.sendAdminWithdrawalNotification({
        to: process.env.ADMIN_EMAIL || 'admin@errandwork.com',
        userName: user.name || 'User',
        userEmail: user.email,
        amount: EscrowUtils.formatAmount(amount),
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        withdrawalId
      });

      // 4. Send in-app notification to admin (if admin user exists)
      try {
        const adminUsers = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.USERS,
          [Query.equal('role', 'admin'), Query.limit(1)]
        );

        if (adminUsers.documents.length > 0) {
          const admin = adminUsers.documents[0];
          await notificationService.createNotification({
            userId: admin.$id,
            title: 'New Withdrawal Request ⚠️',
            message: `${user.name || 'A user'} has requested a withdrawal of ₦${EscrowUtils.formatAmount(amount)}. Please review and approve.`,
            type: 'warning',
            actionUrl: '/admin/withdrawals',
            idempotencyKey: `admin_withdrawal_${withdrawalId}`
          });
        }
      } catch (adminNotificationError) {
        console.warn('Failed to send admin notification:', adminNotificationError);
        // Don't fail the whole process if admin notification fails
      }

    } catch (error) {
      console.error('Failed to send withdrawal notifications:', error);
      // Don't fail the withdrawal if notifications fail
    }
  }

  /**
   * Get pending withdrawals for admin
   */
  static async getPendingWithdrawals(): Promise<any[]> {
    try {
      const withdrawals = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS || 'withdrawals',
        [Query.equal('status', 'pending_approval'), Query.orderDesc('createdAt')]
      );

      // Get user details for each withdrawal
      const withdrawalsWithUsers = await Promise.all(
        withdrawals.documents.map(async (withdrawal) => {
          try {
            const user = await databases.getDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              COLLECTIONS.USERS,
              withdrawal.userId
            );
            return {
              ...withdrawal,
              user: {
                name: user.name,
                email: user.email,
                phone: user.phone
              }
            };
          } catch (error) {
            console.warn(`Failed to get user details for withdrawal ${withdrawal.$id}:`, error);
            return withdrawal;
          }
        })
      );

      return withdrawalsWithUsers;
    } catch (error) {
      console.error('Failed to get pending withdrawals:', error);
      throw error;
    }
  }

  /**
   * Approve or reject a withdrawal
   */
  static async processWithdrawalApproval(approval: WithdrawalApproval): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { withdrawalId, adminId, action, reason } = approval;

      // Get withdrawal details
      const withdrawal = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS || 'withdrawals',
        withdrawalId
      );

      if (withdrawal.status !== 'pending_approval') {
        throw new Error('Withdrawal is not pending approval');
      }

      // Get user balance
      const userBalance = await EscrowService.getUserBalance(withdrawal.userId);
      if (!userBalance) {
        throw new Error('Unable to retrieve user balance');
      }

      if (action === 'approve') {
        // Approve withdrawal (money already deducted, just update status)
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WITHDRAWALS || 'withdrawals',
          withdrawalId,
          {
            status: 'approved',
            approvedBy: adminId,
            approvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        );

        // No need to update user balance - money already deducted during request

        // Update transaction status
        const transactions = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.TRANSACTIONS,
          [Query.equal('withdrawalId', withdrawalId), Query.limit(1)]
        );

        if (transactions.documents.length > 0) {
          await databases.updateDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.TRANSACTIONS,
            transactions.documents[0].$id,
            {
              status: 'approved',
              updatedAt: new Date().toISOString()
            }
          );
        }

        // Send approval notifications
        await this.sendApprovalNotifications(withdrawal, 'approved');

        return {
          success: true,
          message: 'Withdrawal approved successfully'
        };

      } else {
        // Reject withdrawal
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WITHDRAWALS || 'withdrawals',
          withdrawalId,
          {
            status: 'rejected',
            rejectedBy: adminId,
            rejectionReason: reason || 'Withdrawal rejected',
            rejectedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        );

        // Return money to available balance (reverse the deduction)
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.USER_BALANCES,
          userBalance.$id,
          {
            availableBalance: userBalance.availableBalance + withdrawal.amount,
            totalWithdrawn: (userBalance.totalWithdrawn || 0) - withdrawal.amount,
            updatedAt: new Date().toISOString()
          }
        );

        // Update transaction status
        const transactions = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.TRANSACTIONS,
          [Query.equal('withdrawalId', withdrawalId), Query.limit(1)]
        );

        if (transactions.documents.length > 0) {
          await databases.updateDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.TRANSACTIONS,
            transactions.documents[0].$id,
            {
              status: 'rejected',
              rejectionReason: reason || 'Withdrawal rejected',
              updatedAt: new Date().toISOString()
            }
          );
        }

        // Send rejection notifications
        await this.sendApprovalNotifications(withdrawal, 'rejected', reason);

        return {
          success: true,
          message: 'Withdrawal rejected successfully'
        };
      }

    } catch (error) {
      console.error('Withdrawal approval failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process withdrawal approval'
      };
    }
  }

  /**
   * Send approval/rejection notifications
   */
  private static async sendApprovalNotifications(
    withdrawal: any,
    action: 'approved' | 'rejected',
    reason?: string
  ): Promise<void> {
    try {
      // Get user details
      const user = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        withdrawal.userId
      );

      // Send in-app notification
      const title = action === 'approved' ? 'Withdrawal Approved ✅' : 'Withdrawal Rejected ❌';
      const message = action === 'approved' 
        ? `Your withdrawal request of ₦${EscrowUtils.formatAmount(withdrawal.amount)} has been approved and is being processed.`
        : `Your withdrawal request of ₦${EscrowUtils.formatAmount(withdrawal.amount)} has been rejected. ${reason || 'Please contact support for more information.'}`;

      await notificationService.createNotification({
        userId: withdrawal.userId,
        title,
        message,
        type: action === 'approved' ? 'success' : 'error',
        actionUrl: '/worker/wallet',
        idempotencyKey: `withdrawal_${action}_${withdrawal.$id}`
      });

      // Send email notification
      if (action === 'approved') {
        await emailService.sendWithdrawalApprovedEmail({
          to: user.email,
          userName: user.name || 'User',
          amount: EscrowUtils.formatAmount(withdrawal.amount),
          bankName: withdrawal.bankName,
          accountNumber: withdrawal.accountNumber
        });
      } else {
        await emailService.sendWithdrawalRejectedEmail({
          to: user.email,
          userName: user.name || 'User',
          amount: EscrowUtils.formatAmount(withdrawal.amount),
          reason: reason || 'Withdrawal rejected',
          bankName: withdrawal.bankName,
          accountNumber: withdrawal.accountNumber
        });
      }

    } catch (error) {
      console.error('Failed to send approval notifications:', error);
    }
  }
}
