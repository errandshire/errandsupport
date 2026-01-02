import { databases, COLLECTIONS, DATABASE_ID } from './appwrite';
import { Query } from 'appwrite';
import { Job } from './types';
import { notificationService } from './notification-service';
import { emailService } from './email-service';
import { TermiiSMSService } from './termii-sms.service';
import { NOTIFICATION_TYPES } from './constants';

/**
 * Job Notification Service
 * Handles all job-related notifications (email, SMS, in-app)
 */
export class JobNotificationService {
  /**
   * Notify workers when a new job is posted
   * Only notify workers whose categories match the job category
   */
  static async notifyNewJobPosted(job: Job, maxWorkers: number = 20): Promise<void> {
    try {
      // Find workers with matching category who are verified and active
      const workers = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WORKERS,
        [
          Query.equal('isVerified', true),
          Query.equal('isActive', true),
          Query.equal('categories', job.categoryId),
          Query.orderDesc('rating'),
          Query.limit(maxWorkers)
        ]
      );

      console.log(`Notifying ${workers.documents.length} workers about new job: ${job.title}`);

      // Send in-app notifications to all matching workers
      const notificationPromises = workers.documents.map(async (worker) => {
        await notificationService.createNotification({
          userId: worker.userId,
          title: 'New Job Available!',
          message: `A new ${job.categoryId} job is available: "${job.title}" - Budget: ₦${job.budgetMax.toLocaleString()}`,
          type: 'info',
          bookingId: job.$id,
          actionUrl: `/worker/jobs?jobId=${job.$id}`,
          idempotencyKey: `job_posted_${job.$id}_${worker.userId}`,
        });

        // Optional: Send SMS to top-rated workers (first 5)
        if (workers.documents.indexOf(worker) < 5 && worker.phone) {
          const message = `New job on ErandWork: ${job.title} - ₦${job.budgetMax.toLocaleString()}. View details: ${process.env.NEXT_PUBLIC_BASE_URL}/worker/jobs`;
          await TermiiSMSService.sendSMS({
            to: worker.phone,
            message
          }).catch(err => console.error('SMS failed:', err));
        }
      });

      await Promise.all(notificationPromises);

      console.log(`✅ Notified ${workers.documents.length} workers about job ${job.$id}`);
    } catch (error) {
      console.error('Error notifying workers about new job:', error);
      // Don't throw - notification failures shouldn't block job creation
    }
  }

  /**
   * Notify client when their job has been accepted by a worker
   */
  static async notifyJobAccepted(
    job: Job,
    workerData: { id: string; name: string; email: string }
  ): Promise<void> {
    try {
      // Get client details
      const client = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        job.clientId
      );

      // In-app notification
      await notificationService.createNotification({
        userId: job.clientId,
        title: 'Job Accepted!',
        message: `${workerData.name} has accepted your job "${job.title}". Payment is secured in escrow.`,
        type: 'success',
        bookingId: job.bookingId,
        actionUrl: job.bookingId ? `/client/bookings?id=${job.bookingId}` : '/client/bookings',
        idempotencyKey: `job_accepted_${job.$id}_client`,
      });

      // Email notification
      if (client.email) {
        try {
          const emailHtml = `
            <h2>Great News! Your Job Has Been Accepted</h2>
            <p>Hello ${client.name},</p>
            <p><strong>${workerData.name}</strong> has accepted your job request!</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${job.title}</h3>
              <p><strong>Worker:</strong> ${workerData.name}</p>
              <p><strong>Scheduled:</strong> ${new Date(job.scheduledDate).toLocaleDateString()} at ${job.scheduledTime}</p>
              <p><strong>Location:</strong> ${job.locationAddress}</p>
              <p><strong>Budget:</strong> ₦${job.budgetMax.toLocaleString()}</p>
            </div>
            <p><strong>What happens next:</strong></p>
            <ul>
              <li>✅ Your payment is secured in escrow</li>
              <li>📅 The worker will complete the job on the scheduled date</li>
              <li>💬 You can message the worker directly through the platform</li>
              <li>✅ After completion, confirm the job to release payment</li>
            </ul>
            ${job.bookingId ? `<a href="${process.env.NEXT_PUBLIC_BASE_URL}/client/bookings?id=${job.bookingId}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">View Booking Details</a>` : ''}
          `;

          await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: client.email,
              subject: `Your job "${job.title}" has been accepted!`,
              html: emailHtml,
              type: NOTIFICATION_TYPES.JOB_ACCEPTED,
            }),
          });
        } catch (emailError) {
          console.error('Failed to send job accepted email:', emailError);
        }
      }

      console.log(`✅ Notified client ${job.clientId} about job acceptance`);
    } catch (error) {
      console.error('Error notifying client about job acceptance:', error);
    }
  }

  /**
   * Notify other workers that a job has been filled
   */
  static async notifyJobFilled(job: Job, excludeWorkerId: string): Promise<void> {
    try {
      // Find workers who might have viewed this job (same category)
      const workers = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WORKERS,
        [
          Query.equal('isVerified', true),
          Query.equal('isActive', true),
          Query.equal('categories', job.categoryId),
          Query.limit(50)
        ]
      );

      // Send in-app notifications (excluding the worker who accepted)
      const notificationPromises = workers.documents
        .filter(worker => worker.userId !== excludeWorkerId)
        .map(async (worker) => {
          await notificationService.createNotification({
            userId: worker.userId,
            title: 'Job Filled',
            message: `The job "${job.title}" has been accepted by another worker.`,
            type: 'info',
            bookingId: job.$id,
            actionUrl: '/worker/jobs',
            idempotencyKey: `job_filled_${job.$id}_${worker.userId}`,
          });
        });

      await Promise.all(notificationPromises);

      console.log(`✅ Notified workers that job ${job.$id} is filled`);
    } catch (error) {
      console.error('Error notifying workers about filled job:', error);
    }
  }

  /**
   * Notify client when their job expires without being accepted
   */
  static async notifyJobExpired(job: Job): Promise<void> {
    try {
      // Get client details
      const client = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        job.clientId
      );

      // In-app notification
      await notificationService.createNotification({
        userId: job.clientId,
        title: 'Job Expired',
        message: `Your job "${job.title}" expired without being accepted. Consider reposting with adjusted details.`,
        type: 'warning',
        bookingId: job.$id,
        actionUrl: '/client/jobs',
        idempotencyKey: `job_expired_${job.$id}`,
      });

      // Email notification
      if (client.email) {
        try {
          const emailHtml = `
            <h2>Your Job Posting Has Expired</h2>
            <p>Hello ${client.name},</p>
            <p>Unfortunately, your job posting expired without being accepted by a worker.</p>
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${job.title}</h3>
              <p><strong>Posted:</strong> ${new Date(job.createdAt).toLocaleDateString()}</p>
              <p><strong>Budget:</strong> ₦${job.budgetMax.toLocaleString()}</p>
              <p><strong>Category:</strong> ${job.categoryId}</p>
            </div>
            <p><strong>What you can do:</strong></p>
            <ul>
              <li>📝 Repost the job with more details or adjusted budget</li>
              <li>📍 Consider expanding the service area</li>
              <li>📅 Try posting at a different time or date</li>
              <li>💰 Adjust the budget to attract more workers</li>
            </ul>
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/client/jobs" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Post New Job</a>
          `;

          await fetch('/api/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: client.email,
              subject: `Your job "${job.title}" has expired`,
              html: emailHtml,
              type: NOTIFICATION_TYPES.JOB_EXPIRED,
            }),
          });
        } catch (emailError) {
          console.error('Failed to send job expired email:', emailError);
        }
      }

      console.log(`✅ Notified client ${job.clientId} about job expiration`);
    } catch (error) {
      console.error('Error notifying client about job expiration:', error);
    }
  }

  /**
   * Notify client when a job is cancelled
   */
  static async notifyJobCancelled(
    job: Job,
    reason?: string,
    cancelledBy: 'client' | 'worker' = 'client'
  ): Promise<void> {
    try {
      if (cancelledBy === 'client') {
        // If worker was assigned, notify them
        if (job.assignedWorkerId) {
          await notificationService.createNotification({
            userId: job.assignedWorkerId,
            title: 'Job Cancelled',
            message: `The client has cancelled the job "${job.title}". ${reason ? `Reason: ${reason}` : ''}`,
            type: 'warning',
            bookingId: job.$id,
            actionUrl: '/worker/jobs',
            idempotencyKey: `job_cancelled_${job.$id}_worker`,
          });
        }
      } else {
        // Worker cancelled, notify client
        await notificationService.createNotification({
          userId: job.clientId,
          title: 'Job Cancelled by Worker',
          message: `The worker has cancelled the job "${job.title}". ${reason ? `Reason: ${reason}` : ''}`,
          type: 'warning',
          bookingId: job.$id,
          actionUrl: '/client/jobs',
          idempotencyKey: `job_cancelled_${job.$id}_client`,
        });
      }

      console.log(`✅ Sent job cancellation notification for ${job.$id}`);
    } catch (error) {
      console.error('Error sending job cancellation notification:', error);
    }
  }
}
