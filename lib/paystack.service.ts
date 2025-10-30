import crypto from 'crypto';

/**
 * SIMPLE PAYSTACK SERVICE
 *
 * KEY PRINCIPLE: We work in NAIRA everywhere.
 * Paystack SDK handles kobo conversion automatically.
 *
 * Security: All webhooks verified with signature
 */

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY!;
const PAYSTACK_PUBLIC = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!;

export class PaystackService {

  /**
   * Initialize a payment (for wallet top-up)
   * @param amountInNaira - Amount in Naira (e.g., 1000 for ₦1000)
   * @param email - User email
   * @param reference - Unique reference for idempotency
   */
  static async initializePayment(params: {
    amountInNaira: number;
    email: string;
    reference: string;
    callbackUrl: string;
    metadata?: Record<string, any>;
  }) {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountInNaira * 100, // Paystack SDK expects kobo
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata || {}
      })
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to initialize payment');
    }

    return {
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      accessCode: data.data.access_code
    };
  }

  /**
   * Verify a payment (called by webhook)
   * @param reference - Payment reference
   * @returns Payment details with amount IN NAIRA
   */
  static async verifyPayment(reference: string) {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET}`
        }
      }
    );

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Payment verification failed');
    }

    return {
      reference: data.data.reference,
      amountInNaira: data.data.amount / 100, // Convert from kobo to Naira
      status: data.data.status,
      paidAt: data.data.paid_at,
      channel: data.data.channel,
      currency: data.data.currency,
      metadata: data.data.metadata
    };
  }

  /**
   * Verify webhook signature
   * CRITICAL for security - prevents fake webhooks
   */
  static verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET)
      .update(payload)
      .digest('hex');

    return hash === signature;
  }

  /**
   * Create a transfer recipient (for withdrawals)
   * @returns Recipient code to use for transfers
   */
  static async createRecipient(params: {
    accountNumber: string;
    bankCode: string;
    accountName: string;
  }) {
    const response = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'nuban',
        name: params.accountName,
        account_number: params.accountNumber,
        bank_code: params.bankCode,
        currency: 'NGN'
      })
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to create recipient');
    }

    return {
      recipientCode: data.data.recipient_code,
      details: data.data.details
    };
  }

  /**
   * Initiate a transfer (for withdrawals)
   * @param amountInNaira - Amount in Naira
   */
  static async initiateTransfer(params: {
    amountInNaira: number;
    recipientCode: string;
    reference: string;
    reason?: string;
  }) {
    const response = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: 'balance',
        amount: params.amountInNaira * 100, // Paystack expects kobo
        recipient: params.recipientCode,
        reference: params.reference,
        reason: params.reason || 'Withdrawal'
      })
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to initiate transfer');
    }

    return {
      transferCode: data.data.transfer_code,
      reference: data.data.reference,
      status: data.data.status
    };
  }

  /**
   * Get list of Nigerian banks
   */
  static async getBanks() {
    const response = await fetch(
      'https://api.paystack.co/bank?currency=NGN&country=nigeria',
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET}`
        }
      }
    );

    const data = await response.json();

    if (!data.status) {
      throw new Error('Failed to fetch banks');
    }

    return data.data.map((bank: any) => ({
      name: bank.name,
      code: bank.code,
      slug: bank.slug
    }));
  }

  /**
   * Verify bank account
   */
  static async verifyBankAccount(params: {
    accountNumber: string;
    bankCode: string;
  }) {
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${params.accountNumber}&bank_code=${params.bankCode}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET}`
        }
      }
    );

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Account verification failed');
    }

    return {
      accountNumber: data.data.account_number,
      accountName: data.data.account_name
    };
  }

  /**
   * Generate a unique reference
   */
  static generateReference(prefix: string = 'pay'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }
}
