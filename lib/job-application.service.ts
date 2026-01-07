import { databases, DATABASE_ID, COLLECTIONS } from './appwrite';
import { ID, Query, Permission, Role } from 'appwrite';
import { JobApplication, JobApplicationWithDetails, JobApplicationStatus } from './types';

/**
 * Job Application Service
 *
 * Manages worker applications to jobs (show interest functionality)
 * - Workers apply to jobs instead of directly accepting
 * - Clients see applicant count and select workers after funding
 */
export class JobApplicationService {
  /**
   * Worker applies to a job (shows interest)
   *
   * @param jobId - ID of the job to apply to
   * @param workerId - ID of the worker applying
   * @param message - Optional message/pitch from worker
   * @param dbClient - Optional database client (use serverDatabases for server-side calls)
   * @returns The created application
   */
  static async applyToJob(
    jobId: string,
    workerId: string,
    message?: string,
    dbClient?: any
  ): Promise<JobApplication> {
    const db = dbClient || databases; // Use provided client or default to client-side

    try {
      console.log('📝 applyToJob called with:', { jobId, workerId, message });

      // 1. Check if worker already applied
      console.log('1️⃣ Checking for existing applications...');
      const existingApplications = await db.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        [
          Query.equal('jobId', jobId),
          Query.equal('workerId', workerId),
          Query.limit(1)
        ]
      );

      if (existingApplications.documents.length > 0) {
        throw new Error('You have already applied to this job');
      }

      // 2. Get job details to validate and get clientId
      console.log('2️⃣ Fetching job details for jobId:', jobId);
      const job = await db.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId
      );
      console.log('✅ Job fetched:', job.$id);

      // 3. Validate job is still open
      if (job.status !== 'open') {
        throw new Error('This job is no longer accepting applications');
      }

      // 4. Validate worker is verified and active
      console.log('4️⃣ Fetching worker details for workerId:', workerId);
      const worker = await db.getDocument(
        DATABASE_ID,
        COLLECTIONS.WORKERS,
        workerId
      );
      console.log('✅ Worker fetched:', worker.$id);

      if (!worker.isVerified) {
        throw new Error('You must be verified to apply to jobs');
      }

      if (!worker.isActive) {
        throw new Error('Your account must be active to apply to jobs');
      }

      // 5. Create application
      const applicationData = {
        jobId,
        workerId,
        clientId: job.clientId,
        status: 'pending' as JobApplicationStatus,
        message: message || '',
        appliedAt: new Date().toISOString(),
      };

      const application = await db.createDocument(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        ID.unique(),
        applicationData,
        [
          // Worker can read, update, and delete their own application
          Permission.read(Role.user(worker.userId)),
          Permission.update(Role.user(worker.userId)),
          Permission.delete(Role.user(worker.userId)),
          // Client can read the application
          Permission.read(Role.user(job.clientId)),
          // Client can update the application (to select/reject)
          Permission.update(Role.user(job.clientId)),
        ]
      );

