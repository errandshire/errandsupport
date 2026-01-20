import { databases, DATABASE_ID, COLLECTIONS } from './appwrite';
import { Query, ID } from 'appwrite';

/**
 * Worker Applications Service
 *
 * Manages worker job applications, including:
 * - Fetching applications with job details
 * - Withdrawing applications
 * - Getting action-needed counts
 * - Managing application lifecycle
 */

export interface ApplicationWithJob {
  // Application fields
  $id: string;
  jobId: string;
  workerId: string;
  clientId: string;
  status: 'pending' | 'selected' | 'rejected' | 'withdrawn' | 'unpicked';
  message?: string;
  appliedAt: string;
  selectedAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  bookingId?: string;

  // Job fields (populated)
  job?: {
    $id: string;
    title: string;
    description: string;
    categoryId: string;
    locationAddress: string;
    locationLat?: number;
    locationLng?: number;
    budgetMin: number;
    budgetMax: number;
    scheduledDate?: string;
    scheduledTime?: string;
    duration?: number;
    urgency: 'low' | 'medium' | 'high';
    status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
    applicantCount: number;
    clientId: string;
    createdAt: string;
  };

  // Client fields (populated)
  client?: {
    $id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    rating?: number;
  };
}

export class WorkerApplicationsService {
  /**
   * Get all applications for a worker with full job and client details
   */
  static async getWorkerApplications(
    workerId: string,
    options?: {
      status?: string[];
      limit?: number;
      offset?: number;
      dbClient?: any;
    }
  ): Promise<ApplicationWithJob[]> {
    const db = options?.dbClient || databases;

    try {
      // Build query
      const queries: string[] = [
        Query.equal('workerId', workerId),
        Query.orderDesc('appliedAt')
      ];

      // Filter by status if provided
      if (options?.status && options.status.length > 0) {
        queries.push(Query.equal('status', options.status));
      }

      // Add pagination
      if (options?.limit) {
        queries.push(Query.limit(options.limit));
      }
      if (options?.offset) {
        queries.push(Query.offset(options.offset));
      }

      // Fetch applications
      const applicationsResponse = await db.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        queries
      );

      if (applicationsResponse.documents.length === 0) {
        return [];
      }

      // Extract unique job IDs and client IDs
      const jobIds = [...new Set(applicationsResponse.documents.map((app: any) => app.jobId))];
      const clientIds = [...new Set(applicationsResponse.documents.map((app: any) => app.clientId))];

      // Fetch jobs and clients in parallel
      const [jobsResponse, clientsResponse] = await Promise.all([
        db.listDocuments(
          DATABASE_ID,
          COLLECTIONS.JOBS,
          [Query.equal('$id', jobIds)]
        ).catch(() => ({ documents: [] })),

        db.listDocuments(
          DATABASE_ID,
          COLLECTIONS.USERS,
          [Query.equal('$id', clientIds)]
        ).catch(() => ({ documents: [] }))
      ]);

      // Create lookup maps
      const jobsMap = new Map(
        jobsResponse.documents.map((job: any) => [job.$id, job])
      );
      const clientsMap = new Map(
        clientsResponse.documents.map((client: any) => [client.$id, client])
      );

      // Merge data
      const applicationsWithDetails: ApplicationWithJob[] = applicationsResponse.documents.map((app: any) => ({
        $id: app.$id,
        jobId: app.jobId,
        workerId: app.workerId,
        clientId: app.clientId,
        status: app.status,
        message: app.message,
        appliedAt: app.appliedAt,
        selectedAt: app.selectedAt,
        acceptedAt: app.acceptedAt,
        declinedAt: app.declinedAt,
        bookingId: app.bookingId,
        job: jobsMap.get(app.jobId),
        client: clientsMap.get(app.clientId)
      }));

      return applicationsWithDetails;

    } catch (error) {
      console.error('Error fetching worker applications:', error);
      throw error;
    }
  }

  /**
   * Get a single application with full details
   */
  static async getApplicationDetails(
    applicationId: string,
    dbClient?: any
  ): Promise<ApplicationWithJob> {
    const db = dbClient || databases;

    try {
      // Fetch application
      const application = await db.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        applicationId
      );

      // Fetch job and client in parallel
      const [job, client] = await Promise.all([
        db.getDocument(DATABASE_ID, COLLECTIONS.JOBS, application.jobId)
          .catch(() => null),
        db.getDocument(DATABASE_ID, COLLECTIONS.USERS, application.clientId)
          .catch(() => null)
      ]);

      return {
        $id: application.$id,
        jobId: application.jobId,
        workerId: application.workerId,
        clientId: application.clientId,
        status: application.status,
        message: application.message,
        appliedAt: application.appliedAt,
        selectedAt: application.selectedAt,
        acceptedAt: application.acceptedAt,
        declinedAt: application.declinedAt,
        bookingId: application.bookingId,
        job: job || undefined,
        client: client || undefined
      };

    } catch (error) {
      console.error('Error fetching application details:', error);
      throw error;
    }
  }

  /**
   * Withdraw a pending application
   * NOTE: This now calls the API route to avoid permission issues
   */
  static async withdrawApplication(
    applicationId: string,
    workerId: string,
    dbClient?: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Call API route with server-side permissions
      const response = await fetch('/api/jobs/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId,
          workerId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'Failed to withdraw application'
        };
      }

      return {
        success: true,
        message: result.message || 'Application withdrawn successfully'
      };

    } catch (error) {
      console.error('Error withdrawing application:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to withdraw application'
      };
    }
  }

  /**
   * Get count of applications needing action
   * (selected within 1 hour, no response)
   */
  static async getActionNeededCount(
    workerId: string,
    dbClient?: any
  ): Promise<number> {
    const db = dbClient || databases;

    try {
      // Get selected applications with no response
      const applications = await db.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        [
          Query.equal('workerId', workerId),
          Query.equal('status', 'selected'),
          Query.isNull('acceptedAt'),
          Query.isNull('declinedAt')
        ]
      );

      // Filter for those within 1-hour window
      const now = new Date().getTime();
      const actionNeededApps = applications.documents.filter((app: any) => {
        if (!app.selectedAt) return false;

        const selectedTime = new Date(app.selectedAt).getTime();
        const hoursSinceSelection = (now - selectedTime) / (1000 * 60 * 60);

        return hoursSinceSelection < 1; // Within 1 hour
      });

      return actionNeededApps.length;

    } catch (error) {
      console.error('Error getting action needed count:', error);
      return 0;
    }
  }

  /**
   * Check if a worker has already applied to a job
   */
  static async hasAppliedToJob(
    workerId: string,
    jobId: string,
    dbClient?: any
  ): Promise<boolean> {
    const db = dbClient || databases;

    try {
      const applications = await db.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        [
          Query.equal('workerId', workerId),
          Query.equal('jobId', jobId),
          Query.limit(1)
        ]
      );

      return applications.documents.length > 0;

    } catch (error) {
      console.error('Error checking application:', error);
      return false;
    }
  }

  /**
   * Get application statistics for a worker
   */
  static async getApplicationStats(
    workerId: string,
    dbClient?: any
  ): Promise<{
    total: number;
    pending: number;
    selected: number;
    accepted: number;
    rejected: number;
    withdrawn: number;
  }> {
    const db = dbClient || databases;

    try {
      const applications = await db.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOB_APPLICATIONS,
        [
          Query.equal('workerId', workerId),
          Query.limit(1000) // Get all for stats
        ]
      );

      const docs = applications.documents;

      return {
        total: docs.length,
        pending: docs.filter((app: any) => app.status === 'pending').length,
        selected: docs.filter((app: any) => app.status === 'selected').length,
        accepted: docs.filter((app: any) => app.acceptedAt).length,
        rejected: docs.filter((app: any) => app.status === 'rejected').length,
        withdrawn: docs.filter((app: any) => app.status === 'withdrawn').length
      };

    } catch (error) {
      console.error('Error getting application stats:', error);
      return {
        total: 0,
        pending: 0,
        selected: 0,
        accepted: 0,
        rejected: 0,
        withdrawn: 0
      };
    }
  }

  /**
   * Check if application selection window has expired (> 1 hour)
   */
  static isSelectionExpired(selectedAt?: string): boolean {
    if (!selectedAt) return false;

    const selectedTime = new Date(selectedAt).getTime();
    const now = new Date().getTime();
    const hoursSinceSelection = (now - selectedTime) / (1000 * 60 * 60);

    return hoursSinceSelection >= 1;
  }

  /**
   * Get remaining time in milliseconds for 1-hour window
   */
  static getTimeRemaining(selectedAt?: string): number {
    if (!selectedAt) return 0;

    const selectedTime = new Date(selectedAt).getTime();
    const expiryTime = selectedTime + (60 * 60 * 1000); // +1 hour
    const now = new Date().getTime();

    return Math.max(0, expiryTime - now);
  }
}
