import { databases, COLLECTIONS } from './appwrite';
import { BookingCompletionService } from './booking-completion.service';
import { notificationService } from './notification-service';
import { TermiiSMSService } from './termii-sms.service';
import { Query } from 'appwrite';

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
   * Check if booking is from a job application
   */
  static async getRelatedApplication(bookingId: string) {
    try {
      const applications = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.JOB_APPLICATIONS,
        [
          Query.equal('bookingId', bookingId),
          Query.limit(1)
        ]
      );

      return applications.documents.length > 0 ? applications.documents[0] : null;
    } catch (error) {
      console.error('Error fetching related application:', error);
      return null;
    }
  }

  /**
   * Check if worker can still accept job application (within 1-hour window)
   */
  static canAcceptJobApplication(selectedAt: string): boolean {
    const selectionTime = new Date(selectedAt).getTime();
    const now = Date.now();
    const oneHourInMs = 60 * 60 * 1000;

    return (now - selectionTime) < oneHourInMs;
  }

  /**
   * Accept a booking (UNIFIED: handles both direct bookings and job applications)
   */
  static async acceptBooking(params: BookingActionParams) {
    try {
      const { bookingId } = params;

      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

      // Check if this booking is from a job application
      const application = await this.getRelatedApplication(bookingId);

      // If from job application, validate 1-hour acceptance window
      if (application) {
        // Check if already accepted
        if (application.acceptedAt) {
          return {
            success: false,
            message: 'You have already accepted this job'
          };
        }

        // Check if declined
        if (application.declinedAt) {
          return {
            success: false,
            message: 'You declined this job'
          };
        }

        // Check if unpicked by client
        if (application.unpickedAt) {
          return {
            success: false,
            message: 'Client has cancelled this job selection'
          };
        }

        // Validate 1-hour window
        if (!this.canAcceptJobApplication(application.selectedAt)) {
          return {
            success: false,
            message: 'The 1-hour acceptance window has expired. Please contact the client.'
          };
        }
      }

      // Update booking status to 'accepted'
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

      // If from job application, also update application.acceptedAt
      if (application) {
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.JOB_APPLICATIONS,
          application.$id,
          {
            acceptedAt: new Date().toISOString()
          }
        );
      }

      // Send notifications to client
      try {
        const [worker, client] = await Promise.all([
          databases.getDocument(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!, COLLECTIONS.USERS, booking.workerId),
          databases.getDocument(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!, COLLECTIONS.USERS, booking.clientId)
        ]);

        // In-app notification
        await notificationService.createNotification({
          userId: booking.clientId,
          title: 'Booking Accepted! 🎉',
          message: `${worker.name} accepted your booking for "${booking.title}". Work will begin as scheduled.`,
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
        message: application
          ? 'Job accepted successfully! The client has been notified.'
          : 'Booking accepted successfully!'
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
   * Worker declines a job application selection (within 1-hour window)
   * Refunds client, reopens job for new applications
   */
  static async declineJobApplication(params: BookingActionParams) {
    try {
      const { bookingId, reason } = params;

      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

      // Get related application
      const application = await this.getRelatedApplication(bookingId);

      if (!application) {
        return {
          success: false,
          message: 'This booking is not from a job application'
        };
      }

      // Check if already accepted
      if (application.acceptedAt) {
        return {
          success: false,
          message: 'You have already accepted this job'
        };
      }

      // Check if already declined
      if (application.declinedAt) {
        return {
          success: false,
          message: 'You have already declined this job'
        };
      }

      // Check if unpicked by client
      if (application.unpickedAt) {
        return {
          success: false,
          message: 'Client has already cancelled this job selection'
        };
      }

      // Validate 1-hour window
      if (!this.canAcceptJobApplication(application.selectedAt)) {
        return {
          success: false,
          message: 'The 1-hour decision window has expired. Please contact the client.'
        };
      }

      // Update application status to declined
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.JOB_APPLICATIONS,
        application.$id,
        {
          status: 'rejected',
          declinedAt: new Date().toISOString()
        }
      );

      // Get job to reopen it
      const job = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.JOBS,
        application.jobId
      );

      // Reopen job for applications
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.JOBS,
        application.jobId,
        {
          status: 'open',
          assignedWorkerId: null,
          assignedAt: null,
          bookingId: null
        }
      );

      // Refund client wallet using BookingCompletionService
      await BookingCompletionService.cancelBooking({
        bookingId,
        clientId: booking.clientId,
        reason: reason || 'Worker declined the job'
      });

      // Notify client
      try {
        const [worker, client] = await Promise.all([
          databases.getDocument(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!, COLLECTIONS.USERS, booking.workerId),
          databases.getDocument(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!, COLLECTIONS.USERS, booking.clientId)
        ]);

        await notificationService.createNotification({
          userId: booking.clientId,
          title: 'Worker Declined Job',
          message: `${worker.name} declined your job "${job.title}". Your payment has been refunded. The job is now open for new applications.`,
          type: 'warning',
          bookingId: application.jobId,
          actionUrl: `/client/jobs?id=${application.jobId}`,
          idempotencyKey: `worker_declined_${bookingId}`
        });

        // SMS notification
        if (client.phone) {
          const { TermiiSMSService } = await import('./termii-sms.service');
          await TermiiSMSService.sendSMS({
            to: client.phone,
            message: `ErrandWork: ${worker.name} declined your job "${job.title}". Full refund processed. Job reopened for applications.`
          });
        }
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }

      return {
        success: true,
        message: 'Job declined. Client has been notified and refunded.'
      };
    } catch (error) {
      console.error('Error declining job application:', error);
      return {
        success: false,
        message: 'Failed to decline job application'
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

      // Release payment from escrow to worker via API route (uses server SDK)
      const amount = booking.totalAmount || booking.budgetAmount;

      const response = await fetch('/api/bookings/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          clientId: booking.clientId,
          workerId: booking.workerId,
          amount
        }),
      });

      const paymentResult = await response.json();

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
