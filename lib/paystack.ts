import crypto from 'crypto';

// Paystack configuration
const PAYSTACK_SECRET_KEY = process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY!;
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Payment interfaces
export interface PaystackPaymentData {
  email: string;
  amount: number; // in kobo (multiply by 100)
  currency: string;
  reference: string;
  callback_url?: string;
  metadata?: {
    bookingId: string;
    clientId: string;
    workerId: string;
    type: 'booking_payment' | 'escrow_release';
    [key: string]: any;
  };
}

export interface PaystackTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerificationResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    message: string;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: any;
    log: any;
    fees: number;
    fees_split: any;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
      phone: string;
      metadata: any;
      risk_action: string;
    };
    plan: any;
    split: any;
    order_id: any;
    paidAt: string;
    createdAt: string;
    requested_amount: number;
    pos_transaction_data: any;
    source: any;
    fees_breakdown: any;
  };
}

export class PaystackService {
  private static instance: PaystackService;
  private readonly secretKey: string;
  private readonly publicKey: string;
  private readonly baseURL: string;

  private constructor() {
    this.secretKey = PAYSTACK_SECRET_KEY;
    this.publicKey = PAYSTACK_PUBLIC_KEY;
    this.baseURL = PAYSTACK_BASE_URL;
  }

  public static getInstance(): PaystackService {
    if (!PaystackService.instance) {
      PaystackService.instance = new PaystackService();
    }
    return PaystackService.instance;
  }

  // Initialize payment transaction
  async initializePayment(paymentData: PaystackPaymentData): Promise<PaystackTransactionResponse> {
    try {
      const response = await fetch(`${this.baseURL}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Payment initialization failed');
      }

      return result;
    } catch (error) {
      console.error('Paystack initialization error:', error);
      throw error;
    }
  }

  // Verify payment transaction
  async verifyPayment(reference: string): Promise<PaystackVerificationResponse> {
    try {
      const response = await fetch(`${this.baseURL}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Payment verification failed');
      }

      return result;
    } catch (error) {
      console.error('Paystack verification error:', error);
      throw error;
    }
  }

  // Create a transfer recipient for worker payouts
  async createTransferRecipient(accountNumber: string, bankCode: string, name: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/transferrecipient`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Transfer recipient creation failed');
      }

      return result;
    } catch (error) {
      console.error('Transfer recipient creation error:', error);
      throw error;
    }
  }

  // Initiate transfer to worker (escrow release)
  async initiateTransfer(amount: number, recipientCode: string, reference: string, reason: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/transfer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: amount * 100, // Convert to kobo
          recipient: recipientCode,
          reference,
          reason,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Transfer initiation failed');
      }

      return result;
    } catch (error) {
      console.error('Transfer initiation error:', error);
      throw error;
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const hash = crypto
        .createHmac('sha512', this.secretKey)
        .update(payload)
        .digest('hex');
      
      return hash === signature;
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  // Get all banks for transfer recipient creation
  async getBanks(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/bank`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch banks');
      }

      return result;
    } catch (error) {
      console.error('Fetch banks error:', error);
      throw error;
    }
  }

  // Generate payment reference
  generateReference(prefix: string = 'errand'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  // Calculate platform fee (5% default)
  calculatePlatformFee(amount: number, feePercentage: number = 5): number {
    return Math.round((amount * feePercentage) / 100);
  }

  // Calculate worker earnings after platform fee
  calculateWorkerEarnings(amount: number, feePercentage: number = 5): number {
    const platformFee = this.calculatePlatformFee(amount, feePercentage);
    return amount - platformFee;
  }

  // Get public key for frontend
  getPublicKey(): string {
    return this.publicKey;
  }
}

// Export singleton instance
export const paystack = PaystackService.getInstance(); 