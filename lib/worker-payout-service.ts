import { databases, COLLECTIONS } from '@/lib/appwrite';
import { PaystackService } from '@/lib/paystack';
import { Query, ID } from 'appwrite';
import { EscrowService } from '@/lib/escrow-service';
import { EscrowUtils } from '@/lib/escrow-utils';

export interface BankAccount {
  $id: string; // Appwrite document ID
  userId: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  recipientCode?: string; // Paystack recipient code
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalRequest {
  $id: string; // Appwrite document ID
  userId: string;
  bankAccountId: string;
  amount: number;
  reference: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transferCode?: string; // Paystack transfer code
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalResult {
  success: boolean;
  withdrawalId: string;
  reference: string;
  transferCode?: string;
  message: string;
}

export class WorkerPayoutService {
  private static paystackService = PaystackService.getInstance();
  private static readonly MIN_WITHDRAWAL_AMOUNT = 10; // ₦1,000 minimum

  /**
   * Get user's bank accounts
   */
  static async getUserBankAccounts(userId: string): Promise<BankAccount[]> {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS || 'bank_accounts',
        [Query.equal('userId', userId), Query.orderDesc('$createdAt')]
      );

      return response.documents as unknown as BankAccount[];
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      return [];
    }
  }

  /**
   * Add a new bank account
   */
  static async addBankAccount(
    userId: string,
    accountNumber: string,
    bankCode: string,
    bankName: string,
    accountName: string
  ): Promise<BankAccount> {
    try {
      // Create Paystack transfer recipient
      console.log('[BankAccount] Creating Paystack recipient:', {
        accountNumber,
        bankCode,
        accountName
      });
      
      const paystackRecipient = await this.paystackService.createTransferRecipient(
        accountNumber,
        bankCode,
        accountName
      );
      
      console.log('[BankAccount] Paystack recipient created:', {
        recipientCode: paystackRecipient.data?.recipient_code,
        status: paystackRecipient.status
      });
      
      if (!paystackRecipient.data?.recipient_code) {
        throw new Error('Failed to create Paystack transfer recipient. Please verify your bank details.');
      }

      // Check if bank account already exists for this user
      const existingAccounts = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS || 'bank_accounts',
        [Query.equal('userId', userId), Query.limit(1)]
      );

      let bankAccount;
      if (existingAccounts.documents.length > 0) {
        // Update existing bank account
        bankAccount = await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.BANK_ACCOUNTS || 'bank_accounts',
          existingAccounts.documents[0].$id,
          {
            accountNumber,
            bankCode,
            bankName,
            accountName,
            recipientCode: paystackRecipient.data.recipient_code,
            isDefault: false,
            updatedAt: new Date().toISOString()
          }
        );
      } else {
        // Create new bank account
        bankAccount = await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.BANK_ACCOUNTS || 'bank_accounts',
          'unique()',
          {
            userId,
            accountNumber,
            bankCode,
            bankName,
            accountName,
            recipientCode: paystackRecipient.data.recipient_code,
            isDefault: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        );
      }

