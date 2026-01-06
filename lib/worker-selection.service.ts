import { databases, DATABASE_ID, COLLECTIONS } from './appwrite';
import { ID, Query } from 'appwrite';
import { JobApplicationService } from './job-application.service';
import { WalletService } from './wallet.service';
import { JobNotificationService } from './job-notification.service';
import { notificationService } from './notification-service';

/**
 * Worker Selection Service
 *
 * Handles client selecting a worker from job applications
 * - Validates client has sufficient funds
 * - Creates booking
 * - Moves funds to escrow
 * - Updates job and application statuses
 * - Sends notifications
 */
export class WorkerSelectionService {
  /**
   * Client selects a worker for their job
   *
   * @param jobId - ID of the job
   * @param applicationId - ID of the application being selected
   * @param clientId - ID of the client (for validation)
   * @returns Booking ID
   */
  static async selectWorkerForJob(
    jobId: string,
    applicationId: string,
    clientId: string
  ): Promise<string> {
    try {
      // 1. Get job details
      const job = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId
      );

      // 2. Validate job belongs to client
      if (job.clientId !== clientId) {
        throw new Error('Unauthorized: This job does not belong to you');
      }

      // 3. Validate job is still open
      if (job.status !== 'open') {
        throw new Error('This job is no longer available for selection');
      }

      // 4. Get application details
      const application = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        applicationId
      );

      // 5. Validate application is for this job
      if (application.jobId !== jobId) {
        throw new Error('Invalid application for this job');
      }

      // 6. Validate application is still pending
      if (application.status !== 'pending') {
        throw new Error('This application is no longer available');
      }

      // 7. Get worker details
      const worker = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.WORKERS,
        application.workerId
      );

      // 8. Validate worker is still verified and active
      if (!worker.isVerified) {
        throw new Error('Worker is no longer verified');
      }

      if (!worker.isActive) {
        throw new Error('Worker is no longer active');
      }

      // 9. Check client wallet balance
      const clientWallet = await WalletService.getOrCreateWallet(clientId);
      const availableBalance = clientWallet.balance - clientWallet.escrow;

      if (availableBalance < job.budgetMax) {
        throw new Error(
          `Insufficient funds. You need ₦${job.budgetMax.toLocaleString()} but have ₦${availableBalance.toLocaleString()}`
        );
      }

      // 10. Create booking
      const bookingData = {
        clientId: job.clientId,
        workerId: worker.$id,
        serviceId: job.categoryId,
        workerUserId: worker.userId,
        scheduledDate: job.scheduledDate,
        scheduledTime: job.scheduledTime,
        duration: job.duration,
        location: job.locationAddress,
        locationLat: job.locationLat,
        locationLng: job.locationLng,
        amount: job.budgetMax,
        status: 'confirmed' as const,
        paymentStatus: 'held_in_escrow' as const,
        jobId: job.$id,
        notes: job.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const booking = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.BOOKINGS,
        ID.unique(),
        bookingData
      );

      // 11. Hold funds in escrow
      try {
        await WalletService.holdFundsForBooking({
          clientId,
          bookingId: booking.$id,
          amountInNaira: job.budgetMax,
        });
      } catch (escrowError) {
        // Rollback booking if escrow fails
        console.error('Escrow failed, rolling back booking:', escrowError);
        await databases.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.BOOKINGS,
          booking.$id
        );
        throw new Error('Failed to hold funds in escrow. Please try again.');
      }

      // 12. Update job status
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId,
        {
          status: 'assigned',
          assignedWorkerId: worker.$id,
          assignedAt: new Date().toISOString(),
          bookingId: booking.$id,
          updatedAt: new Date().toISOString(),
        }
      );

      // 13. Update selected application
      await JobApplicationService.updateApplicationStatus(
        applicationId,
        'selected',
        new Date().toISOString()
      );

      // 14. Reject all other pending applications
      await JobApplicationService.rejectPendingApplications(jobId, applicationId);

      // 15. Send notification to selected worker
      try {
        const workerName = worker.displayName || worker.name || 'Worker';
        await notificationService.createNotification({
          userId: worker.userId,
          title: '🎉 You were selected!',
          message: `Great news! The client selected you for "${job.title}". Payment is secured in escrow.`,
          type: 'success',
          bookingId: booking.$id,
          actionUrl: `/worker/bookings?id=${booking.$id}`,
          idempotencyKey: `worker_selected_${jobId}_${worker.userId}`,
        });
      } catch (notifError) {
        console.error('Failed to notify selected worker:', notifError);
      }

      // 16. Send notification to client
      try {
        await notificationService.createNotification({
          userId: clientId,
          title: 'Worker Selected!',
          message: `You selected ${worker.displayName || worker.name} for "${job.title}". Payment is in escrow.`,
          type: 'success',
          bookingId: booking.$id,
          actionUrl: `/client/bookings?id=${booking.$id}`,
          idempotencyKey: `client_selected_worker_${jobId}_${clientId}`,
        });
      } catch (notifError) {
        console.error('Failed to notify client:', notifError);
      }

      // 17. Notify rejected workers
      try {
        const rejectedApplications = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.JOB_APPLICATIONS,
          [
            Query.equal('jobId', jobId),
            Query.equal('status', 'rejected'),
            Query.limit(100)
          ]
        );

        for (const app of rejectedApplications.documents) {
          try {
            const rejWorker = await databases.getDocument(
              DATABASE_ID,
              COLLECTIONS.WORKERS,
              app.workerId
            );

            await notificationService.createNotification({
              userId: rejWorker.userId,
              title: 'Job Filled',
              message: `The job "${job.title}" has been filled by another worker.`,
              type: 'info',
              bookingId: jobId,
              actionUrl: '/worker/jobs',
              idempotencyKey: `job_filled_${jobId}_${rejWorker.userId}`,
            });
          } catch (error) {
            console.error(`Failed to notify rejected worker ${app.workerId}:`, error);
          }
        }
      } catch (error) {
        console.error('Failed to notify rejected workers:', error);
      }

      console.log(`✅ Worker ${worker.$id} selected for job ${jobId}, booking ${booking.$id} created`);
      return booking.$id;
    } catch (error) {
      console.error('Error selecting worker for job:', error);
      throw error;
    }
  }

  /**
   * Get worker details for selection preview
   *
   * @param workerId - ID of the worker
   * @returns Worker profile with relevant details
   */
  static async getWorkerForSelection(workerId: string): Promise<any> {
    try {
      const worker = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.WORKERS,
        workerId
      );

      return {
        id: worker.$id,
        userId: worker.userId,
        name: worker.displayName || worker.name,
        email: worker.email,
        phone: worker.phone,
        profileImage: worker.profileImage,
        bio: worker.bio,
        rating: worker.ratingAverage || 0,
        totalReviews: worker.totalReviews || 0,
        experienceYears: worker.experienceYears,
        categories: worker.categories || [],
        skills: worker.skills || [],
        completedJobs: worker.completedJobs || 0,
        isVerified: worker.isVerified,
        isActive: worker.isActive,
      };
    } catch (error) {
      console.error('Error fetching worker for selection:', error);
      throw new Error('Failed to fetch worker details');
    }
  }
}
