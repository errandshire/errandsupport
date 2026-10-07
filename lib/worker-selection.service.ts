import { DATABASE_ID, COLLECTIONS, ID } from './api';
import { JobApplicationService } from './job-application.service';
import { WalletService } from './wallet.service';
import { JobNotificationService } from './job-notification.service';
import { notificationService } from './notification-service';
import { ApiService } from './api';

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
   * Client selects a worker for their job using VPS API
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
      // 1. Get job details using VPS API
      const job = await ApiService.request<any>(`/jobs/${jobId}`);

      // 2. Validate job belongs to client
      if (job.clientId !== clientId) {
        throw new Error('Unauthorized: This job does not belong to you');
      }

      // 3. Validate job is still open
      if (job.status !== 'open') {
        throw new Error('This job is no longer available for selection');
      }

      // 4. Get application details using VPS API
      const application = await ApiService.request<any>(`/job-applications/${applicationId}`);

      // 5. Validate application is for this job
      if (application.jobId !== jobId) {
        throw new Error('Invalid application for this job');
      }

      // 6. Validate application is still pending
      if (application.status !== 'pending') {
        throw new Error('This application is no longer available');
      }

      // 7. Get worker details using VPS API
      const worker = await ApiService.request<any>(`/workers/${application.workerId}`);

      // 8. Validate worker is still verified and active
      if (!worker.isVerified) {
        throw new Error('Worker is no longer verified');
      }

      if (!worker.isActive) {
        throw new Error('Worker is no longer active');
      }

      // 9. Check client wallet balance using VPS API
      console.log('💰 Fetching wallet for clientId:', clientId);
      const wallets = await ApiService.request<any[]>(`/virtual-wallets?filter_userId=${clientId}`);

      console.log('💰 Wallet query result:', {
        clientId,
        foundWallets: wallets?.length || 0,
        wallets: wallets
      });

      if (!wallets || wallets.length === 0) {
        throw new Error('Wallet not found. Please add funds to your wallet first.');
      }

      const clientWallet = wallets[0];

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

      // 10. Create booking using VPS API
      const bookingId = ID.unique();
      const bookingData = {
        $id: bookingId,
        clientId: job.clientId,
        workerId: worker.userId, // Fixed: Use worker.userId to match dashboard query
        serviceId: job.categoryId,
        categoryId: job.categoryId,
        title: job.title, // Add title so booking shows in dashboard
        description: job.description, // Add description for context
        locationAddress: job.locationAddress, // Add location
        locationLat: job.locationLat,
        locationLng: job.locationLng,
        scheduledDate: job.scheduledDate,
        scheduledTime: job.scheduledTime,
        duration: job.duration,
        totalAmount: job.budgetMax,
        budgetAmount: job.budgetMax, // Add for consistency with direct bookings
        status: 'confirmed' as const,
        paymentStatus: 'held' as const,
        jobId: job.$id,
        notes: job.description,
      };

      const booking = await ApiService.request<any>('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingData)
      });

      // 11. Hold funds in escrow using WalletService (now uses VPS API)
      try {
        await WalletService.holdFundsForBooking({
          clientId,
          bookingId: booking.$id,
          amountInNaira: job.budgetMax
        });
      } catch (escrowError) {
        // Rollback booking if escrow fails
        console.error('❌ Escrow failed, rolling back booking:', escrowError);
        await ApiService.request(`/bookings/${booking.$id}`, {
          method: 'DELETE'
        });
        throw new Error('Failed to hold funds in escrow. Please try again.');
      }

      // 12. Update job status using VPS API
      await ApiService.request(`/jobs/${jobId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'assigned',
          assignedWorkerId: worker.$id,
          assignedAt: new Date().toISOString(),
          bookingId: booking.$id,
        })
      });

      // 13. Update selected application and link to booking using VPS API
      await ApiService.request(`/job-applications/${applicationId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'selected',
          selectedAt: new Date().toISOString(),
          bookingId: booking.$id // Link booking to application for unified acceptance
        })
      });

      // 14. Reject all other pending applications (now uses VPS API)
      await JobApplicationService.rejectPendingApplications(jobId, applicationId);

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
          actionUrl: `/worker/dashboard?booking=${booking.$id}`,
          idempotencyKey: `worker_selected_${jobId}_${worker.userId}`,
        });

        // SMS notification - fetch user document to get phone number using VPS API
        try {
          const workerUser = await ApiService.request<any>(`/users/${worker.userId}`);

          if (workerUser.phone) {
            const { TermiiSMSService } = await import('@/lib/termii-sms.service');
            await TermiiSMSService.sendSMS({
              to: workerUser.phone,
              message: `ErrandWork: You were selected for "${job.title}"! Budget: ₦${job.budgetMax.toLocaleString()}. Accept within 1 hour: ${process.env.NEXT_PUBLIC_BASE_URL}/worker/dashboard?booking=${booking.$id}`
            });
            console.log(`✅ SMS sent to worker ${worker.userId}`);
          }
        } catch (smsError) {
          console.error('Failed to send SMS to selected worker:', smsError);
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

      // 17. Notify rejected workers using VPS API
      try {
        const rejectedApplications = await ApiService.request<any[]>(
          `/job-applications?filter_jobId=${jobId}&filter_status=rejected&limit=100`
        );

        for (const app of rejectedApplications) {
          try {
            const rejWorker = await ApiService.request<any>(`/workers/${app.workerId}`);

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
   * Get worker details for selection preview using VPS API
   *
   * @param workerId - ID of the worker
   * @returns Worker profile with relevant details
   */
  static async getWorkerForSelection(workerId: string): Promise<any> {
    try {
      const worker = await ApiService.request<any>(`/workers/${workerId}`);

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
