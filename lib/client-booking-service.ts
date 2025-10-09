import { databases, COLLECTIONS } from '@/lib/appwrite';
import { EscrowService } from '@/lib/escrow-service';
import { BookingNotificationService } from '@/lib/booking-notification-service';
import { ReviewService } from '@/lib/review-service';
import { toast } from 'sonner';

/**
 * Client Booking Service
 * Handles client-side booking actions and confirmations
 */

export interface BookingConfirmationRequest {
  bookingId: string;
  clientId: string;
  workerId: string;
  rating?: number;
  review?: string;
  tip?: number;
}

export class ClientBookingService {

  /**
   * Confirm work completion and release payment
   */
  static async confirmWorkCompletion(request: BookingConfirmationRequest): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { bookingId, clientId, workerId, rating, review, tip } = request;

      // Get booking details
      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

      if (booking.status !== 'worker_completed') {
        throw new Error('Booking is not ready for completion confirmation');
      }

      if (booking.clientId !== clientId) {
        throw new Error('Unauthorized: You can only confirm your own bookings');
      }

      // Update booking status to completed
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'completed',
          clientConfirmedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          clientRating: rating || null,
          clientReview: review || null,
          clientTip: tip || null
        }
      );

      // Release escrow payment
      try {
        await EscrowService.releaseEscrowPayment(
          bookingId,
          clientId,
          'Client confirmed work completion'
        );
        console.log(`✅ Escrow payment released for booking ${bookingId}`);
      } catch (escrowError) {
        console.error('❌ Error releasing escrow payment:', escrowError);
        // Continue - we'll handle this manually if needed
      }

      // Calculate final amount (including tip)
      const finalAmount = booking.budgetAmount + (tip || 0);

      // Send notifications to worker
      await BookingNotificationService.notifyPaymentReleased(
        bookingId,
        workerId,
        clientId,
        booking,
        finalAmount
      );

      // Create review if provided
      if (rating && rating > 0) {
        try {
          await ReviewService.createReview({
            bookingId,
            clientId,
            workerId,
            rating,
            comment: review || undefined,
            isPublic: true,
          });
        } catch (reviewError) {
          console.error('Error creating review:', reviewError);
          // Don't fail the main flow if review creation fails
        }
      }

      return {
        success: true,
        message: 'Work confirmed and payment released successfully!'
      };

    } catch (error) {
      console.error('Error confirming work completion:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to confirm work completion'
      };
    }
  }

  /**
   * Request booking cancellation/refund
   */
  static async requestBookingCancellation(
    bookingId: string,
    clientId: string,
    reason: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Get booking details
      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

      if (booking.clientId !== clientId) {
        throw new Error('Unauthorized: You can only cancel your own bookings');
      }

      if (!['confirmed', 'accepted'].includes(booking.status)) {
        throw new Error('Booking cannot be cancelled at this stage');
      }

      // Update booking status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'cancellation_requested',
          cancellationReason: reason,
          cancellationRequestedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // Handle refund based on booking stage
      if (booking.status === 'confirmed') {
        // Full refund if worker hasn't accepted yet
        await this.processFullRefund(bookingId, clientId, 'Cancelled before worker acceptance');
      } else {
        // Partial refund - needs admin review
        await this.requestRefundReview(bookingId, clientId, reason);
      }

      return {
        success: true,
        message: 'Cancellation request submitted successfully'
      };

    } catch (error) {
      console.error('Error requesting cancellation:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to request cancellation'
      };
    }
  }

  /**
   * Get client bookings with status filtering
   */
  static async getClientBookings(
    clientId: string,
    status?: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const queries = [
        { attribute: 'clientId', value: clientId },
        { attribute: '$createdAt', value: 'desc' },
        { attribute: '$limit', value: limit }
      ];

      if (status) {
        queries.push({ attribute: 'status', value: status });
      }

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        queries
      );

      return response.documents;

    } catch (error) {
      console.error('Error fetching client bookings:', error);
      return [];
    }
  }


  /**
   * Process full refund
   */
  private static async processFullRefund(
    bookingId: string,
    clientId: string,
    reason: string
  ): Promise<void> {
    try {
      await EscrowService.refundEscrowPayment(
        bookingId,
        clientId,
        reason
      );
      console.log(`✅ Full refund processed for booking ${bookingId}`);
    } catch (error) {
      console.error('❌ Error processing full refund:', error);
      throw error;
    }
  }

  /**
   * Request refund review for partial cancellations
   */
  private static async requestRefundReview(
    bookingId: string,
    clientId: string,
    reason: string
  ): Promise<void> {
    try {
      // Create admin review request
      const { ID } = await import('appwrite');
      
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.ADMIN_REVIEWS,
        ID.unique(),
        {
          type: 'refund_request',
          bookingId,
          clientId,
          reason,
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      );

      console.log(`✅ Refund review requested for booking ${bookingId}`);
    } catch (error) {
      console.error('❌ Error requesting refund review:', error);
    }
  }


  /**
   * Get booking details with worker info
   */
  static async getBookingWithWorkerInfo(bookingId: string, clientId: string): Promise<any> {
    try {
      // Get booking
      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

      if (booking.clientId !== clientId) {
        throw new Error('Unauthorized access to booking');
      }

      // Get worker info
      const worker = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        booking.workerId
      );

      return {
        ...booking,
        workerInfo: worker
      };

    } catch (error) {
      console.error('Error fetching booking with worker info:', error);
      throw error;
    }
  }
} 