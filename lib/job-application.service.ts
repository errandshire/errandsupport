import { DATABASE_ID, COLLECTIONS } from './api';
import { ID } from '@/lib/api';
import { JobApplication, JobApplicationWithDetails, JobApplicationStatus } from './types';
import { NotificationService } from './notification-service';
import { ApiService } from './api';

/**
 * Job Application Service
 *
 * Manages worker applications to jobs (show interest functionality) using VPS API
 * - Workers apply to jobs instead of directly accepting
 * - Clients see applicant count and select workers after funding
 */
export class JobApplicationService {
  /**
   * Worker applies to a job (shows interest) using VPS API
   *
   * @param jobId - ID of the job to apply to
   * @param workerId - ID of the worker applying
   * @param message - Optional message/pitch from worker
   * @returns The created application
   */
  static async applyToJob(
    jobId: string,
    workerId: string,
    message?: string
  ): Promise<JobApplication> {
    try {
      console.log('📝 applyToJob called with:', { jobId, workerId, message });

      // 1. Check if worker already applied using VPS API
      console.log('1️⃣ Checking for existing applications...');
      const existingApplications = await ApiService.request<any[]>(
        `/job-applications?filter_jobId=${jobId}&filter_workerId=${workerId}&limit=1`
      );

      if (existingApplications && existingApplications.length > 0) {
        throw new Error('You have already applied to this job');
      }

      // 2. Get job details to validate and get clientId using VPS API
      console.log('2️⃣ Fetching job details for jobId:', jobId);
      const job = await ApiService.request<any>(`/jobs/${jobId}`);
      console.log('✅ Job fetched:', job.$id);

      // 3. Validate job is still open
      if (job.status !== 'open') {
        throw new Error('This job is no longer accepting applications');
      }

      // 4. Validate worker is verified and active using VPS API
      console.log('4️⃣ Fetching worker details for workerId:', workerId);
      const worker = await ApiService.request<any>(`/workers/${workerId}`);
      console.log('✅ Worker fetched:', worker.$id);

      if (!worker.isVerified) {
        throw new Error('You must be verified to apply to jobs');
      }

      if (!worker.isActive) {
        throw new Error('Your account must be active to apply to jobs');
      }

      // 5. Create application using VPS API
      const applicationId = ID.unique();
      const applicationData = {
        $id: applicationId,
        jobId,
        workerId,
        clientId: job.clientId,
        status: 'pending' as JobApplicationStatus,
        message: message || '',
        appliedAt: new Date().toISOString(),
      };

      const application = await ApiService.request<JobApplication>('/job-applications', {
        method: 'POST',
        body: JSON.stringify(applicationData),
      });

      // 6. Increment applicant count on job using VPS API
      const currentCount = job.applicantCount || 0;
      await ApiService.request(`/jobs/${jobId}`, {
        method: 'PUT',
        body: JSON.stringify({
          applicantCount: currentCount + 1,
          requiresFunding: true, // Mark job as requiring funding to view applicants
        }),
      });

      // 7. Notify client about new application
      try {
        await NotificationService.createNotification({
          userId: job.clientId,
          title: 'New Job Application!',
          message: `A worker has applied to your job "${job.title}"`,
          type: 'job',
          actionUrl: `/(tabs)/client/jobs?jobId=${jobId}`,
          data: {
            type: 'job',
            jobId: jobId,
            applicationId: application.$id
          },
          idempotencyKey: `job_application_${jobId}_${workerId}_${application.$id}`,
        });

        // Send push notification to client
        await ApiService.request('/api/push/send', {
          method: 'POST',
          body: JSON.stringify({
            userId: job.clientId,
            title: 'New Job Application!',
            body: `A worker has applied to your job "${job.title}"`,
            data: {
              type: 'job',
              jobId: jobId,
              applicationId: application.$id,
              actionUrl: `/(tabs)/client/jobs?jobId=${jobId}`
            }
          })
        });
      } catch (notifError) {
        console.error('Failed to send application notification:', notifError);
        // Don't throw - notification failure shouldn't block application
      }

      return application;
    } catch (error) {
      console.error('Error applying to job:', error);
      throw error;
    }
  }

