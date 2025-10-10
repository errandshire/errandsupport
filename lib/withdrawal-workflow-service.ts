import { databases, COLLECTIONS } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { VirtualWalletService } from '@/lib/virtual-wallet-service';
import { EscrowUtils } from '@/lib/escrow-utils';
import { notificationService } from '@/lib/notification-service';
import { PaystackService } from '@/lib/paystack';

export interface WithdrawalRequest {
  userId: string;
  amount: number;
  bankAccountId: string;
  reason?: string;
}

/**
 * Simple Withdrawal Service with Paystack Integration
 * Withdraws from Virtual Wallet - money deducted immediately
 * Automatically initiates Paystack transfer
 */
export class WithdrawalWorkflowService {
  private static paystackService = PaystackService.getInstance();

  /**
   * Initiate a withdrawal request
   * 1. Check virtual wallet balance
   * 2. Deduct money immediately from virtual wallet
   * 3. Initiate Paystack transfer
   * 4. Create withdrawal record
   * 5. Send notification
   */
  static async initiateWithdrawal(request: WithdrawalRequest): Promise<{
    success: boolean;
    withdrawalId?: string;
    message: string;
  }> {
    try {
      const { userId, amount, bankAccountId, reason } = request;

      // 1. Validate minimum withdrawal amount (Paystack minimum is ₦100)
      const MIN_WITHDRAWAL = 100;
      if (amount < MIN_WITHDRAWAL) {
        throw new Error(`Minimum withdrawal amount is ₦${MIN_WITHDRAWAL}. Please enter a higher amount.`);
      }

      // 2. Get virtual wallet
      const wallet = await VirtualWalletService.getUserWallet(userId);
      if (!wallet) {
        throw new Error('Virtual wallet not found. Please contact support.');
      }

      // 3. Check available balance
      if (wallet.availableBalance < amount) {
        throw new Error(`Insufficient balance. Available: ₦${wallet.availableBalance.toLocaleString()}`);
      }

      // 3. Get bank account details
      const bankAccount = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS || 'bank_accounts',
        bankAccountId
      );

      if (!bankAccount || bankAccount.userId !== userId) {
        throw new Error('Invalid bank account');
      }

      // 4. Validate recipient code exists
      if (!bankAccount.recipientCode || bankAccount.recipientCode.trim() === '') {
        console.log('[Withdrawal] Recipient code missing, recreating...');

        try {
          const paystackRecipient = await this.paystackService.createTransferRecipient(
            bankAccount.accountNumber,
            bankAccount.bankCode,
            bankAccount.accountName
          );

          if (paystackRecipient.data?.recipient_code) {
            await databases.updateDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              COLLECTIONS.BANK_ACCOUNTS || 'bank_accounts',
              bankAccount.$id,
              {
                recipientCode: paystackRecipient.data.recipient_code,
                updatedAt: new Date().toISOString()
              }
            );
            bankAccount.recipientCode = paystackRecipient.data.recipient_code;
          } else {
            throw new Error('Failed to create Paystack recipient');
          }
        } catch (recipientError) {
          throw new Error('Bank account setup required. Please re-add your bank account in settings.');
        }
      }

      // 5. Generate reference
      const reference = EscrowUtils.generateTransactionReference('withdrawal', userId);

      // 6. Initiate Paystack transfer
      // Convert Naira to Kobo (Paystack Transfer API expects amount in kobo)
      const amountInKobo = amount * 100;

      console.log('[Withdrawal] Initiating Paystack transfer:', {
        amountInNaira: amount,
        amountInKobo: amountInKobo,
        recipientCode: bankAccount.recipientCode,
        reference
      });

      let transferResult;
      try {
        transferResult = await this.paystackService.initiateTransfer(
          amountInKobo,
          bankAccount.recipientCode,
          reference,
          `Withdrawal to ${bankAccount.bankName} - ${bankAccount.accountNumber}`
        );

        console.log('[Withdrawal] Paystack transfer initiated:', {
          transferCode: transferResult.data?.transfer_code,
          status: transferResult.data?.status,
          message: transferResult.message
        });
      } catch (transferError) {
        console.error('[Withdrawal] Paystack transfer failed:', transferError);
        throw new Error('Failed to initiate transfer to your bank account. Please try again or contact support.');
      }

      // 7. Create withdrawal record
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
          status: 'processing', // Transfer initiated in Paystack
          reason: reason || 'Withdrawal request',
          reference,
          transferCode: transferResult.data?.transfer_code || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // 8. Deduct from virtual wallet immediately
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        wallet.$id!,
        {
          availableBalance: wallet.availableBalance - amount,
          totalWithdrawn: (wallet.totalWithdrawn || 0) + amount,
          updatedAt: new Date().toISOString()
        }
      );

      // 9. Create wallet transaction record
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WALLET_TRANSACTIONS,
        ID.unique(),
        {
          userId,
          walletId: wallet.$id!,
          type: 'withdrawal',
          amount: -amount,
          reference,
          description: `Withdrawal to ${bankAccount.bankName} - ${bankAccount.accountNumber}`,
          status: 'processing',
          metadata: JSON.stringify({
            withdrawalId: withdrawalRequest.$id,
            bankAccountId,
            bankName: bankAccount.bankName,
            accountNumber: bankAccount.accountNumber,
            transferCode: transferResult.data?.transfer_code
          }),
          createdAt: new Date().toISOString()
        }
      );

      // 10. Send notification
      await notificationService.createNotification({
        userId,
        title: 'Withdrawal Processing 🚀',
        message: `Your withdrawal of ₦${amount.toLocaleString()} is being processed and will arrive in your ${bankAccount.bankName} account shortly.`,
        type: 'success',
        actionUrl: '/worker/wallet',
        idempotencyKey: `withdrawal_submitted_${withdrawalRequest.$id}`
      });

      console.log(`✅ Withdrawal initiated: ₦${amount} via Paystack for user ${userId}`);

      return {
        success: true,
        withdrawalId: withdrawalRequest.$id,
        message: 'Withdrawal initiated successfully. Money will arrive in your bank account shortly.'
      };

    } catch (error) {
      console.error('Withdrawal failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process withdrawal'
      };
    }
  }

  /**
   * Get user's withdrawal history
   */
  static async getWithdrawalHistory(userId: string, limit: number = 50): Promise<any[]> {
    try {
      const withdrawals = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS || 'withdrawals',
        [Query.equal('userId', userId), Query.orderDesc('createdAt'), Query.limit(limit)]
      );

      return withdrawals.documents;
    } catch (error) {
      console.error('Failed to get withdrawal history:', error);
      return [];
    }
  }

  /**
   * Get all withdrawals for admin
   */
  static async getAllWithdrawals(limit: number = 100): Promise<any[]> {
    try {
      const withdrawals = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS || 'withdrawals',
        [Query.orderDesc('createdAt'), Query.limit(limit)]
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
      console.error('Failed to get withdrawals:', error);
      throw error;
    }
  }
}
