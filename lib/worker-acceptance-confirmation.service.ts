import { databases, DATABASE_ID, COLLECTIONS } from './appwrite';
import { Query } from 'appwrite';
import { notificationService } from './notification-service';
import { TermiiSMSService } from './termii-sms.service';

export class WorkerAcceptanceService {
  /**
   * Check if worker can still respond to selection (within 1-hour window)
   */
  static canWorkerRespond(selectedAt: string): boolean {
    const selectionTime = new Date(selectedAt).getTime();
    const now = Date.now();
    const oneHourInMs = 60 * 60 * 1000;

    return (now - selectionTime) < oneHourInMs;
  }

  /**
   * Calculate time remaining in acceptance window
   */
  static calculateTimeRemaining(selectedAt: string): number {
    const selectionTime = new Date(selectedAt).getTime();
    const now = Date.now();
    const oneHourInMs = 60 * 60 * 1000;
    const elapsed = now - selectionTime;

    return Math.max(0, oneHourInMs - elapsed);
  }

  /**
   * Get acceptance status for an application
   */
  static async getAcceptanceStatus(applicationId: string) {
    try {
      const application = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        applicationId
      );

      if (application.status !== 'selected') {
        return {
          canRespond: false,
          reason: 'Application not in selected status'
        };
      }

      if (application.acceptedAt) {
        return {
          canRespond: false,
          status: 'accepted',
          acceptedAt: application.acceptedAt
        };
      }

      if (application.declinedAt) {
        return {
          canRespond: false,
          status: 'declined',
          declinedAt: application.declinedAt
        };
      }

      if (application.unpickedAt) {
        return {
          canRespond: false,
          status: 'unpicked',
          unpickedAt: application.unpickedAt
        };
      }

      const canRespond = this.canWorkerRespond(application.selectedAt);
      const timeRemaining = this.calculateTimeRemaining(application.selectedAt);

      return {
        canRespond,
        status: 'pending',
        selectedAt: application.selectedAt,
        timeRemaining,
        timeRemainingFormatted: this.formatTimeRemaining(timeRemaining)
      };
    } catch (error) {
      console.error('Error getting acceptance status:', error);
      throw error;
    }
  }

  /**
   * Format time remaining in HH:MM:SS format
   */
  static formatTimeRemaining(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Worker accepts the job selection
   */
  static async acceptJobSelection(applicationId: string, workerId: string) {
    try {
      // 1. Get application
      const application = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        applicationId
      );

      // 2. Validate worker owns this application
      if (application.workerId !== workerId) {
        throw new Error('Unauthorized: You do not own this application');
      }

      // 3. Check if already responded
      if (application.acceptedAt) {
        return {
          success: false,
          message: 'You already accepted this job'
        };
      }

      if (application.declinedAt) {
        return {
          success: false,
          message: 'You already declined this job'
        };
      }

      if (application.unpickedAt) {
        return {
          success: false,
          message: 'Client has unpicked you from this job'
        };
      }

      // 4. Check if still within 1-hour window
      if (!this.canWorkerRespond(application.selectedAt)) {
        return {
          success: false,
          message: 'The 1-hour acceptance window has expired'
        };
      }

      // 5. Update application with acceptedAt timestamp
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        applicationId,
        {
          acceptedAt: new Date().toISOString()
        }
      );

      // 6. Get job and worker details for notifications
      const [job, worker] = await Promise.all([
        databases.getDocument(DATABASE_ID, COLLECTIONS.JOBS, application.jobId),
        databases.getDocument(DATABASE_ID, COLLECTIONS.WORKERS, workerId)
      ]);

      const workerUser = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        worker.userId
      );

      const workerName = worker.displayName || workerUser.name || 'Worker';

      // 7. Send notification to client (in-app + SMS)
      try {
        await notificationService.createNotification({
          userId: application.clientId,
          title: `${workerName} accepted your job! 🎉`,
          message: `Great news! ${workerName} accepted "${job.title}". The work will begin as scheduled.`,
          type: 'success',
          bookingId: job.bookingId,
          actionUrl: `/client/bookings?id=${job.bookingId}`,
          idempotencyKey: `worker_accepted_${applicationId}_${application.clientId}`
        });

        // Send SMS to client
        const clientUser = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.USERS,
          application.clientId
        );

        if (clientUser.phone) {
          try {
            await TermiiSMSService.sendSMS({
              to: clientUser.phone,
              message: `ErrandWork: ${workerName} accepted your job "${job.title}". Work begins as scheduled!`
            });
          } catch (smsError) {
            console.error('Failed to send SMS to client:', smsError);
          }
        }
      } catch (error) {
        console.error('Error notifying client of acceptance:', error);
      }

      return {
        success: true,
        message: 'You successfully accepted the job!',
        application: {
          ...application,
          acceptedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error accepting job selection:', error);
      throw error;
    }
  }

  /**
   * Worker declines the job selection
   */
  static async declineJobSelection(applicationId: string, workerId: string, reason?: string) {
    try {
      // 1. Get application
      const application = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        applicationId
      );

      // 2. Validate worker owns this application
      if (application.workerId !== workerId) {
        throw new Error('Unauthorized: You do not own this application');
      }

      // 3. Check if already responded
      if (application.acceptedAt) {
        return {
          success: false,
          message: 'You already accepted this job. Please contact support to cancel.'
        };
      }

      if (application.declinedAt) {
        return {
          success: false,
          message: 'You already declined this job'
        };
      }

      if (application.unpickedAt) {
        return {
          success: false,
          message: 'Client has already unpicked you from this job'
        };
      }

      // 4. Check if still within 1-hour window
      if (!this.canWorkerRespond(application.selectedAt)) {
        return {
          success: false,
          message: 'The 1-hour response window has expired'
        };
      }

      // 5. Update application with declinedAt timestamp
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        applicationId,
        {
          declinedAt: new Date().toISOString(),
          status: 'rejected' // Mark as rejected when declined
        }
      );

      // 6. Update job back to 'open' status so client can select another worker
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        application.jobId,
        {
          status: 'open',
          assignedWorkerId: null,
          assignedAt: null
        }
      );

      // 7. Get job and worker details for notifications
      const [job, worker] = await Promise.all([
        databases.getDocument(DATABASE_ID, COLLECTIONS.JOBS, application.jobId),
        databases.getDocument(DATABASE_ID, COLLECTIONS.WORKERS, workerId)
      ]);

      const workerUser = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        worker.userId
      );

      const workerName = worker.displayName || workerUser.name || 'Worker';

      // 8. Send notification to client (in-app + SMS)
      try {
        await notificationService.createNotification({
          userId: application.clientId,
          title: `${workerName} declined your job`,
          message: `Unfortunately, ${workerName} declined "${job.title}". Please select another worker from your applicants.`,
          type: 'warning',
          jobId: application.jobId,
          actionUrl: `/client/jobs?id=${application.jobId}`,
          idempotencyKey: `worker_declined_${applicationId}_${application.clientId}`
        });

        // Send SMS to client
        const clientUser = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.USERS,
          application.clientId
        );

        if (clientUser.phone) {
          try {
            await TermiiSMSService.sendSMS({
              to: clientUser.phone,
              message: `ErrandWork: ${workerName} declined "${job.title}". Please select another worker from your applicants.`
            });
          } catch (smsError) {
            console.error('Failed to send SMS to client:', smsError);
          }
        }
      } catch (error) {
        console.error('Error notifying client of decline:', error);
      }

      return {
        success: true,
        message: 'You declined the job. The client has been notified.',
        reason
      };
    } catch (error) {
      console.error('Error declining job selection:', error);
      throw error;
    }
  }
}