  /**
   * Get all applications for a specific job using VPS API
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
      const applications = await ApiService.request<JobApplication[]>(
        `/job-applications?filter_jobId=${jobId}&limit=100`
      );

      if (!includeWorkerDetails || !applications) {
        return applications || [];
      }

      // Fetch worker details for each application using VPS API
      const applicationsWithDetails = await Promise.all(
        applications.map(async (app) => {
          try {
            const worker = await ApiService.request<any>(`/workers/${app.workerId}`);

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
   * Get count of pending applications for a job using VPS API
   *
   * @param jobId - ID of the job
   * @returns Number of pending applications
   */
  static async getApplicationCount(jobId: string): Promise<number> {
    try {
      const applications = await ApiService.request<any>(
        `/job-applications?filter_jobId=${jobId}&filter_status=pending`
      );
      return applications.total || (Array.isArray(applications) ? applications.length : 0);
    } catch (error) {
      console.error('Error getting application count:', error);
      return 0;
    }
  }

  /**
   * Check if a worker has already applied to a job using VPS API
   *
   * @param jobId - ID of the job
   * @param workerId - ID of the worker
   * @returns True if worker has applied
   */
  static async hasWorkerApplied(jobId: string, workerId: string): Promise<boolean> {
    try {
      const applications = await ApiService.request<any[]>(
        `/job-applications?filter_jobId=${jobId}&filter_workerId=${workerId}&limit=1`
      );
      return applications && applications.length > 0;
    } catch (error) {
      console.error('Error checking if worker applied:', error);
      return false;
    }
  }

  /**
   * Worker withdraws their application using VPS API
   *
   * @param applicationId - ID of the application to withdraw
   * @param workerId - ID of the worker (for validation)
   */
  static async withdrawApplication(
    applicationId: string,
    workerId: string
  ): Promise<void> {
    try {
      // 1. Get application using VPS API
      const application = await ApiService.request<any>(`/job-applications/${applicationId}`);

      // 2. Validate worker owns this application
      if (application.workerId !== workerId) {
        throw new Error('You can only withdraw your own applications');
      }

      // 3. Validate application is still pending
      if (application.status !== 'pending') {
        throw new Error('You can only withdraw pending applications');
      }

      // 4. Update application status using VPS API
      await ApiService.request(`/job-applications/${applicationId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'withdrawn' as JobApplicationStatus,
        }),
      });

      // 5. Decrement applicant count on job using VPS API
      const job = await ApiService.request<any>(`/jobs/${application.jobId}`);

      const currentCount = job.applicantCount || 0;
      await ApiService.request(`/jobs/${application.jobId}`, {
        method: 'PUT',
        body: JSON.stringify({
          applicantCount: Math.max(0, currentCount - 1),
        }),
      });
    } catch (error) {
      console.error('Error withdrawing application:', error);
      throw error;
    }
  }

  /**
   * Get all applications by a specific worker using VPS API
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
      const query = status
        ? `/job-applications?filter_workerId=${workerId}&filter_status=${status}&limit=50`
        : `/job-applications?filter_workerId=${workerId}&limit=50`;
      const applications = await ApiService.request<JobApplication[]>(query);
      return applications || [];
    } catch (error) {
      console.error('Error getting applications by worker:', error);
      throw error;
    }
  }

  /**
   * Update application status (used by worker selection service) using VPS API
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

      await ApiService.request(`/job-applications/${applicationId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
    } catch (error) {
      console.error('Error updating application status:', error);
      throw error;
    }
  }

  /**
   * Reject all pending applications for a job (used when job is filled/cancelled) using VPS API
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
      const applications = await ApiService.request<any[]>(
        `/job-applications?filter_jobId=${jobId}&filter_status=pending&limit=100`
      );

      const rejectTimestamp = new Date().toISOString();

      // Update all pending applications to rejected
      await Promise.all(
        applications.map(async (app) => {
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
