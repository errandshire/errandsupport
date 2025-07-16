import { paystack } from './paystack';
import { databases, COLLECTIONS } from './appwrite';
import { ID } from 'appwrite';

export interface EscrowPayment {
  id: string;
  bookingId: string;
  clientId: string;
  workerId: string;
  amount: number;
  platformFee: number;
  workerEarnings: number;
  status: 'pending' | 'escrowed' | 'released' | 'refunded' | 'disputed';
  paymentReference: string;
  paystackTransactionId: string;
  transferReference?: string;
  createdAt: string;
  updatedAt: string;
  releasedAt?: string;
  refundedAt?: string;
}

export interface EscrowReleaseRequest {
  bookingId: string;
  clientId: string;
  workerId: string;
  amount: number;
  reason: string;
  workerBankDetails?: {
    accountNumber: string;
    bankCode: string;
    accountName: string;
  };
}

export interface EscrowRefundRequest {
  bookingId: string;
  clientId: string;
  reason: string;
  refundAmount?: number; // Optional partial refund
}

export class EscrowService {
  private static instance: EscrowService;

  private constructor() {}

  public static getInstance(): EscrowService {
    if (!EscrowService.instance) {
      EscrowService.instance = new EscrowService();
    }
    return EscrowService.instance;
  }

  // Create escrow payment record after successful payment
  async createEscrowPayment(
    bookingId: string,
    clientId: string,
    workerId: string,
    amount: number,
    paymentReference: string,
    paystackTransactionId: string
  ): Promise<EscrowPayment> {
    try {
      const platformFee = paystack.calculatePlatformFee(amount);
      const workerEarnings = paystack.calculateWorkerEarnings(amount);

      const escrowPayment: Omit<EscrowPayment, 'id'> = {
        bookingId,
        clientId,
        workerId,
        amount,
        platformFee,
        workerEarnings,
        status: 'escrowed',
        paymentReference,
        paystackTransactionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const response = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PAYMENTS,
        ID.unique(),
        escrowPayment
      );

      return response as unknown as EscrowPayment;
    } catch (error) {
      console.error('Error creating escrow payment:', error);
      throw new Error('Failed to create escrow payment record');
    }
  }

  // Release payment to worker
  async releasePayment(request: EscrowReleaseRequest): Promise<void> {
    try {
      // Get escrow payment record
      const escrowPayment = await this.getEscrowPayment(request.bookingId);
      
      if (!escrowPayment) {
        throw new Error('Escrow payment not found');
      }

      if (escrowPayment.status !== 'escrowed') {
        throw new Error(`Cannot release payment with status: ${escrowPayment.status}`);
      }

      // Create transfer recipient if bank details provided
      let recipientCode = '';
      if (request.workerBankDetails) {
        const recipient = await paystack.createTransferRecipient(
          request.workerBankDetails.accountNumber,
          request.workerBankDetails.bankCode,
          request.workerBankDetails.accountName
        );
        recipientCode = recipient.data.recipient_code;
      }

      // Generate transfer reference
      const transferReference = paystack.generateReference('transfer');

      // Initiate transfer to worker
      const transferResponse = await paystack.initiateTransfer(
        escrowPayment.workerEarnings,
        recipientCode,
        transferReference,
        request.reason
      );

      // Update escrow payment status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PAYMENTS,
        escrowPayment.id,
        {
          status: 'released',
          transferReference,
          releasedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // Update booking status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        request.bookingId,
        {
          status: 'completed',
          paymentStatus: 'released',
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      console.log(`Payment released for booking ${request.bookingId}`);
    } catch (error) {
      console.error('Error releasing payment:', error);
      throw new Error('Failed to release payment to worker');
    }
  }

  // Process refund to client
  async processRefund(request: EscrowRefundRequest): Promise<void> {
    try {
      // Get escrow payment record
      const escrowPayment = await this.getEscrowPayment(request.bookingId);
      
      if (!escrowPayment) {
        throw new Error('Escrow payment not found');
      }

      if (escrowPayment.status !== 'escrowed') {
        throw new Error(`Cannot refund payment with status: ${escrowPayment.status}`);
      }

      const refundAmount = request.refundAmount || escrowPayment.amount;
      
      // Generate refund reference
      const refundReference = paystack.generateReference('refund');

      // Process refund through Paystack
      // Note: Paystack doesn't have a direct refund API, so this would typically
      // involve manual processing or using their refund dashboard
      
      // Update escrow payment status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PAYMENTS,
        escrowPayment.id,
        {
          status: 'refunded',
          refundReference,
          refundedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // Update booking status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        request.bookingId,
        {
          status: 'cancelled',
          paymentStatus: 'refunded',
          cancelledAt: new Date().toISOString(),
          cancellationReason: request.reason,
          updatedAt: new Date().toISOString()
        }
      );

      console.log(`Refund processed for booking ${request.bookingId}`);
    } catch (error) {
      console.error('Error processing refund:', error);
      throw new Error('Failed to process refund');
    }
  }

  // Get escrow payment by booking ID
  async getEscrowPayment(bookingId: string): Promise<EscrowPayment | null> {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PAYMENTS,
        [
          { attribute: 'bookingId', value: bookingId }
        ]
      );

      if (response.documents.length === 0) {
        return null;
      }

      return response.documents[0] as unknown as EscrowPayment;
    } catch (error) {
      console.error('Error fetching escrow payment:', error);
      return null;
    }
  }

