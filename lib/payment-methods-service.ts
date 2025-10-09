import { databases, COLLECTIONS } from './appwrite';
import { Query, ID } from 'appwrite';

export interface PaymentMethod {
  $id: string;
  userId: string;
  type: 'bank_account' | 'mobile_money' | 'crypto';
  provider: string;
  accountName: string;
  accountNumber: string;
  bankCode?: string;
  bankName?: string;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentMethodRequest {
  type: 'bank_account' | 'mobile_money' | 'crypto';
  provider: string;
  accountName: string;
  accountNumber: string;
  bankCode?: string;
  bankName?: string;
  isPrimary?: boolean;
}

export interface UpdatePaymentMethodRequest {
  accountName?: string;
  accountNumber?: string;
  bankCode?: string;
  bankName?: string;
  isPrimary?: boolean;
}

export class PaymentMethodsService {
  /**
   * Get all payment methods for a user
   */
  static async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS, // Reusing existing collection
        [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt')
        ]
      );

      return response.documents as PaymentMethod[];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  }

  /**
   * Create a new payment method
   */
  static async createPaymentMethod(
    userId: string, 
    data: CreatePaymentMethodRequest
  ): Promise<PaymentMethod> {
    try {
      // If this is set as primary, unset other primary methods
      if (data.isPrimary) {
        await this.unsetPrimaryPaymentMethods(userId);
      }

      const paymentMethod = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS,
        ID.unique(),
        {
          userId,
          type: data.type,
          provider: data.provider,
          accountName: data.accountName,
          accountNumber: data.accountNumber,
          bankCode: data.bankCode || '',
          bankName: data.bankName || '',
          isPrimary: data.isPrimary || false,
          isVerified: false, // New payment methods need verification
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );

      return paymentMethod as PaymentMethod;
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw error;
    }
  }

  /**
   * Update a payment method
   */
  static async updatePaymentMethod(
    paymentMethodId: string,
    data: UpdatePaymentMethodRequest
  ): Promise<PaymentMethod> {
    try {
      // If setting as primary, unset other primary methods
      if (data.isPrimary) {
        const paymentMethod = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.BANK_ACCOUNTS,
          paymentMethodId
        );
        
        await this.unsetPrimaryPaymentMethods(paymentMethod.userId);
      }

      const updatedPaymentMethod = await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS,
        paymentMethodId,
        {
          ...data,
          updatedAt: new Date().toISOString(),
        }
      );

      return updatedPaymentMethod as PaymentMethod;
    } catch (error) {
      console.error('Error updating payment method:', error);
      throw error;
    }
  }

  /**
   * Delete a payment method
   */
  static async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS,
        paymentMethodId
      );
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  }

  /**
   * Set a payment method as primary
   */
  static async setPrimaryPaymentMethod(
    userId: string,
    paymentMethodId: string
  ): Promise<void> {
    try {
      // Unset all other primary methods
      await this.unsetPrimaryPaymentMethods(userId);

      // Set this one as primary
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS,
        paymentMethodId,
        {
          isPrimary: true,
          updatedAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error('Error setting primary payment method:', error);
      throw error;
    }
  }

  /**
   * Unset all primary payment methods for a user
   */
  private static async unsetPrimaryPaymentMethods(userId: string): Promise<void> {
    try {
      const primaryMethods = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS,
        [
          Query.equal('userId', userId),
          Query.equal('isPrimary', true)
        ]
      );

      // Update all primary methods to false
      await Promise.all(
        primaryMethods.documents.map(method =>
          databases.updateDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.BANK_ACCOUNTS,
            method.$id,
            {
              isPrimary: false,
              updatedAt: new Date().toISOString(),
            }
          )
        )
      );
    } catch (error) {
      console.error('Error unsetting primary payment methods:', error);
      throw error;
    }
  }

  /**
   * Verify a payment method (admin function)
   */
  static async verifyPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BANK_ACCOUNTS,
        paymentMethodId,
        {
          isVerified: true,
          updatedAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error('Error verifying payment method:', error);
      throw error;
    }
  }

  /**
   * Get Nigerian banks list (for bank account type)
   */
  static getNigerianBanks(): Array<{ code: string; name: string }> {
    return [
      { code: '044', name: 'Access Bank' },
      { code: '023', name: 'Citibank Nigeria' },
      { code: '050', name: 'Ecobank Nigeria' },
      { code: '011', name: 'First Bank of Nigeria' },
      { code: '214', name: 'First City Monument Bank' },
      { code: '070', name: 'Fidelity Bank' },
      { code: '058', name: 'GTBank' },
      { code: '030', name: 'Heritage Bank' },
      { code: '301', name: 'Jaiz Bank' },
      { code: '082', name: 'Keystone Bank' },
      { code: '221', name: 'Stanbic IBTC Bank' },
      { code: '068', name: 'Standard Chartered Bank' },
      { code: '232', name: 'Sterling Bank' },
      { code: '032', name: 'Union Bank of Nigeria' },
      { code: '033', name: 'United Bank For Africa' },
      { code: '215', name: 'Unity Bank' },
      { code: '035', name: 'Wema Bank' },
      { code: '057', name: 'Zenith Bank' },
    ];
  }

  /**
   * Get mobile money providers
   */
  static getMobileMoneyProviders(): Array<{ code: string; name: string }> {
    return [
      { code: 'MTN', name: 'MTN Mobile Money' },
      { code: 'AIRTEL', name: 'Airtel Money' },
      { code: 'GLO', name: 'Globacom Money' },
      { code: '9MOBILE', name: '9Mobile Money' },
    ];
  }

  /**
   * Format account number for display
   */
  static formatAccountNumber(accountNumber: string, type: string): string {
    if (type === 'bank_account') {
      // Show last 4 digits for bank accounts
      return `**** **** **** ${accountNumber.slice(-4)}`;
    } else if (type === 'mobile_money') {
      // Show last 4 digits for mobile money
      return `****${accountNumber.slice(-4)}`;
    }
    return accountNumber;
  }

  /**
   * Validate payment method data
   */
  static validatePaymentMethod(data: CreatePaymentMethodRequest): { isValid: boolean; error?: string } {
    if (!data.accountName.trim()) {
      return { isValid: false, error: 'Account name is required' };
    }

    if (!data.accountNumber.trim()) {
      return { isValid: false, error: 'Account number is required' };
    }

    if (data.type === 'bank_account') {
      if (!data.bankCode) {
        return { isValid: false, error: 'Bank code is required for bank accounts' };
      }
      if (!data.bankName) {
        return { isValid: false, error: 'Bank name is required for bank accounts' };
      }
    }

    // Validate account number format based on type
    if (data.type === 'bank_account') {
      // Nigerian bank account numbers are typically 10 digits
      if (!/^\d{10}$/.test(data.accountNumber)) {
        return { isValid: false, error: 'Bank account number must be 10 digits' };
      }
    } else if (data.type === 'mobile_money') {
      // Nigerian phone numbers are typically 11 digits starting with 0
      if (!/^0\d{10}$/.test(data.accountNumber)) {
        return { isValid: false, error: 'Mobile money number must be 11 digits starting with 0' };
      }
    }

    return { isValid: true };
  }
}
