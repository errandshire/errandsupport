import { databases, COLLECTIONS } from '@/lib/appwrite';
import { PaystackService } from '@/lib/paystack';
import { Query } from 'appwrite';

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
  private static readonly MIN_WITHDRAWAL_AMOUNT = 1000; // ₦1,000 minimum

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
      const paystackRecipient = await this.paystackService.createTransferRecipient(
        accountNumber,
        bankCode,
        accountName
      );

      // Save bank account to database
      const bankAccount = await databases.createDocument(
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

      // Get bank account
      const bankAccount = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS || 'bank_accounts',
        bankAccountId
      ) as unknown as BankAccount;

      if (!bankAccount || bankAccount.userId !== userId) {
        throw new Error('Invalid bank account');
      }

      // Generate reference
      const reference = this.paystackService.generateReference('withdrawal');

      // Create withdrawal request
      const withdrawalRequest = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS || 'withdrawals',
        'unique()',
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

      // Initiate Paystack transfer
      let transferResult;
      try {
        transferResult = await this.paystackService.initiateTransfer(
          amount,
          bankAccount.recipientCode!,
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

      // Update withdrawal request with transfer code
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WITHDRAWALS || 'withdrawals',
        withdrawalRequest.$id,
        {
          transferCode: transferResult.data.transfer_code,
          status: 'processing',
          updatedAt: new Date().toISOString()
        }
      );

      return {
        success: true,
        withdrawalId: withdrawalRequest.$id,
        reference,
        transferCode: transferResult.data.transfer_code,
        message: 'Withdrawal request submitted successfully'
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