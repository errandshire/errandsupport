import { databases, storage, COLLECTIONS, DATABASE_ID, STORAGE_BUCKET_ID } from './appwrite';
import { ID, Query, Permission, Role } from 'appwrite';
import { Job, JobFormData, JobWithDetails } from './types';
import { JOB_EXPIRY_HOURS, JOB_STATUS } from './constants';

/**
 * Job Posting Service
 * Handles all job posting operations using Appwrite SDK
 */
export class JobPostingService {
  /**
   * Upload job attachments to Appwrite Storage
   */
  static async uploadJobAttachments(files: File[]): Promise<string[]> {
    try {
      const uploadPromises = files.map(async (file) => {
        const fileId = ID.unique();
        await storage.createFile(STORAGE_BUCKET_ID, fileId, file);

        // Return the file URL
        const fileUrl = storage.getFileView(STORAGE_BUCKET_ID, fileId);
        return fileUrl.toString();
      });

      const urls = await Promise.all(uploadPromises);
      return urls;
    } catch (error) {
      console.error('Error uploading job attachments:', error);
      throw new Error('Failed to upload attachments');
    }
  }

  /**
   * Create a new job posting
   */
  static async createJob(clientId: string, formData: JobFormData): Promise<Job> {
    try {
      // Upload attachments if any
      let attachmentUrls: string[] = [];
      if (formData.attachments && formData.attachments.length > 0) {
        attachmentUrls = await this.uploadJobAttachments(formData.attachments);
      }

      // Calculate expiry date (72 hours from now by default)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + JOB_EXPIRY_HOURS);

      // Create job document
      const jobData = {
        clientId,
        title: formData.title,
        description: formData.description,
        categoryId: formData.categoryId,
        budgetType: formData.budgetType,
        budgetMin: formData.budgetMin,
        budgetMax: formData.budgetMax,
        locationAddress: formData.locationAddress,
        locationLat: formData.locationLat,
        locationLng: formData.locationLng,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        duration: formData.duration,
        skillsRequired: formData.skillsRequired || [],
        attachments: attachmentUrls,
        status: JOB_STATUS.OPEN,
        assignedWorkerId: null,
        assignedAt: null,
        bookingId: null,
        expiresAt: expiresAt.toISOString(),
        viewCount: 0,
        requiresFunding: false, // Will be set to true when first worker applies
        applicantCount: 0, // Incremented when workers apply
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        ID.unique(),
        jobData,
        [
          // Client (owner) has full access
          Permission.read(Role.user(clientId)),
          Permission.update(Role.user(clientId)),
          Permission.delete(Role.user(clientId)),
          // Any authenticated user can read (to browse jobs)
          Permission.read(Role.users()),
          // Any authenticated user can update (to increment applicant count)
          Permission.update(Role.users()),
        ]
      );

      return response as unknown as Job;
    } catch (error) {
      console.error('Error creating job:', error);
      throw new Error('Failed to create job posting');
    }
  }

  /**
   * Get all jobs posted by a client
   */
  static async getClientJobs(clientId: string, status?: string): Promise<Job[]> {
    try {
      const queries = [
        Query.equal('clientId', clientId),
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ];

      if (status) {
        queries.push(Query.equal('status', status));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        queries
      );

      return response.documents as unknown as Job[];
    } catch (error) {
      console.error('Error fetching client jobs:', error);
      throw new Error('Failed to fetch jobs');
    }
  }

