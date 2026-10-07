import { databases, storage, COLLECTIONS, DATABASE_ID, STORAGE_BUCKET_ID } from './api';
import { ID, Query, Permission, Role } from '@/lib/api';
import { Job, JobFormData, JobWithDetails } from './types';
import { JOB_EXPIRY_HOURS, JOB_STATUS } from './constants';
import { generateUniqueSlug } from './slug-utils';
import { ApiService } from './api';

/**
 * Job Posting Service
 * Handles all job posting operations using VPS API
 */
export class JobPostingService {
  /**
   * Upload job attachments to VPS API
   */
  static async uploadJobAttachments(files: File[]): Promise<string[]> {
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${ApiService.API_BASE_URL}/upload`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload file');
        }
        
        const data = await response.json();
        return data.url;
      });

      const urls = await Promise.all(uploadPromises);
      return urls;
    } catch (error) {
      console.error('Error uploading job attachments:', error);
      throw new Error('Failed to upload attachments');
    }
  }

  /**
   * Create a new job posting using VPS API
   * @param clientId - The client creating the job
   * @param formData - The job form data
   */
  static async createJob(clientId: string, formData: JobFormData & { attachmentUrls?: string[] }): Promise<Job> {
    try {
      // Use pre-uploaded URLs if available (client-side upload), otherwise try uploading
      let attachmentUrls: string[] = formData.attachmentUrls || [];
      if (attachmentUrls.length === 0 && formData.attachments && formData.attachments.length > 0) {
        attachmentUrls = await this.uploadJobAttachments(formData.attachments);
      }

      // Calculate expiry date (72 hours from now by default)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + JOB_EXPIRY_HOURS);

      // Generate unique job ID first (needed for slug)
      const jobId = ID.unique();

      // Generate slug exactly like the mobile app does
      const slug = `${formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${jobId.slice(-6)}`;

      // Convert scheduledDate to ISO format (matches mobile version)
      let scheduledDateISO: string;
      if (formData.scheduledDate && formData.scheduledDate.trim()) {
        const dateStr = formData.scheduledDate.trim();
        const timeStr = formData.scheduledTime?.trim() || '09:00';
        try {
          const dateObj = new Date(`${dateStr}T${timeStr}:00`);
          scheduledDateISO = !isNaN(dateObj.getTime()) ? dateObj.toISOString() : new Date().toISOString();
        } catch {
          scheduledDateISO = new Date().toISOString();
        }
      } else {
        scheduledDateISO = new Date().toISOString();
      }

      const jobData = {
        $id: jobId,
        clientId,
        title: formData.title,
        description: formData.description,
        categoryId: formData.categoryId,
        budgetType: 'fixed',
        budgetMin: formData.budgetMin || formData.budgetMax,
        budgetMax: formData.budgetMax,
        locationAddress: formData.locationAddress || 'Not specified',
        scheduledDate: scheduledDateISO,
        scheduledTime: formData.scheduledTime || '09:00',
        duration: formData.duration,
        skillsRequired: formData.skillsRequired || [],
        attachments: attachmentUrls,
        status: JOB_STATUS.OPEN,
        assignedWorkerId: null,
        expiresAt: expiresAt.toISOString(),
        viewCount: 0,
        requiresFunding: false,
        applicantCount: 0,
        slug,
        latitude: formData.locationLat,
        longitude: formData.locationLng,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const response = await ApiService.request<Job>('/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData),
      });

      return response;
    } catch (error) {
      console.error('Error creating job:', error);
      throw new Error('Failed to create job posting');
    }
  }

  /**
   * Get all jobs posted by a client using VPS API
   */
  static async getClientJobs(clientId: string, status?: string): Promise<Job[]> {
    try {
      const query = status ? `?filter_clientId=${clientId}&filter_status=${status}` : `?filter_clientId=${clientId}`;
      const response = await ApiService.request<Job[]>(`/jobs${query}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching client jobs:', error);
      throw new Error('Failed to fetch jobs');
    }
  }

  /**
   * Get a single job by ID using VPS API
   */
  static async getJobById(jobId: string): Promise<Job> {
    try {
      const response = await ApiService.request<Job>(`/jobs/${jobId}`);
      return response;
    } catch (error) {
      console.error('Error fetching job:', error);
      throw new Error('Job not found');
    }
  }

  /**
   * Get job with client details using VPS API
   */
  static async getJobWithDetails(jobId: string): Promise<JobWithDetails> {
    try {
      const job = await this.getJobById(jobId);

      // Fetch client details using VPS API
      const client = await ApiService.request<any>(`/users/${job.clientId}`);

      // Fetch category details using VPS API
      const category = await ApiService.request<any>(`/categories/${job.categoryId}`);

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
   * Update a job (only if status is 'open') using VPS API
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

      const response = await ApiService.request<Job>(`/jobs/${jobId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      return response;
    } catch (error) {
      console.error('Error updating job:', error);
      throw new Error('Failed to update job');
    }
  }

  /**
   * Cancel a job and notify all applicants using VPS API
   * @param jobId - Job ID to cancel
   * @param clientId - Client ID (for authorization)
   * @param reason - Optional cancellation reason
   */
  static async cancelJob(
    jobId: string,
    clientId: string,
    reason?: string
  ): Promise<Job> {
    try {
      // 1. Get job details
      const job = await ApiService.request<Job>(`/jobs/${jobId}`);

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
          await ApiService.request(`/bookings/${job.bookingId}`, {
            method: 'PUT',
            body: JSON.stringify({
              status: 'cancelled',
              paymentStatus: 'refunded',
            }),
          });
        } catch (bookingError) {
          console.error('Error updating booking:', bookingError);
        }
      }

      // 5. Update job status to cancelled
      const response = await ApiService.request<Job>(`/jobs/${jobId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: JOB_STATUS.CANCELLED,
        }),
      });

      // 6. Reject all pending applications
      const { JobApplicationService } = await import('./job-application.service');
      try {
        await JobApplicationService.rejectPendingApplications(jobId);
      } catch (appError) {
        console.error('Error rejecting applications:', appError);
      }

      // 7. Notify all applicants about cancellation
      try {
        const applications = await ApiService.request<any[]>(`/job-applications?filter_jobId=${jobId}`);

        const { notificationService } = await import('./notification-service');

        for (const app of applications) {
          try {
            const worker = await ApiService.request<any>(`/workers/${app.workerId}`);

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

      return response;
    } catch (error) {
      console.error('Error cancelling job:', error);
      throw error;
    }
  }

  /**
   * Get job statistics for a client using VPS API
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
   * Increment job view count using VPS API
   */
  static async incrementViewCount(jobId: string): Promise<void> {
    try {
      const job = await this.getJobById(jobId);

      await ApiService.request(`/jobs/${jobId}`, {
        method: 'PUT',
        body: JSON.stringify({
          viewCount: (job.viewCount || 0) + 1,
        }),
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
      // Don't throw error for view count increment failures
    }
  }

  /**
   * Get recently posted jobs (for homepage/dashboard) using VPS API
   */
  static async getRecentJobs(limit: number = 10): Promise<Job[]> {
    try {
      const response = await ApiService.request<Job[]>(`/jobs?filter_status=open&limit=${limit}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching recent jobs:', error);
      return [];
    }
  }
}
