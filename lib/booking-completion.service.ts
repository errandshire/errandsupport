import { databases, COLLECTIONS } from './appwrite';
import { WalletService } from './wallet.service';

/**
 * BOOKING COMPLETION SERVICE
 *
 * Handles job completion and fund release to workers
 */

export class BookingCompletionService {

  /**
   * Complete booking and release funds to worker
   */
  static async completeBooking(params: {
    bookingId: string;
    clientId: string;
    workerId: string;
    amount: number;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { bookingId, clientId, workerId, amount } = params;

      // Get booking to verify status
      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

      // Security checks
      if (booking.clientId !== clientId && booking.workerId !== workerId) {
        return {
          success: false,
          message: 'Unauthorized'
        };
      }

      if (booking.paymentStatus === 'released') {
        return {
          success: true,
          message: 'Payment already released'
        };
      }

      if (booking.paymentStatus !== 'held') {
        return {
          success: false,
          message: 'Payment not in escrow'
        };
      }

      // Release funds from escrow to worker
      const releaseResult = await WalletService.releaseFundsToWorker({
        clientId,
        workerId,
        bookingId,
        amountInNaira: amount
      });

      if (!releaseResult.success) {
        return releaseResult;
      }

      // Update booking status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'completed',
          paymentStatus: 'released',
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // Notify worker
      try {
        const { notificationService } = await import('./notification-service');
        await notificationService.createNotification({
          userId: workerId,
          title: 'Payment Received! 💰',
          message: `You've received ₦${amount.toLocaleString()} for completed job. Check your wallet.`,
          type: 'success',
          bookingId,
          actionUrl: '/worker/wallet',
          idempotencyKey: `payment_received_${bookingId}_${workerId}`
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }

      console.log(`✅ Booking ${bookingId} completed, ₦${amount} released to worker ${workerId}`);

      return {
        success: true,
        message: 'Job completed and payment released to worker'
      };

    } catch (error) {
      console.error('Error completing booking:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to complete booking'
      };
    }
  }

  /**
   * Cancel booking and refund to client
   */
  static async cancelBooking(params: {
    bookingId: string;
    clientId: string;
    reason?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { bookingId, clientId, reason } = params;

      // Get booking
      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

      // Security check
      if (booking.clientId !== clientId) {
        return {
          success: false,
          message: 'Unauthorized'
        };
      }

      if (booking.paymentStatus !== 'held') {
        return {
          success: false,
          message: 'Cannot refund this booking'
        };
      }

      // Get client wallet
      const wallet = await WalletService.getOrCreateWallet(clientId);

      // Move funds from escrow back to balance
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.VIRTUAL_WALLETS,
        wallet.$id,
        {
          balance: wallet.balance + booking.budgetAmount,
          escrow: wallet.escrow - booking.budgetAmount,
          updatedAt: new Date().toISOString()
        }
      );

      // Create refund transaction record
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WALLET_TRANSACTIONS,
        `refund_${bookingId}`,
        {
          userId: clientId,
          type: 'booking_refund',
          amount: booking.budgetAmount,
          bookingId,
          reference: `refund_${bookingId}`,
          status: 'completed',
          description: `Refund for cancelled booking #${bookingId}`,
          createdAt: new Date().toISOString()
        }
      );

      // Update booking
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'cancelled',
          paymentStatus: 'refunded',
          cancellationReason: reason || 'Cancelled by client',
          cancelledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      console.log(`✅ Booking ${bookingId} cancelled, ₦${booking.budgetAmount} refunded to ${clientId}`);

      return {
        success: true,
        message: 'Booking cancelled and refunded to your wallet'
      };

    } catch (error) {
      console.error('Error cancelling booking:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel booking'
      };
    }
  }
}
