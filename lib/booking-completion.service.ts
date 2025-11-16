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
   *
   * TRANSACTION ROLLBACK IMPLEMENTED:
   * - If payment release succeeds but booking update fails, payment is rolled back
   * - This prevents double payments if client retries
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

      // STEP 1: Release funds from escrow to worker (with commission deduction)
      const releaseResult = await WalletService.releaseFundsToWorker({
        clientId,
        workerId,
        bookingId,
        amountInNaira: amount
      });

      if (!releaseResult.success) {
        return releaseResult;
      }

      const workerAmount = releaseResult.workerAmount || amount;

      // STEP 2: Update booking status (CRITICAL - if this fails, rollback payment)
      try {
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
      } catch (bookingUpdateError) {
        // ROLLBACK: Booking update failed, reverse the payment
        console.error('❌ Booking update failed, rolling back payment...', bookingUpdateError);

        await WalletService.rollbackRelease({
          clientId,
          workerId,
          bookingId,
          amountInNaira: amount
        });

        return {
          success: false,
          message: 'Payment processing failed. Please try again.'
        };
      }

      // Notify worker (in-app + SMS)
      try {
        const { notificationService } = await import('./notification-service');

        // In-app notification - show NET amount received
        await notificationService.createNotification({
          userId: workerId,
          title: 'Payment Received! 💰',
          message: `You've received ₦${workerAmount.toLocaleString()} for completed job (₦${amount.toLocaleString()} - 15% platform fee). Check your wallet.`,
          type: 'success',
          bookingId,
          actionUrl: '/worker/wallet',
          idempotencyKey: `payment_received_${bookingId}_${workerId}`
        });

        // SMS notification - show NET amount (use API endpoint for server-side execution)
        try {
          const workerUser = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.USERS,
            workerId
          );
          if (workerUser.phone) {
            // Call server-side API to send SMS (keeps API key secure)
            try {
              const response = await fetch('/api/sms/send', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  to: workerUser.phone,
                  message: `ErandWork: Payment received! ₦${workerAmount.toLocaleString()} has been credited to your wallet for booking #${bookingId}.`
                })
              });

              const smsResult = await response.json();
              console.log('📱 SMS result:', smsResult);
            } catch (smsError) {
              console.error('📱 SMS error:', smsError);
            }
          }

          // Send email notification
          const { BookingNotificationService } = await import('./booking-notification-service');
          const booking = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.BOOKINGS,
            bookingId
          );
          await BookingNotificationService.notifyPaymentReleased(bookingId, workerId, clientId, booking, workerAmount);
        } catch (error) {
          console.error('Failed to send notifications:', error);
        }
      } catch (error) {
        console.error('Failed to send notification:', error);
      }


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

      if (booking.paymentStatus === 'refunded') {
        return {
          success: true,
          message: 'Booking already refunded'
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

      // IDEMPOTENCY: Try to create refund transaction first
      const transactionId = `refund_${bookingId}`;
      try {
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WALLET_TRANSACTIONS,
          transactionId,
          {
            userId: clientId,
            type: 'booking_refund',
            amount: booking.budgetAmount,
            bookingId,
            reference: transactionId,
            status: 'completed',
            description: `Refund for cancelled booking #${bookingId}`,
            createdAt: new Date().toISOString()
          }
        );
      } catch (error: any) {
        if (error.code === 409 || error.message?.includes('already exists')) {
          return {
            success: true,
            message: 'Booking already refunded'
          };
        }
        throw error;
      }

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

      // Update booking status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'cancelled',
          paymentStatus: 'refunded',
          cancelledAt: new Date().toISOString(),
          cancellationReason: reason || 'Cancelled',
          updatedAt: new Date().toISOString()
        }
      );


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
