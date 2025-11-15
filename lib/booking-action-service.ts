import { databases, COLLECTIONS } from './appwrite';
import { BookingCompletionService } from './booking-completion.service';
import { notificationService } from './notification-service';
import { TermiiSMSService } from './termii-sms.service';

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

      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

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

      // Send notifications to client
      try {
        const [worker, client] = await Promise.all([
          databases.getDocument(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!, COLLECTIONS.USERS, booking.workerId),
          databases.getDocument(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!, COLLECTIONS.USERS, booking.clientId)
        ]);

        // In-app notification
        await notificationService.createNotification({
          userId: booking.clientId,
          title: 'Booking Accepted',
          message: `${worker.name} accepted your booking for "${booking.title}"`,
          type: 'success',
          bookingId,
          idempotencyKey: `booking_accepted_${bookingId}`
        });

        // SMS notification
        if (client.phone) {
          await TermiiSMSService.sendBookingNotification(client.phone, {
            service: booking.title,
            date: new Date(booking.scheduledDate).toLocaleDateString(),
            status: 'accepted',
            workerName: worker.name
          });
        }

        // Email notification
        const { BookingNotificationService } = await import('./booking-notification-service');
        await BookingNotificationService.notifyBookingAccepted(bookingId, booking.clientId, booking.workerId, booking);
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }

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

      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

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

      // Send notifications to client
      try {
        const [worker, client] = await Promise.all([
          databases.getDocument(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!, COLLECTIONS.USERS, booking.workerId),
          databases.getDocument(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!, COLLECTIONS.USERS, booking.clientId)
        ]);

        await notificationService.createNotification({
          userId: booking.clientId,
          title: 'Work Started',
          message: `${worker.name} started working on "${booking.title}"`,
          type: 'info',
          bookingId,
          idempotencyKey: `work_started_${bookingId}`
        });

        if (client.phone) {
          await TermiiSMSService.sendSMS({
            to: client.phone,
            message: `ErandWork: ${worker.name} started work on "${booking.title}". Track progress in your dashboard.`
          });
        }

        // Email notification
        const { BookingNotificationService } = await import('./booking-notification-service');
        await BookingNotificationService.notifyWorkStarted(bookingId, booking.clientId, booking.workerId, booking);
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }

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

      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

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

      // Send notifications to client
      try {
        const [worker, client] = await Promise.all([
          databases.getDocument(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!, COLLECTIONS.USERS, booking.workerId),
          databases.getDocument(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!, COLLECTIONS.USERS, booking.clientId)
        ]);

        await notificationService.createNotification({
          userId: booking.clientId,
          title: 'Work Completed',
          message: `${worker.name} completed "${booking.title}". Please review and confirm to release payment.`,
          type: 'warning',
          bookingId,
          idempotencyKey: `work_completed_${bookingId}`
        });

        if (client.phone) {
          await TermiiSMSService.sendBookingNotification(client.phone, {
            service: booking.title,
            date: new Date().toLocaleDateString(),
            status: 'completed',
            workerName: worker.name
          });
        }

        // Email notification
        const { BookingNotificationService } = await import('./booking-notification-service');
        await BookingNotificationService.notifyWorkCompleted(bookingId, booking.clientId, booking.workerId, booking);
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }

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
   *
   * TRANSACTION ROLLBACK:
   * - BookingCompletionService.completeBooking() handles payment + booking update atomically
   * - If either step fails, payment is automatically rolled back
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

      // Release payment from escrow to worker (with automatic rollback on failure)
      const paymentResult = await BookingCompletionService.completeBooking({
        bookingId,
        clientId: booking.clientId,
        workerId: booking.workerId,
        amount: booking.budgetAmount
      });

      if (!paymentResult.success) {
        // Payment or booking update failed, rollback already happened
        return paymentResult;
      }

      // Update booking confirmation timestamp
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
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

  /**
   * Raise a dispute (client raises dispute about completed work)
   */
  static async raiseDispute(params: BookingActionParams & {
    disputeDetails?: {
      category: string;
      description: string;
      evidence?: string[];
    }
  }) {
    try {
      const { bookingId, userId, disputeDetails } = params;

      if (!disputeDetails) {
        return {
          success: false,
          message: 'Dispute details are required'
        };
      }

      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

      // Only worker_completed bookings can be disputed
      if (booking.status !== 'worker_completed') {
        return {
          success: false,
          message: 'Only completed work waiting for confirmation can be disputed'
        };
      }

      const { DisputeService } = await import('./dispute.service');

      const result = await DisputeService.createDispute({
        bookingId,
        clientId: userId,
        workerId: booking.workerId,
        category: disputeDetails.category,
        clientStatement: disputeDetails.description,
        evidence: disputeDetails.evidence
      });

      return result;

    } catch (error) {
      console.error('Error raising dispute:', error);
      return {
        success: false,
        message: 'Failed to raise dispute'
      };
    }
  }
}