  // Get all escrow payments for a user (client or worker)
  async getUserEscrowPayments(userId: string, role: 'client' | 'worker'): Promise<EscrowPayment[]> {
    try {
      const attribute = role === 'client' ? 'clientId' : 'workerId';
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PAYMENTS,
        [
          { attribute, value: userId }
        ]
      );

      return response.documents as unknown as EscrowPayment[];
    } catch (error) {
      console.error('Error fetching user escrow payments:', error);
      return [];
    }
  }

  // Get escrow statistics
  async getEscrowStatistics(): Promise<{
    totalEscrowed: number;
    totalReleased: number;
    totalRefunded: number;
    pendingPayments: number;
    platformRevenue: number;
  }> {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PAYMENTS,
        []
      );

      const payments = response.documents as unknown as EscrowPayment[];
      
      const stats = payments.reduce((acc, payment) => {
        switch (payment.status) {
          case 'escrowed':
            acc.totalEscrowed += payment.amount;
            acc.pendingPayments += 1;
            break;
          case 'released':
            acc.totalReleased += payment.amount;
            acc.platformRevenue += payment.platformFee;
            break;
          case 'refunded':
            acc.totalRefunded += payment.amount;
            break;
        }
        return acc;
      }, {
        totalEscrowed: 0,
        totalReleased: 0,
        totalRefunded: 0,
        pendingPayments: 0,
        platformRevenue: 0
      });

      return stats;
    } catch (error) {
      console.error('Error fetching escrow statistics:', error);
      throw new Error('Failed to fetch escrow statistics');
    }
  }

  // Handle dispute
  async handleDispute(bookingId: string, reason: string, disputedBy: 'client' | 'worker'): Promise<void> {
    try {
      // Get escrow payment record
      const escrowPayment = await this.getEscrowPayment(bookingId);
      
      if (!escrowPayment) {
        throw new Error('Escrow payment not found');
      }

      // Update escrow payment status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.PAYMENTS,
        escrowPayment.id,
        {
          status: 'disputed',
          disputeReason: reason,
          disputedBy,
          disputedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // Update booking status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'disputed',
          paymentStatus: 'disputed',
          disputeReason: reason,
          disputedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      console.log(`Dispute created for booking ${bookingId} by ${disputedBy}`);
    } catch (error) {
      console.error('Error handling dispute:', error);
      throw new Error('Failed to handle dispute');
    }
  }

  // Calculate escrow fees
  calculateEscrowFees(amount: number): {
    platformFee: number;
    workerEarnings: number;
    processingFee: number;
  } {
    const platformFee = paystack.calculatePlatformFee(amount);
    const workerEarnings = paystack.calculateWorkerEarnings(amount);
    const processingFee = Math.round((amount * 1.5) / 100); // 1.5% processing fee

    return {
      platformFee,
      workerEarnings,
      processingFee
    };
  }
}

// Export singleton instance
export const escrowService = EscrowService.getInstance(); 