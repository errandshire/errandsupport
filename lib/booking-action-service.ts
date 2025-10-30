import { databases, COLLECTIONS } from './appwrite';
import { BookingCompletionService } from './booking-completion.service';

/**
 * BOOKING ACTION SERVICE
 *
 * Handles worker booking actions (accept, reject, start, complete)
 * Used by worker booking detail modal
 */

interface BookingActionParams {
  bookingId: string;
  userId: string;
  userRole: string;
  action: string;
  reason?: string;
}

export class BookingActionService {

  /**
   * Accept a booking
   */
  static async acceptBooking(params: BookingActionParams) {
    try {
      const { bookingId } = params;

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'accepted',
          acceptedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      return {
        success: true,
        message: 'Booking accepted successfully!'
      };
    } catch (error) {
      console.error('Error accepting booking:', error);
      return {
        success: false,
        message: 'Failed to accept booking'
      };
    }
  }

  /**
   * Reject a booking (refunds client)
   */
  static async rejectBooking(params: BookingActionParams) {
    try {
      const { bookingId, reason } = params;

      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

      // Refund client wallet
      await BookingCompletionService.cancelBooking({
        bookingId,
        clientId: booking.clientId,
        reason: reason || 'Rejected by worker'
      });

      return {
        success: true,
        message: 'Booking rejected and client refunded'
      };
    } catch (error) {
      console.error('Error rejecting booking:', error);
      return {
        success: false,
        message: 'Failed to reject booking'
      };
    }
  }

  /**
   * Start work on a booking
   */
  static async startWork(params: BookingActionParams) {
    try {
      const { bookingId } = params;

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      return {
        success: true,
        message: 'Work started!'
      };
    } catch (error) {
      console.error('Error starting work:', error);
      return {
        success: false,
        message: 'Failed to start work'
      };
    }
  }

  /**
   * Mark booking as completed by worker (awaiting client confirmation)
   * NOTE: Payment is NOT released yet - only after client confirms
   */
  static async markCompleted(params: BookingActionParams) {
    try {
      const { bookingId } = params;

      // Just update status to worker_completed - DO NOT release payment yet
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'worker_completed',
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      return {
        success: true,
        message: 'Work marked as complete! Waiting for client confirmation.'
      };
    } catch (error) {
      console.error('Error marking booking complete:', error);
      return {
        success: false,
        message: 'Failed to mark booking complete'
      };
    }
  }

  /**
   * Client confirms completion (releases payment to worker)
   * This is the ONLY place where payment is released from escrow to worker
   */
  static async confirmCompletion(params: BookingActionParams) {
    try {
      const { bookingId, userId } = params;

      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

      // Verify this is a worker_completed booking
      if (booking.status !== 'worker_completed') {
        return {
          success: false,
          message: 'Booking is not ready for confirmation'
        };
      }

      // NOW release payment from escrow to worker
      const paymentResult = await BookingCompletionService.completeBooking({
        bookingId,
        clientId: booking.clientId,
        workerId: booking.workerId,
        amount: booking.budgetAmount
      });

      if (!paymentResult.success) {
        return paymentResult;
      }

      // Update booking to completed status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'completed',
          clientConfirmedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      return {
        success: true,
        message: 'Work confirmed! Payment released to worker.'
      };

    } catch (error) {
      console.error('Error confirming completion:', error);
      return {
        success: false,
        message: 'Failed to confirm completion'
      };
    }
  }
}