  /**
   * Get a single job by ID
   */
  static async getJobById(jobId: string): Promise<Job> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId
      );

      return response as unknown as Job;
    } catch (error) {
      console.error('Error fetching job:', error);
      throw new Error('Job not found');
    }
  }

  /**
   * Get job with client details
   */
  static async getJobWithDetails(jobId: string): Promise<JobWithDetails> {
    try {
      const job = await this.getJobById(jobId);

      // Fetch client details
      const client = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        job.clientId
      );

      // Fetch category details
      const category = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.CATEGORIES,
        job.categoryId
      );

      return {
        ...job,
        clientName: client.name,
        clientEmail: client.email,
        clientRating: client.rating || 0,
        categoryName: category.name,
      } as JobWithDetails;
    } catch (error) {
      console.error('Error fetching job with details:', error);
      throw new Error('Failed to fetch job details');
    }
  }

  /**
   * Update a job (only if status is 'open')
   */
  static async updateJob(jobId: string, updates: Partial<JobFormData>): Promise<Job> {
    try {
      // First check if job is still open
      const job = await this.getJobById(jobId);

      if (job.status !== JOB_STATUS.OPEN) {
        throw new Error('Cannot update job that is no longer open');
      }

      // Upload new attachments if provided
      let attachmentUrls = job.attachments || [];
      if (updates.attachments && updates.attachments.length > 0) {
        const newUrls = await this.uploadJobAttachments(updates.attachments);
        attachmentUrls = [...attachmentUrls, ...newUrls];
      }

      const updateData: any = {
        ...updates,
        attachments: attachmentUrls,
        updatedAt: new Date().toISOString(),
      };

      // Remove the attachments field if it was a File array
      if (updates.attachments) {
        delete updateData.attachments;
        updateData.attachments = attachmentUrls;
      }

      const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId,
        updateData
      );

      return response as unknown as Job;
    } catch (error) {
      console.error('Error updating job:', error);
      throw new Error('Failed to update job');
    }
  }

  /**
   * Cancel a job and notify all applicants
   * @param jobId - Job ID to cancel
   * @param clientId - Client ID (for authorization)
   * @param reason - Optional cancellation reason
   * @param dbClient - Optional database client (use serverDatabases for server-side calls)
   */
  static async cancelJob(
    jobId: string,
    clientId: string,
    reason?: string,
    dbClient?: any
  ): Promise<Job> {
    const db = dbClient || databases;

    try {
      // 1. Get job details
      const job = await db.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId
      );

      // 2. Verify the client owns this job
      if (job.clientId !== clientId) {
        throw new Error('Unauthorized to cancel this job');
      }

      // 3. Check if job can be cancelled
      if (job.status === JOB_STATUS.CANCELLED) {
        throw new Error('Job is already cancelled');
      }

      if (job.status === JOB_STATUS.COMPLETED) {
        throw new Error('Cannot cancel a completed job');
      }

      // 4. If job is assigned, we need to handle escrow refund
      if (job.status === JOB_STATUS.ASSIGNED && job.bookingId) {
        // Import wallet service dynamically to avoid circular dependencies
        const { WalletService } = await import('./wallet.service');

        try {
          // Release escrow back to client
          await WalletService.releaseEscrow(job.bookingId, 'refund');
        } catch (escrowError) {
          console.error('Error releasing escrow:', escrowError);
          // Continue with cancellation even if escrow release fails
          // Admin can manually handle this
        }

        // Update booking status to cancelled
        try {
          await db.updateDocument(
            DATABASE_ID,
            COLLECTIONS.BOOKINGS,
            job.bookingId,
            {
              status: 'cancelled',
              paymentStatus: 'refunded',
            }
          );
        } catch (bookingError) {
          console.error('Error updating booking:', bookingError);
        }
      }

      // 5. Update job status to cancelled
      const response = await db.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId,
        {
          status: JOB_STATUS.CANCELLED,
        }
      );

      // 6. Reject all pending applications
      const { JobApplicationService } = await import('./job-application.service');
      try {
        await JobApplicationService.rejectPendingApplications(jobId, undefined, db);
      } catch (appError) {
        console.error('Error rejecting applications:', appError);
      }

      // 7. Notify all applicants about cancellation
      try {
        const applications = await db.listDocuments(
          DATABASE_ID,
          COLLECTIONS.JOB_APPLICATIONS,
          [
            Query.equal('jobId', jobId),
            Query.limit(100)
          ]
        );

        const { notificationService } = await import('./notification-service');

        for (const app of applications.documents) {
          try {
            const worker = await db.getDocument(
              DATABASE_ID,
              COLLECTIONS.WORKERS,
              app.workerId
            );

            await notificationService.createNotification({
              userId: worker.userId,
              title: 'Job Cancelled',
              message: `The job "${job.title}" has been cancelled by the client${reason ? `: ${reason}` : '.'}`,
              type: 'info',
              jobId: jobId,
              actionUrl: '/worker/jobs',
              idempotencyKey: `job_cancelled_${jobId}_${worker.userId}`,
            });
          } catch (notifError) {
            console.error(`Failed to notify worker ${app.workerId}:`, notifError);
          }
        }
      } catch (notificationError) {
        console.error('Error sending cancellation notifications:', notificationError);
        // Don't fail the cancellation if notifications fail
      }

      return response as unknown as Job;
    } catch (error) {
      console.error('Error cancelling job:', error);
      throw error;
    }
  }

  /**
   * Get job statistics for a client
   */
  static async getJobStats(clientId: string): Promise<{
    total: number;
    open: number;
    assigned: number;
    completed: number;
    cancelled: number;
    expired: number;
  }> {
    try {
      const allJobs = await this.getClientJobs(clientId);

      return {
        total: allJobs.length,
        open: allJobs.filter(j => j.status === JOB_STATUS.OPEN).length,
        assigned: allJobs.filter(j => j.status === JOB_STATUS.ASSIGNED).length,
        completed: allJobs.filter(j => j.status === JOB_STATUS.COMPLETED).length,
        cancelled: allJobs.filter(j => j.status === JOB_STATUS.CANCELLED).length,
        expired: allJobs.filter(j => j.status === JOB_STATUS.EXPIRED).length,
      };
    } catch (error) {
      console.error('Error getting job stats:', error);
      return {
        total: 0,
        open: 0,
        assigned: 0,
        completed: 0,
        cancelled: 0,
        expired: 0,
      };
    }
  }

  /**
   * Increment job view count
   */
  static async incrementViewCount(jobId: string): Promise<void> {
    try {
      const job = await this.getJobById(jobId);

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId,
        {
          viewCount: (job.viewCount || 0) + 1,
        }
      );
    } catch (error) {
      console.error('Error incrementing view count:', error);
      // Don't throw error for view count increment failures
    }
  }

  /**
   * Get recently posted jobs (for homepage/dashboard)
   */
  static async getRecentJobs(limit: number = 10): Promise<Job[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        [
          Query.equal('status', JOB_STATUS.OPEN),
          Query.orderDesc('$createdAt'),
          Query.limit(limit)
        ]
      );

      return response.documents as unknown as Job[];
    } catch (error) {
      console.error('Error fetching recent jobs:', error);
      return [];
    }
  }
}
