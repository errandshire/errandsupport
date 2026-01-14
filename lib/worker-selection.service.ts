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
   * @param dbClient - Optional database client (use serverDatabases for server-side calls)
   * @returns Booking ID
   */
  static async selectWorkerForJob(
    jobId: string,
    applicationId: string,
    clientId: string,
    dbClient?: any
  ): Promise<string> {
    const db = dbClient || databases; // Use provided client or default to client-side

    try {
      // 1. Get job details
      const job = await db.getDocument(
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
      const application = await db.getDocument(
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
      const worker = await db.getDocument(
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

      // 9. Check client wallet balance - Query directly like /api/jobs/apply does
      console.log('💰 Fetching wallet for clientId:', clientId);

      const wallets = await db.listDocuments(
        DATABASE_ID,
        COLLECTIONS.VIRTUAL_WALLETS,
        [Query.equal('userId', clientId)]
      );

      console.log('💰 Wallet query result:', {
        clientId,
        foundWallets: wallets.documents.length,
        wallets: wallets.documents
      });

      if (wallets.documents.length === 0) {
        throw new Error('Wallet not found. Please add funds to your wallet first.');
      }

      const clientWallet = wallets.documents[0];

      // Ensure balance and escrow are numbers, default to 0 if undefined/null
      const walletBalance = Number(clientWallet.balance) || 0;
      const walletEscrow = Number(clientWallet.escrow) || 0;
      const availableBalance = walletBalance - walletEscrow;

      console.log('💰 Wallet balance check:', {
        clientId,
        walletId: clientWallet.$id,
        rawBalance: clientWallet.balance,
        rawEscrow: clientWallet.escrow,
        walletBalance,
        walletEscrow,
        availableBalance,
        requiredAmount: job.budgetMax
      });

      if (availableBalance < job.budgetMax) {
        throw new Error(
          `Insufficient funds. You need ₦${job.budgetMax.toLocaleString()} but have ₦${availableBalance.toLocaleString()} available`
        );
      }

      // 10. Create booking
      const bookingData = {
        clientId: job.clientId,
        workerId: worker.$id,
        serviceId: job.categoryId,
        categoryId: job.categoryId,
        workerUserId: worker.userId,
        scheduledDate: job.scheduledDate,
        scheduledTime: job.scheduledTime,
        duration: job.duration,
        totalAmount: job.budgetMax,
        status: 'confirmed' as const,
        paymentStatus: 'held' as const,
        jobId: job.$id,
        notes: job.description,
      };

      const booking = await db.createDocument(
        DATABASE_ID,
        COLLECTIONS.BOOKINGS,
        ID.unique(),
        bookingData
      );

      // 11. Hold funds in escrow
      try {
        // Create hold transaction
        const transactionId = `hold_${booking.$id}`;

        console.log('💳 Creating escrow hold transaction:', {
          transactionId,
          clientId,
          bookingId: booking.$id,
          amount: job.budgetMax
        });

        try {
          await db.createDocument(
            DATABASE_ID,
            COLLECTIONS.WALLET_TRANSACTIONS,
            transactionId,
            {
              userId: clientId,
              type: 'booking_hold',
              amount: job.budgetMax,
              bookingId: booking.$id,
              reference: transactionId,
              status: 'completed',
              description: `Payment held for booking #${booking.$id}`,
              createdAt: new Date().toISOString()
            }
          );
          console.log('✅ Transaction created');
        } catch (transError: any) {
          if (transError.code === 409 || transError.message?.includes('already exists')) {
            console.log(`⚠️ Transaction ${transactionId} already exists`);
            // Transaction already exists, continue
          } else {
            throw transError;
          }
        }

        // Update wallet - move from balance to escrow
        console.log('💰 Moving funds to escrow...');
        await db.updateDocument(
          DATABASE_ID,
          COLLECTIONS.VIRTUAL_WALLETS,
          clientWallet.$id,
          {
            balance: walletBalance - job.budgetMax,
            escrow: walletEscrow + job.budgetMax,
            totalSpent: (clientWallet.totalSpent || 0) + job.budgetMax,
            updatedAt: new Date().toISOString()
          }
        );
        console.log('✅ Funds moved to escrow');

      } catch (escrowError) {
        // Rollback booking if escrow fails
        console.error('❌ Escrow failed, rolling back booking:', escrowError);
        await db.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.BOOKINGS,
          booking.$id
        );
        throw new Error('Failed to hold funds in escrow. Please try again.');
      }

      // 12. Update job status
      await db.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId,
        {
          status: 'assigned',
          assignedWorkerId: worker.$id,
          assignedAt: new Date().toISOString(),
          bookingId: booking.$id,
        }
      );

      // 13. Update selected application and link to booking
      await db.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        applicationId,
        {
          status: 'selected',
          selectedAt: new Date().toISOString(),
          bookingId: booking.$id // Link booking to application for unified acceptance
        }
      );

      // 14. Reject all other pending applications
      await JobApplicationService.rejectPendingApplications(jobId, applicationId, db);

      // 15. Send notification to selected worker (in-app + SMS)
      try {
        const workerName = worker.displayName || worker.name || 'Worker';

        // In-app notification
        await notificationService.createNotification({
          userId: worker.userId,
          title: '🎉 You were selected!',
          message: `Great news! The client selected you for "${job.title}". Payment is secured in escrow. Please accept within 1 hour.`,
          type: 'success',
          bookingId: booking.$id,
          actionUrl: `/worker/bookings?id=${booking.$id}`,
          idempotencyKey: `worker_selected_${jobId}_${worker.userId}`,
        });

        // SMS notification
        if (workerUser.phone) {
          try {
            const { TermiiSMSService } = await import('@/lib/termii-sms.service');
            await TermiiSMSService.sendSMS({
              to: workerUser.phone,
              message: `ErrandWork: You were selected for "${job.title}"! Budget: ₦${job.budgetMax.toLocaleString()}. Accept within 1 hour: ${process.env.NEXT_PUBLIC_BASE_URL}/worker/bookings/${booking.$id}`
            });
            console.log(`✅ SMS sent to worker ${worker.userId}`);
          } catch (smsError) {
            console.error('Failed to send SMS to selected worker:', smsError);
          }
        }
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
        const rejectedApplications = await db.listDocuments(
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
            const rejWorker = await db.getDocument(
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
