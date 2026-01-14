import { databases, COLLECTIONS } from './appwrite';
import { BookingCompletionService } from './booking-completion.service';
import { notificationService } from './notification-service';
import { Query } from 'appwrite';

/**
 * CLIENT CANCELLATION SERVICE
 *
 * Handles client-initiated cancellation of jobs and bookings
 * - Cancel job postings (before or after worker selection)
 * - Cancel direct bookings
 * - Full refund to client wallet
 * - Notify affected workers
 */

export class ClientCancellationService {
  /**
   * Check if client can cancel a booking
   * Clients can cancel anytime, but timing affects notifications
   */
  static canClientCancelBooking(booking: any): {
    canCancel: boolean;
    reason?: string;
    requiresWorkerNotification: boolean;
  } {
    // Already cancelled
    if (booking.status === 'cancelled') {
      return {
        canCancel: false,
        reason: 'Booking is already cancelled',
        requiresWorkerNotification: false
      };
    }

    // Already completed
    if (booking.status === 'completed') {
      return {
        canCancel: false,
        reason: 'Cannot cancel completed booking',
        requiresWorkerNotification: false
      };
    }

    // Payment already released
    if (booking.paymentStatus === 'released') {
      return {
        canCancel: false,
        reason: 'Payment has already been released to worker',
        requiresWorkerNotification: false
      };
    }

    // Can cancel if payment is still in escrow
    const requiresWorkerNotification =
      booking.status === 'accepted' ||
      booking.status === 'in_progress' ||
      booking.status === 'worker_completed';

    return {
      canCancel: true,
      requiresWorkerNotification
    };
  }

  /**
   * Cancel a booking (direct booking or job application booking)
   */
  static async cancelBooking(params: {
    bookingId: string;
    clientId: string;
    reason?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { bookingId, clientId, reason } = params;

      // Get booking details
      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

      // Security check
      if (booking.clientId !== clientId) {
        return {
          success: false,
          message: 'Unauthorized: This booking does not belong to you'
        };
      }

      // Check if cancellation is allowed
      const { canCancel, reason: blockReason, requiresWorkerNotification } =
        this.canClientCancelBooking(booking);

      if (!canCancel) {
        return {
          success: false,
          message: blockReason || 'Cannot cancel this booking'
        };
      }

      // Check if this is from a job application
      const applications = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.JOB_APPLICATIONS,
        [Query.equal('bookingId', bookingId), Query.limit(1)]
      );

      const isJobApplication = applications.documents.length > 0;
      const application = isJobApplication ? applications.documents[0] : null;

      // Perform cancellation and refund
      const cancelResult = await BookingCompletionService.cancelBooking({
        bookingId,
        clientId,
        reason: reason || 'Client cancelled'
      });

      if (!cancelResult.success) {
        return cancelResult;
      }

      // If from job application, update application status
      if (application) {
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.JOB_APPLICATIONS,
          application.$id,
          {
            status: 'unpicked',
            unpickedAt: new Date().toISOString()
          }
        );

        // Reopen the job if it was assigned
        if (booking.jobId) {
          await databases.updateDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.JOBS,
            booking.jobId,
            {
              status: 'open',
              assignedWorkerId: null,
              assignedAt: null,
              bookingId: null
            }
          );
        }
      }

      // Notify worker if they were already involved
      if (requiresWorkerNotification && booking.workerId) {
        try {
          const [worker, client] = await Promise.all([
            databases.getDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              COLLECTIONS.USERS,
              booking.workerId
            ),
            databases.getDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              COLLECTIONS.USERS,
              clientId
            )
          ]);

          // In-app notification
          await notificationService.createNotification({
            userId: booking.workerId,
            title: 'Booking Cancelled by Client',
            message: `${client.name} cancelled the booking "${
              booking.title || 'Job'
            }". ${reason ? `Reason: ${reason}` : ''}`,
            type: 'warning',
            bookingId,
            idempotencyKey: `client_cancelled_${bookingId}`
          });

          // SMS notification
          if (worker.phone) {
            try {
              const { TermiiSMSService } = await import('./termii-sms.service');
              await TermiiSMSService.sendSMS({
                to: worker.phone,
                message: `ErrandWork: Client cancelled booking "${
                  booking.title || 'Job'
                }". ${reason ? `Reason: ${reason}` : ''}`
              });
            } catch (smsError) {
              console.error('Failed to send SMS:', smsError);
            }
          }
        } catch (notifError) {
          console.error('Failed to notify worker:', notifError);
        }
      }

      return {
        success: true,
        message: isJobApplication
          ? 'Job cancelled successfully. The job is now open for new applications.'
          : 'Booking cancelled successfully. You have been refunded.'
      };
    } catch (error) {
      console.error('Error cancelling booking:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel booking'
      };
    }
  }

  /**
   * Cancel a job posting
   * Works for both open jobs and assigned jobs
   */
  static async cancelJob(params: {
    jobId: string;
    clientId: string;
    reason?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const { jobId, clientId, reason } = params;

      // Get job details
      const job = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.JOBS,
        jobId
      );

      // Security check
      if (job.clientId !== clientId) {
        return {
          success: false,
          message: 'Unauthorized: This job does not belong to you'
        };
      }

      // Check if job is already cancelled or completed
      if (job.status === 'cancelled') {
        return {
          success: false,
          message: 'Job is already cancelled'
        };
      }

      if (job.status === 'completed') {
        return {
          success: false,
          message: 'Cannot cancel completed job'
        };
      }

      // If job has an assigned booking, cancel the booking first
      if (job.bookingId) {
        const cancelBookingResult = await this.cancelBooking({
          bookingId: job.bookingId,
          clientId,
          reason: reason || 'Job cancelled by client'
        });

        if (!cancelBookingResult.success) {
          return cancelBookingResult;
        }
      }

      // Update job status to cancelled
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.JOBS,
        jobId,
        {
          status: 'cancelled',
          updatedAt: new Date().toISOString()
        }
      );

      // Reject all pending applications
      const applications = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.JOB_APPLICATIONS,
        [Query.equal('jobId', jobId), Query.equal('status', 'pending'), Query.limit(100)]
      );

      // Notify all applicants
      for (const app of applications.documents) {
        try {
          // Update application status
          await databases.updateDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.JOB_APPLICATIONS,
            app.$id,
            {
              status: 'rejected',
              rejectedAt: new Date().toISOString()
            }
          );

          // Get worker details
          const worker = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.WORKERS,
            app.workerId
          );

          // Notify worker
          await notificationService.createNotification({
            userId: worker.userId,
            title: 'Job Cancelled',
            message: `The job "${job.title}" has been cancelled by the client. ${
              reason ? `Reason: ${reason}` : ''
            }`,
            type: 'info',
            bookingId: jobId,
            idempotencyKey: `job_cancelled_${jobId}_${worker.userId}`
          });
        } catch (error) {
          console.error(`Failed to notify applicant ${app.workerId}:`, error);
        }
      }

      return {
        success: true,
        message: 'Job cancelled successfully'
      };
    } catch (error) {
      console.error('Error cancelling job:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel job'
      };
    }
  }
}
