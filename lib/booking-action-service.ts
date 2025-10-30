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
   * Mark booking as completed (releases payment to worker)
   */
  static async markCompleted(params: BookingActionParams) {
    try {
      const { bookingId, userId } = params;

      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

      // Release payment from escrow to worker
      const result = await BookingCompletionService.completeBooking({
        bookingId,
        clientId: booking.clientId,
        workerId: userId,
        amount: booking.budgetAmount
      });

      return result;
    } catch (error) {
      console.error('Error completing booking:', error);
      return {
        success: false,
        message: 'Failed to complete booking'
      };
    }
  }
}
