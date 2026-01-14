import { databases, DATABASE_ID, COLLECTIONS } from './appwrite';
import { Query } from 'appwrite';
import { notificationService } from './notification-service';
import { TermiiSMSService } from './termii-sms.service';
import { WalletService } from './wallet.service';

export class WorkerUnpickService {
  /**
   * Check if client can unpick worker (within 1-hour window and worker hasn't accepted)
   */
  static canClientUnpick(application: any): { canUnpick: boolean; reason?: string } {
    // Check if application is in selected status
    if (application.status !== 'selected') {
      return {
        canUnpick: false,
        reason: 'Worker is not currently selected for this job'
      };
    }

    // Check if worker already accepted
    if (application.acceptedAt) {
      return {
        canUnpick: false,
        reason: 'Worker has already accepted the job. Contact support to cancel.'
      };
    }

    // Check if already unpicked
    if (application.unpickedAt) {
      return {
        canUnpick: false,
        reason: 'Worker has already been unpicked'
      };
    }

    // Check 1-hour window from selectedAt
    const selectionTime = new Date(application.selectedAt).getTime();
    const now = Date.now();
    const oneHourInMs = 60 * 60 * 1000;

    if (now - selectionTime >= oneHourInMs) {
      return {
        canUnpick: false,
        reason: 'The 1-hour unpick window has expired'
      };
    }

    return { canUnpick: true };
  }

  /**
   * Calculate time remaining in unpick window
   */
  static calculateTimeRemaining(selectedAt: string): number {
    const selectionTime = new Date(selectedAt).getTime();
    const now = Date.now();
    const oneHourInMs = 60 * 60 * 1000;
    const elapsed = now - selectionTime;

    return Math.max(0, oneHourInMs - elapsed);
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
   * Refund escrow funds back to client wallet
   */
  static async refundEscrowToWallet(clientId: string, bookingId: string, amount: number) {
    try {
      // Release escrow funds back to client's available balance
      await WalletService.releaseEscrow({
        clientId,
        bookingId,
        amountInNaira: amount
      });

      console.log(`✅ Refunded ₦${amount} escrow to client ${clientId} wallet`);

      return { success: true };
    } catch (error) {
      console.error('Error refunding escrow to wallet:', error);
      throw error;
    }
  }

  /**
   * Main unpick worker function
   */
  static async unpickWorker(jobId: string, clientId: string, reason?: string) {
    try {
      // 1. Get job
      const job = await databases.getDocument(DATABASE_ID, COLLECTIONS.JOBS, jobId);

      // 2. Validate client owns this job
      if (job.clientId !== clientId) {
        throw new Error('Unauthorized: You do not own this job');
      }

      // 3. Validate job is in assigned status
      if (job.status !== 'assigned') {
        return {
          success: false,
          message: 'Job is not in assigned status'
        };
      }

      // 4. Get the selected application
      const applications = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        [
          Query.equal('jobId', jobId),
          Query.equal('status', 'selected'),
          Query.limit(1)
        ]
      );

      if (applications.documents.length === 0) {
        return {
          success: false,
          message: 'No selected worker found for this job'
        };
      }

      const application = applications.documents[0];

      // 5. Check if unpick is allowed
      const unpickCheck = this.canClientUnpick(application);
      if (!unpickCheck.canUnpick) {
        return {
          success: false,
          message: unpickCheck.reason
        };
      }

      // 6. Get booking to find escrow amount
      let booking = null;
      if (job.bookingId) {
        try {
          booking = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.BOOKINGS,
            job.bookingId
          );
        } catch (error) {
          console.error('Error fetching booking:', error);
        }
      }

      // 7. Refund escrow to client wallet
      if (booking && booking.budgetAmount) {
        await this.refundEscrowToWallet(clientId, job.bookingId, booking.budgetAmount);
      }

      // 8. Update application status to 'unpicked'
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        application.$id,
        {
          status: 'unpicked',
          unpickedAt: new Date().toISOString()
        }
      );

      // 9. Update job back to 'open' status
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId,
        {
          status: 'open',
          assignedWorkerId: null,
          assignedAt: null,
          bookingId: null
        }
      );

      // 10. Delete the booking (since it's no longer valid)
      if (job.bookingId) {
        try {
          await databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.BOOKINGS,
            job.bookingId
          );
          console.log(`✅ Deleted booking ${job.bookingId}`);
        } catch (error) {
          console.error('Error deleting booking:', error);
        }
      }

      // 11. Get worker details for notifications
      const worker = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.WORKERS,
        application.workerId
      );

      const workerUser = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        worker.userId
      );

      const workerName = worker.displayName || workerUser.name || 'Worker';

      // 12. Send notification to worker (in-app + SMS)
      try {
        await notificationService.createNotification({
          userId: worker.userId,
          title: 'Client unpicked you from job',
          message: `The client decided to unpick you from "${job.title}". You can reapply if interested. Payment was refunded to client.`,
          type: 'warning',
          jobId: jobId,
          actionUrl: `/worker/jobs?id=${jobId}`,
          idempotencyKey: `worker_unpicked_${jobId}_${worker.userId}`
        });

        // Send SMS to worker
        if (workerUser.phone) {
          try {
            await TermiiSMSService.sendSMS({
              to: workerUser.phone,
              message: `ErrandWork: Client unpicked you from "${job.title}". You may reapply if interested.`
            });
          } catch (smsError) {
            console.error('Failed to send SMS to worker:', smsError);
          }
        }
      } catch (error) {
        console.error('Error notifying worker of unpick:', error);
      }

      // 13. Send confirmation notification to client
      try {
        await notificationService.createNotification({
          userId: clientId,
          title: 'Worker unpicked successfully',
          message: `You unpicked ${workerName} from "${job.title}". Your job is now open for new applications. Funds have been refunded to your wallet.`,
          type: 'info',
          jobId: jobId,
          actionUrl: `/client/jobs?id=${jobId}`,
          idempotencyKey: `client_unpicked_worker_${jobId}_${clientId}`
        });
      } catch (error) {
        console.error('Error notifying client:', error);
      }

      return {
        success: true,
        message: 'Worker unpicked successfully. Job reopened and funds refunded to your wallet.',
        refundedAmount: booking?.budgetAmount || 0,
        workerName
      };
    } catch (error) {
      console.error('Error unpicking worker:', error);
      throw error;
    }
  }

  /**
   * Get unpick status for a job
   */
  static async getUnpickStatus(jobId: string, clientId: string) {
    try {
      const job = await databases.getDocument(DATABASE_ID, COLLECTIONS.JOBS, jobId);

      // Validate ownership
      if (job.clientId !== clientId) {
        throw new Error('Unauthorized');
      }

      if (job.status !== 'assigned') {
        return {
          canUnpick: false,
          reason: 'Job is not in assigned status'
        };
      }

      // Get selected application
      const applications = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        [
          Query.equal('jobId', jobId),
          Query.equal('status', 'selected'),
          Query.limit(1)
        ]
      );

      if (applications.documents.length === 0) {
        return {
          canUnpick: false,
          reason: 'No selected worker found'
        };
      }

      const application = applications.documents[0];
      const unpickCheck = this.canClientUnpick(application);

      if (!unpickCheck.canUnpick) {
        return unpickCheck;
      }

      const timeRemaining = this.calculateTimeRemaining(application.selectedAt);

      return {
        canUnpick: true,
        timeRemaining,
        timeRemainingFormatted: this.formatTimeRemaining(timeRemaining),
        selectedAt: application.selectedAt,
        applicationId: application.$id
      };
    } catch (error) {
      console.error('Error getting unpick status:', error);
      throw error;
    }
  }
}
