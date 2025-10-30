import { databases, COLLECTIONS } from './appwrite';
import { BookingCompletionService } from './booking-completion.service';

/**
 * BOOKING ACTION SERVICE
 *
 * Handles worker booking actions (accept, reject, complete)
 */

export class BookingActionService {

  /**
   * Accept a booking
   */
  static async acceptBooking(bookingId: string, workerId: string) {
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'confirmed',
          updatedAt: new Date().toISOString()
        }
      );

      return {
        success: true,
        message: 'Booking accepted'
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
  static async rejectBooking(bookingId: string, workerId: string, reason?: string) {
    try {
      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

      // Refund client
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
   * Mark booking as in progress
   */
  static async startBooking(bookingId: string, workerId: string) {
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'in_progress',
          updatedAt: new Date().toISOString()
        }
      );

      return {
        success: true,
        message: 'Booking started'
      };
    } catch (error) {
      console.error('Error starting booking:', error);
      return {
        success: false,
        message: 'Failed to start booking'
      };
    }
  }

  /**
   * Complete booking (releases payment)
   */
  static async completeBooking(bookingId: string, workerId: string) {
    try {
      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

      // Release payment to worker
      const result = await BookingCompletionService.completeBooking({
        bookingId,
        clientId: booking.clientId,
        workerId,
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