      // 6. Increment applicant count on job (optimistic)
      const currentCount = job.applicantCount || 0;
      await db.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId,
        {
          applicantCount: currentCount + 1,
          requiresFunding: true, // Mark job as requiring funding to view applicants
        }
      );

      return application as unknown as JobApplication;
    } catch (error) {
      console.error('Error applying to job:', error);
      throw error;
    }
  }

  /**
   * Get all applications for a specific job
   *
   * @param jobId - ID of the job
   * @param includeWorkerDetails - Whether to fetch worker details
   * @returns List of applications
   */
  static async getApplicationsForJob(
    jobId: string,
    includeWorkerDetails: boolean = false
  ): Promise<JobApplication[] | JobApplicationWithDetails[]> {
    try {
      const applications = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        [
          Query.equal('jobId', jobId),
          Query.orderDesc('appliedAt'),
          Query.limit(100) // Max 100 applicants per job
        ]
      );

      if (!includeWorkerDetails) {
        return applications.documents as unknown as JobApplication[];
      }

      // Fetch worker details for each application
      const applicationsWithDetails = await Promise.all(
        applications.documents.map(async (app) => {
          try {
            const worker = await databases.getDocument(
              DATABASE_ID,
              COLLECTIONS.WORKERS,
              app.workerId
            );

            return {
              ...app,
              workerName: worker.displayName || worker.name || 'Unknown',
              workerEmail: worker.email || '',
              workerRating: worker.ratingAverage || 0,
              workerProfileImage: worker.profileImage,
              workerBio: worker.bio,
              workerExperienceYears: worker.experienceYears,
              workerCategories: worker.categories || [],
            } as JobApplicationWithDetails;
          } catch (error) {
            console.error(`Error fetching worker ${app.workerId}:`, error);
            return {
              ...app,
              workerName: 'Unknown',
              workerEmail: '',
              workerRating: 0,
            } as JobApplicationWithDetails;
          }
        })
      );

      return applicationsWithDetails;
    } catch (error) {
      console.error('Error getting applications for job:', error);
      throw error;
    }
  }

  /**
   * Get count of pending applications for a job
   *
   * @param jobId - ID of the job
   * @returns Number of pending applications
   */
  static async getApplicationCount(jobId: string): Promise<number> {
    try {
      const applications = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        [
          Query.equal('jobId', jobId),
          Query.equal('status', 'pending'),
        ]
      );

      return applications.total;
    } catch (error) {
      console.error('Error getting application count:', error);
      return 0;
    }
  }

  /**
   * Check if a worker has already applied to a job
   *
   * @param jobId - ID of the job
   * @param workerId - ID of the worker
   * @returns True if worker has applied
   */
  static async hasWorkerApplied(jobId: string, workerId: string): Promise<boolean> {
    try {
      const applications = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        [
          Query.equal('jobId', jobId),
          Query.equal('workerId', workerId),
          Query.limit(1)
        ]
      );

      return applications.documents.length > 0;
    } catch (error) {
      console.error('Error checking if worker applied:', error);
      return false;
    }
  }

  /**
   * Worker withdraws their application
   *
   * @param applicationId - ID of the application to withdraw
   * @param workerId - ID of the worker (for validation)
   */
  static async withdrawApplication(
    applicationId: string,
    workerId: string
  ): Promise<void> {
    try {
      // 1. Get application
      const application = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        applicationId
      );

      // 2. Validate worker owns this application
      if (application.workerId !== workerId) {
        throw new Error('You can only withdraw your own applications');
      }

      // 3. Validate application is still pending
      if (application.status !== 'pending') {
        throw new Error('You can only withdraw pending applications');
      }

      // 4. Update application status
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        applicationId,
        {
          status: 'withdrawn' as JobApplicationStatus,
        }
      );

      // 5. Decrement applicant count on job
      const job = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        application.jobId
      );

      const currentCount = job.applicantCount || 0;
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        application.jobId,
        {
          applicantCount: Math.max(0, currentCount - 1),
        }
      );
    } catch (error) {
      console.error('Error withdrawing application:', error);
      throw error;
    }
  }

  /**
   * Get all applications by a specific worker
   *
   * @param workerId - ID of the worker
   * @param status - Optional filter by status
   * @returns List of applications
   */
  static async getApplicationsByWorker(
    workerId: string,
    status?: JobApplicationStatus
  ): Promise<JobApplication[]> {
    try {
      const queries = [
        Query.equal('workerId', workerId),
        Query.orderDesc('appliedAt'),
        Query.limit(50)
      ];

      if (status) {
        queries.push(Query.equal('status', status));
      }

      const applications = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        queries
      );

      return applications.documents as unknown as JobApplication[];
    } catch (error) {
      console.error('Error getting applications by worker:', error);
      throw error;
    }
  }

  /**
   * Update application status (used by worker selection service)
   * Internal method - should not be called directly by clients
   *
   * @param applicationId - ID of the application
   * @param status - New status
   * @param timestamp - Optional timestamp for selectedAt/rejectedAt
   */
  static async updateApplicationStatus(
    applicationId: string,
    status: JobApplicationStatus,
    timestamp?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
      };

      if (status === 'selected' && timestamp) {
        updateData.selectedAt = timestamp;
      } else if (status === 'rejected' && timestamp) {
        updateData.rejectedAt = timestamp;
      }

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        applicationId,
        updateData
      );
    } catch (error) {
      console.error('Error updating application status:', error);
      throw error;
    }
  }

  /**
   * Reject all pending applications for a job (used when job is filled/cancelled)
   * Internal method
   *
   * @param jobId - ID of the job
   * @param excludeApplicationId - Optional application ID to exclude (e.g., selected worker)
   */
  static async rejectPendingApplications(
    jobId: string,
    excludeApplicationId?: string
  ): Promise<void> {
    try {
      const applications = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        [
          Query.equal('jobId', jobId),
          Query.equal('status', 'pending'),
          Query.limit(100)
        ]
      );

      const rejectTimestamp = new Date().toISOString();

      // Update all pending applications to rejected
      await Promise.all(
        applications.documents.map(async (app) => {
          // Skip the excluded application (selected worker)
          if (excludeApplicationId && app.$id === excludeApplicationId) {
            return;
          }

          await this.updateApplicationStatus(
            app.$id,
            'rejected',
            rejectTimestamp
          );
        })
      );
    } catch (error) {
      console.error('Error rejecting pending applications:', error);
      throw error;
    }
  }
}
