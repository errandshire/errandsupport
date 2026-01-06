import { databases, storage, COLLECTIONS, DATABASE_ID, STORAGE_BUCKET_ID } from './appwrite';
import { ID, Query } from 'appwrite';
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
        jobData
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
   * Cancel a job
   */
  static async cancelJob(jobId: string, clientId: string, reason?: string): Promise<Job> {
    try {
      const job = await this.getJobById(jobId);

      // Verify the client owns this job
      if (job.clientId !== clientId) {
        throw new Error('Unauthorized to cancel this job');
      }

      // Update job status to cancelled
      const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId,
        {
          status: JOB_STATUS.CANCELLED,
          updatedAt: new Date().toISOString(),
        }
      );

      return response as unknown as Job;
    } catch (error) {
      console.error('Error cancelling job:', error);
      throw new Error('Failed to cancel job');
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
