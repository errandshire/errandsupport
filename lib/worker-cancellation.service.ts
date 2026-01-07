import { databases, DATABASE_ID, COLLECTIONS } from './appwrite';
import { Query } from 'appwrite';
import { BookingCompletionService } from './booking-completion.service';
import { notificationService } from './notification-service';

/**
 * Worker Cancellation Service
 *
 * Handles worker-initiated job cancellations with 24-hour policy:
 * - Workers CANNOT cancel within 24 hours of being selected
 * - After 24 hours, workers CAN cancel
 * - Cancellation triggers: refund to client, job reopens, client notification
 */
export class WorkerCancellationService {
  /**
   * Check if worker can cancel job based on 24-hour policy
   *
   * @param jobId - ID of the job
   * @param workerId - ID of the worker
   * @param dbClient - Optional database client (use serverDatabases for server-side calls)
   * @returns Eligibility result with reason if not allowed
   */
  static async canCancelJob(
    jobId: string,
    workerId: string,
    dbClient?: any
  ): Promise<{
    canCancel: boolean;
    reason?: string;
    hoursElapsed?: number;
    hoursRemaining?: number;
  }> {
    const db = dbClient || databases;

    try {
      // Get job details
      const job = await db.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId
      );

      // Check if worker is assigned to this job
      if (job.assignedWorkerId !== workerId) {
        return {
          canCancel: false,
          reason: 'You are not assigned to this job'
        };
      }

      // Check if job is still in assigned status
      if (job.status !== 'assigned') {
        return {
          canCancel: false,
          reason: `This job is already ${job.status}`
        };
      }

      // Check if assignedAt timestamp exists
      if (!job.assignedAt) {
        return {
          canCancel: false,
          reason: 'Job assignment time not found'
        };
      }

      // Calculate hours elapsed since assignment
      const assignedTime = new Date(job.assignedAt).getTime();
      const currentTime = new Date().getTime();
      const hoursElapsed = (currentTime - assignedTime) / (1000 * 60 * 60);

      // 24-hour policy check
      if (hoursElapsed < 24) {
        const hoursRemaining = 24 - hoursElapsed;
        return {
          canCancel: false,
          reason: `You must wait ${Math.ceil(hoursRemaining)} more hours before cancelling`,
          hoursElapsed: Math.floor(hoursElapsed),
          hoursRemaining: Math.ceil(hoursRemaining)
        };
      }

      // Worker can cancel
      return {
        canCancel: true,
        hoursElapsed: Math.floor(hoursElapsed)
      };

    } catch (error) {
      console.error('Error checking cancellation eligibility:', error);
      throw error;
    }
  }

  /**
   * Execute worker-initiated job cancellation
   *
   * Process:
   * 1. Validate 24-hour policy and authorization
   * 2. Get associated booking
   * 3. Refund client's escrow using BookingCompletionService
   * 4. Reopen job (status='open', clear assigned fields)
   * 5. Notify client via in-app, email, SMS
   *
   * @param params - Cancellation parameters
   * @returns Result with success status and message
   */
  static async cancelJobAsWorker(params: {
    jobId: string;
    workerId: string;
    workerUserId: string;
    reason?: string;
    dbClient?: any;
  }): Promise<{ success: boolean; message: string }> {
    const { jobId, workerId, workerUserId, reason, dbClient } = params;
    const db = dbClient || databases;

    try {
      // 1. Check if worker can cancel (24-hour policy)
      const eligibility = await this.canCancelJob(jobId, workerId, db);

      if (!eligibility.canCancel) {
        return {
          success: false,
          message: eligibility.reason || 'Cannot cancel this job'
        };
      }

      console.log(`✅ Worker ${workerId} eligible to cancel job ${jobId} (${eligibility.hoursElapsed}h elapsed)`);

      // 2. Get job details
      const job = await db.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId
      );

      // 3. Get associated booking
      if (!job.bookingId) {
        return {
          success: false,
          message: 'No booking found for this job'
        };
      }

      const booking = await db.getDocument(
        DATABASE_ID,
        COLLECTIONS.BOOKINGS,
        job.bookingId
      );

      console.log(`💰 Found booking ${booking.$id} with payment status: ${booking.paymentStatus}`);

      // 4. Refund client using existing cancellation logic
      // Note: BookingCompletionService.cancelBooking expects clientId
      const refundResult = await BookingCompletionService.cancelBooking({
        bookingId: booking.$id,
        clientId: job.clientId,
        reason: reason || `Worker cancelled after ${eligibility.hoursElapsed} hours`
      });

      if (!refundResult.success) {
        console.error('❌ Refund failed:', refundResult.message);
        return {
          success: false,
          message: `Refund failed: ${refundResult.message}`
        };
      }

      console.log('✅ Client refunded successfully');

      // 5. Reopen job - restore to open status
      try {
        await db.updateDocument(
          DATABASE_ID,
          COLLECTIONS.JOBS,
          jobId,
          {
            status: 'open',
            assignedWorkerId: null,
            assignedAt: null,
            bookingId: null,
            workerCancelledAt: new Date().toISOString(),
            workerCancellationReason: reason || 'Worker cancelled',
            updatedAt: new Date().toISOString()
          }
        );

        console.log(`✅ Job ${jobId} reopened and available to public`);
      } catch (reopenError) {
        console.error('❌ Failed to reopen job:', reopenError);
        // Job still cancelled but may need manual intervention
        throw new Error('Refund succeeded but failed to reopen job. Please contact support.');
      }

      // 6. Notify client
      try {
        const worker = await db.getDocument(
          DATABASE_ID,
          COLLECTIONS.WORKERS,
          workerId
        );

        const workerName = worker.displayName || worker.name || 'The worker';

        // In-app notification
        await notificationService.createNotification({
          userId: job.clientId,
          title: 'Worker Cancelled Job',
          message: `${workerName} has cancelled "${job.title}". Your payment has been refunded to your wallet. The job is now open for other workers to apply.`,
          type: 'warning',
          bookingId: booking.$id,
          actionUrl: `/client/jobs/${jobId}`,
          idempotencyKey: `worker_cancelled_${jobId}_${job.clientId}`
        });

        console.log('✅ Client notification sent');

        // Email and SMS notifications (async, don't block response)
        this.sendCancellationNotifications(job, booking, worker, db).catch(error => {
          console.error('Failed to send email/SMS notifications:', error);
        });

      } catch (notifError) {
        console.error('Failed to notify client:', notifError);
        // Don't fail the entire operation if notification fails
      }

      // 7. Notify worker (confirmation)
      try {
        await notificationService.createNotification({
          userId: workerUserId,
          title: 'Job Cancelled',
          message: `You cancelled "${job.title}". The client has been refunded and the job is now available for others.`,
          type: 'info',
          actionUrl: '/worker/jobs',
          idempotencyKey: `worker_self_cancelled_${jobId}_${workerUserId}`
        });
      } catch (notifError) {
        console.error('Failed to notify worker:', notifError);
      }

      return {
        success: true,
        message: 'Job cancelled successfully. Client has been refunded and the job is now open for applications.'
      };

    } catch (error) {
      console.error('Error in worker cancellation:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel job'
      };
    }
  }

  /**
   * Send email and SMS notifications for worker cancellation
   * (Called asynchronously to not block the main cancellation flow)
   */
  private static async sendCancellationNotifications(
    job: any,
    booking: any,
    worker: any,
    db: any
  ): Promise<void> {
    try {
      // Get client details for SMS
      const clientUser = await db.getDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        job.clientId
      );

      const workerName = worker.displayName || worker.name || 'The worker';

      // Send SMS if client has phone
      if (clientUser.phone) {
        try {
          const response = await fetch('/api/sms/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: clientUser.phone,
              message: `ErrandWork: ${workerName} cancelled your job "${job.title}". ₦${booking.totalAmount.toLocaleString()} has been refunded to your wallet. The job is now open for applications.`
            })
          });

          const smsResult = await response.json();
          console.log('📱 SMS sent:', smsResult);
        } catch (smsError) {
          console.error('📱 SMS error:', smsError);
        }
      }

      // Send email notification
      const { BookingNotificationService } = await import('./booking-notification-service');
      await BookingNotificationService.notifyWorkerCancellation(
        job,
        booking,
        worker,
        clientUser
      );

      console.log('📧 Email notification sent');
    } catch (error) {
      console.error('Error sending cancellation notifications:', error);
    }
  }
}