      return bankAccount as unknown as BankAccount;
    } catch (error) {
      console.error('Error adding bank account:', error);
      throw new Error('Failed to add bank account. Please verify your account details.');
    }
  }

  /**
   * Set default bank account
   */
  static async setDefaultBankAccount(userId: string, bankAccountId: string): Promise<void> {
    try {
      // Get all user's bank accounts
      const bankAccounts = await this.getUserBankAccounts(userId);

      // Update all accounts to not default
      for (const account of bankAccounts) {
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.BANK_ACCOUNTS || 'bank_accounts',
          account.$id,
          {
            isDefault: account.$id === bankAccountId,
            updatedAt: new Date().toISOString()
          }
        );
      }
    } catch (error) {
      console.error('Error setting default bank account:', error);
      throw new Error('Failed to set default bank account');
    }
  }

  /**
   * Delete bank account
   */
  static async deleteBankAccount(bankAccountId: string): Promise<void> {
    try {
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS || 'bank_accounts',
        bankAccountId
      );
    } catch (error) {
      console.error('Error deleting bank account:', error);
      throw new Error('Failed to delete bank account');
    }
  }

  /**
   * Request withdrawal
   */
  static async requestWithdrawal(
    userId: string,
    bankAccountId: string,
    amount: number
  ): Promise<WithdrawalResult> {
    try {
      // Validate minimum withdrawal amount
      if (amount < this.MIN_WITHDRAWAL_AMOUNT) {
        throw new Error(`Minimum withdrawal amount is ₦${this.MIN_WITHDRAWAL_AMOUNT.toLocaleString()}`);
      }

      // Get worker's available balance
      const userBalance = await EscrowService.getUserBalance(userId);
      if (!userBalance) {
        throw new Error('Unable to retrieve your balance. Please try again.');
      }

      // Check if worker has sufficient available balance
      console.log('[Withdrawal] Balance check:', {
        requestedAmount: amount,
        availableBalance: userBalance.availableBalance,
        hasSufficientBalance: userBalance.availableBalance >= amount
      });
      
      if (userBalance.availableBalance < amount) {
        throw new Error(`Insufficient balance. Available: ₦${EscrowUtils.formatAmount(userBalance.availableBalance)}`);
      }

      // Get bank account
      const bankAccount = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS || 'bank_accounts',
        bankAccountId
      ) as unknown as BankAccount;

      if (!bankAccount || bankAccount.userId !== userId) {
        throw new Error('Invalid bank account');
      }
      
      console.log('[Withdrawal] Bank account details:', {
        accountNumber: bankAccount.accountNumber,
        bankName: bankAccount.bankName,
        bankCode: bankAccount.bankCode,
        recipientCode: bankAccount.recipientCode,
        hasRecipientCode: !!bankAccount.recipientCode
      });

      // Generate reference
      const reference = this.paystackService.generateReference('withdrawal');

      // Create withdrawal request
      const withdrawalRequest = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS || 'withdrawals',
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

      // Update worker's balance - move from available to pending
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USER_BALANCES,
        userBalance.$id,
        {
          availableBalance: userBalance.availableBalance - amount,
          pendingBalance: userBalance.pendingBalance + amount,
          updatedAt: new Date().toISOString()
        }
      );

      // Create transaction log (flatten metadata for Appwrite compatibility)
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.TRANSACTIONS,
        ID.unique(),
        {
          userId,
          type: 'withdrawal_request',
          amount: -amount,
          description: `Withdrawal request to ${bankAccount.bankName} - ${bankAccount.accountNumber}`,
          reference,
          status: 'pending',
          // Flatten metadata into individual string attributes
          withdrawalId: withdrawalRequest.$id,
          bankAccountId,
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // Validate recipient code exists, recreate if missing
      if (!bankAccount.recipientCode || bankAccount.recipientCode.trim() === '') {
        console.log('[Withdrawal] Recipient code missing or empty, recreating...', {
          currentRecipientCode: bankAccount.recipientCode,
          bankAccount: {
            id: bankAccount.$id,
            accountNumber: bankAccount.accountNumber,
            bankCode: bankAccount.bankCode,
            accountName: bankAccount.accountName
          }
        });
        
        try {
          const paystackRecipient = await this.paystackService.createTransferRecipient(
            bankAccount.accountNumber,
            bankAccount.bankCode,
            bankAccount.accountName
          );
          
          console.log('[Withdrawal] Paystack recipient creation response:', paystackRecipient);
          
          if (paystackRecipient.data?.recipient_code) {
            // Update bank account with new recipient code
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
            console.log('[Withdrawal] Recipient code recreated successfully:', bankAccount.recipientCode);
          } else {
            console.error('[Withdrawal] Paystack response missing recipient_code:', paystackRecipient);
            throw new Error('Failed to recreate recipient code - invalid response from Paystack');
          }
        } catch (recipientError) {
          console.error('[Withdrawal] Failed to recreate recipient code:', recipientError);
          throw new Error(`Bank account recipient code is missing and could not be recreated. Please re-add your bank account in settings. Error: ${recipientError instanceof Error ? recipientError.message : 'Unknown error'}`);
        }
      }

      // Final validation before transfer
      if (!bankAccount.recipientCode || bankAccount.recipientCode.trim() === '') {
        console.error('[Withdrawal] Final validation failed - recipient code is empty:', {
          recipientCode: bankAccount.recipientCode,
          bankAccount: {
            id: bankAccount.$id,
            accountNumber: bankAccount.accountNumber,
            bankName: bankAccount.bankName,
            bankCode: bankAccount.bankCode
          }
        });
        throw new Error('Unable to process withdrawal: Bank account recipient code is missing. Please re-add your bank account in settings.');
      }

      // Check Paystack account balance before attempting transfer
      const paystackBalance = await this.paystackService.getBalance();
      
      // Paystack returns an array of balances, get the first one (main balance)
      const mainBalance = paystackBalance.data?.[0]?.balance || 0;
      
      console.log('[Withdrawal] Paystack balance check:', {
        requestedAmount: amount,
        paystackBalance: mainBalance,
        hasSufficientPaystackBalance: mainBalance >= amount,
        allBalances: paystackBalance.data
      });
      
      if (mainBalance < amount) {
        throw new Error(`Insufficient Paystack account balance. Available: ₦${mainBalance}. Please fund your Paystack account to process withdrawals.`);
      }

      // Initiate Paystack transfer
      let transferResult;
      try {
        console.log('[Withdrawal] Initiating transfer:', {
          amount: amount,
          recipientCode: bankAccount.recipientCode,
          reference,
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber
        });
        
        transferResult = await this.paystackService.initiateTransfer(
          amount,
          bankAccount.recipientCode,
          reference,
          `Withdrawal to ${bankAccount.bankName} - ${bankAccount.accountNumber}`
        );
      } catch (transferError) {
        // Handle Paystack starter business limitation
        if (transferError instanceof Error && transferError.message.includes('starter business')) {
          // Update withdrawal request to failed status
          await databases.updateDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.WITHDRAWALS || 'withdrawals',
            withdrawalRequest.$id,
            {
              status: 'failed',
              failureReason: 'Paystack starter business accounts cannot initiate third-party payouts. Please upgrade your Paystack account or contact support.',
              updatedAt: new Date().toISOString()
            }
          );
          
          throw new Error('Withdrawal failed: Your Paystack account is on a starter plan which does not support third-party payouts. Please upgrade your Paystack account or contact support for assistance.');
        }
        throw transferError;
      }

      // Log transfer code for debugging (not stored in database)
      console.log('[Withdrawal] Transfer initiated successfully:', {
        transferCode: transferResult.data.transfer_code,
        status: transferResult.data.status,
        message: transferResult.message
      });

      // Update withdrawal request status to processing
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS || 'withdrawals',
        withdrawalRequest.$id,
        {
          status: 'processing',
          updatedAt: new Date().toISOString()
        }
      );

      // Update transaction status
      const transactions = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.TRANSACTIONS,
        [Query.equal('reference', reference), Query.limit(1)]
      );
      
      if (transactions.documents.length > 0) {
        const transaction = transactions.documents[0];
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.TRANSACTIONS,
          transaction.$id,
          {
            status: 'processing',
            updatedAt: new Date().toISOString()
          }
        );
      }

      return {
        success: true,
        withdrawalId: withdrawalRequest.$id,
        reference,
        transferCode: transferResult.data.transfer_code,
        message: 'Withdrawal request submitted successfully and is being processed'
      };

    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      
      return {
        success: false,
        withdrawalId: '',
        reference: '',
        message: error instanceof Error ? error.message : 'Failed to process withdrawal request'
      };
    }
  }

  /**
   * Get user's withdrawal history
   */
  static async getWithdrawalHistory(userId: string, limit: number = 50): Promise<WithdrawalRequest[]> {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS || 'withdrawals',
        [Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(limit)]
      );

      return response.documents as unknown as WithdrawalRequest[];
    } catch (error) {
      console.error('Error fetching withdrawal history:', error);
      return [];
    }
  }

  /**
   * Handle withdrawal completion (called by webhook or admin)
   */
  static async handleWithdrawalCompletion(
    withdrawalId: string,
    status: 'completed' | 'failed',
    failureReason?: string
  ): Promise<void> {
    try {
      // Get withdrawal request
      const withdrawal = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS || 'withdrawals',
        withdrawalId
      ) as unknown as WithdrawalRequest;

      if (!withdrawal) {
        throw new Error('Withdrawal request not found');
      }

      // Update withdrawal status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS || 'withdrawals',
        withdrawalId,
        {
          status,
          failureReason,
          updatedAt: new Date().toISOString()
        }
      );

      // Get user's current balance
      const userBalance = await EscrowService.getUserBalance(withdrawal.userId);
      if (!userBalance) {
        throw new Error('User balance not found');
      }

      if (status === 'completed') {
        // Move from pending to withdrawn (remove from pending balance)
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.USER_BALANCES,
          userBalance.$id,
          {
            pendingBalance: userBalance.pendingBalance - withdrawal.amount,
            totalWithdrawn: userBalance.totalWithdrawn + withdrawal.amount,
            updatedAt: new Date().toISOString()
          }
        );

        // Update transaction status
        const transactions = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.TRANSACTIONS,
          [Query.equal('reference', withdrawal.reference), Query.limit(1)]
        );
        
        if (transactions.documents.length > 0) {
          await databases.updateDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.TRANSACTIONS,
            transactions.documents[0].$id,
            {
              status: 'completed',
              updatedAt: new Date().toISOString()
            }
          );
        }
      } else if (status === 'failed') {
        // Move back from pending to available balance
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.USER_BALANCES,
          userBalance.$id,
          {
            availableBalance: userBalance.availableBalance + withdrawal.amount,
            pendingBalance: userBalance.pendingBalance - withdrawal.amount,
            updatedAt: new Date().toISOString()
          }
        );

        // Update transaction status
        const transactions = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.TRANSACTIONS,
          [Query.equal('reference', withdrawal.reference), Query.limit(1)]
        );
        
        if (transactions.documents.length > 0) {
          await databases.updateDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.TRANSACTIONS,
            transactions.documents[0].$id,
            {
              status: 'failed',
              failureReason,
              updatedAt: new Date().toISOString()
            }
          );
        }
      }

      // Send notification to worker
      try {
        const { notificationService } = await import('@/lib/notification-service');
        const title = status === 'completed' ? 'Withdrawal Completed! 💰' : 'Withdrawal Failed ❌';
        const message = status === 'completed' 
          ? `Your withdrawal of ₦${EscrowUtils.formatAmount(withdrawal.amount)} has been successfully processed and sent to your bank account.`
          : `Your withdrawal of ₦${EscrowUtils.formatAmount(withdrawal.amount)} failed. ${failureReason || 'Please try again or contact support.'}`;
        
        await notificationService.createNotification({
          userId: withdrawal.userId,
          title,
          message,
          type: status === 'completed' ? 'success' : 'error',
          actionUrl: '/worker/wallet',
          idempotencyKey: `withdrawal_${status}_${withdrawalId}`
        });
        console.log(`✅ Notification sent to worker about withdrawal ${status}`);
      } catch (notificationError) {
        console.error('Failed to send withdrawal notification:', notificationError);
        // Don't fail the withdrawal completion if notification fails
      }

      console.log(`✅ Withdrawal ${withdrawalId} ${status} for user ${withdrawal.userId}`);
    } catch (error) {
      console.error('Error handling withdrawal completion:', error);
      throw error;
    }
  }

  /**
   * Get banks list from Paystack
   */
  static async getBanks(): Promise<any[]> {
    try {
      const response = await this.paystackService.getBanks();
      return response.data || [];
    } catch (error) {
      console.error('Error fetching banks:', error);
      return [];
    }
  }

  /**
   * Validate bank account number
   */
  static async validateBankAccount(accountNumber: string, bankCode: string): Promise<{
    isValid: boolean;
    accountName?: string;
    message: string;
  }> {
    try {
      // This would typically call Paystack's account verification API
      // For now, we'll do basic validation
      if (accountNumber.length < 10 || accountNumber.length > 10) {
        return {
          isValid: false,
          message: 'Account number must be 10 digits'
        };
      }

      if (!/^\d+$/.test(accountNumber)) {
        return {
          isValid: false,
          message: 'Account number must contain only numbers'
        };
      }

      return {
        isValid: true,
        accountName: 'Account validation successful',
        message: 'Account number is valid'
      };
    } catch (error) {
      console.error('Error validating bank account:', error);
      return {
        isValid: false,
        message: 'Failed to validate account number'
      };
    }
  }
} 