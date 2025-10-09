import { paystack } from './paystack';

// Escrow calculation utilities
export class EscrowUtils {
  // Platform commission rate (5%)
  static readonly PLATFORM_COMMISSION_RATE = 0.05;
  
  // Convert NGN to kobo
  static toKobo(amountInNGN: number): number {
    return Math.round(amountInNGN * 100);
  }
  
  // Convert kobo to NGN
  static toNGN(amountInKobo: number): number {
    return amountInKobo / 100;
  }
  
  // Calculate platform fee from total amount
  static calculatePlatformFee(totalAmount: number): number {
    return Math.round(totalAmount * this.PLATFORM_COMMISSION_RATE);
  }
  
  // Calculate worker earnings after platform fee
  static calculateWorkerAmount(totalAmount: number): number {
    const platformFee = this.calculatePlatformFee(totalAmount);
    return totalAmount - platformFee;
  }
  
  // Generate escrow reference
  static generateEscrowReference(bookingId: string): string {
    const timestamp = Date.now();
    return `escrow_${bookingId}_${timestamp}`;
  }
  
  // Generate transaction reference
  static generateTransactionReference(type: string, userId: string): string {
    const timestamp = Date.now();
    return `${type}_${userId}_${timestamp}`;
  }
  
  // Validate escrow amount
  static validateAmount(amount: number): { isValid: boolean; error?: string } {
    if (amount <= 0) {
      return { isValid: false, error: 'Amount must be greater than 0' };
    }
    
    if (amount < 50) { // Minimum 500 NGN
      return { isValid: false, error: 'Amount must be at least ₦500' };
    }
    
    if (amount > 100000000) { // Maximum 1M NGN
      return { isValid: false, error: 'Amount cannot exceed ₦1,000,000' };
    }
    
    return { isValid: true };
  }
  
  // Format amount for display
  static formatAmount(amountInKobo: number, currency: string = 'NGN'): string {
    const amountInNGN = this.toNGN(amountInKobo);
    // Only show decimals if there are cents
    const hasDecimals = amountInNGN % 1 !== 0;
    return `₦${amountInNGN.toLocaleString('en-NG', { 
      minimumFractionDigits: hasDecimals ? 2 : 0, 
      maximumFractionDigits: 2 
    })}`;
  }
  
  // Validate escrow status transition
  static validateStatusTransition(
    currentStatus: string, 
    newStatus: string
  ): { isValid: boolean; error?: string } {
    const validTransitions: Record<string, string[]> = {
      'pending': ['held', 'refunded'],
      'held': ['released', 'refunded'],
      'released': [], // Terminal state
      'refunded': []  // Terminal state
    };
    
    const allowedTransitions = validTransitions[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      return { 
        isValid: false, 
        error: `Cannot transition from ${currentStatus} to ${newStatus}` 
      };
    }
    
    return { isValid: true };
  }
  
  // Calculate breakdown for display
  static calculateBreakdown(totalAmount: number): {
    total: number;
    platformFee: number;
    workerAmount: number;
    breakdown: {
      totalNGN: string;
      platformFeeNGN: string;
      workerAmountNGN: string;
    };
  } {
    const platformFee = this.calculatePlatformFee(totalAmount);
    const workerAmount = this.calculateWorkerAmount(totalAmount);
    
    return {
      total: totalAmount,
      platformFee,
      workerAmount,
      breakdown: {
        totalNGN: this.formatAmount(totalAmount),
        platformFeeNGN: this.formatAmount(platformFee),
        workerAmountNGN: this.formatAmount(workerAmount)
      }
    };
  }
}

// Transaction description generators
export class TransactionDescriptions {
  static escrowHold(serviceName: string, workerName: string): string {
    return `Payment held in escrow for ${serviceName} service by ${workerName}`;
  }
  
  static escrowRelease(serviceName: string, workerName: string): string {
    return `Payment released from escrow for completed ${serviceName} service by ${workerName}`;
  }
  
  static refund(serviceName: string, reason?: string): string {
    const baseMessage = `Refund for ${serviceName} service`;
    return reason ? `${baseMessage} - ${reason}` : baseMessage;
  }
  
  static withdrawal(amount: number): string {
    return `Withdrawal of ${EscrowUtils.formatAmount(amount)} to bank account`;
  }
}

// Booking Status Constants
export const BOOKING_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed'
} as const;

// Escrow Status Constants
export const ESCROW_STATUS = {
  PENDING: 'pending',
  HELD: 'held',
  RELEASED: 'released',
  REFUNDED: 'refunded'
} as const;

export const TRANSACTION_TYPES = {
  ESCROW_HOLD: 'escrow_hold',
  ESCROW_RELEASE: 'escrow_release',
  WITHDRAWAL: 'withdrawal',
  REFUND: 'refund'
} as const;

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

export type EscrowStatus = typeof ESCROW_STATUS[keyof typeof ESCROW_STATUS];
export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];
export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS]; 