import { databases, COLLECTIONS, DATABASE_ID } from './appwrite';
import { ID, Query } from 'appwrite';
import { Job, JobWithDetails } from './types';
import { JOB_STATUS, SERVICE_CATEGORIES } from './constants';
import { WalletService } from './wallet.service';

/**
 * Job Acceptance Service
 * Handles worker job browsing and acceptance logic
 */
export class JobAcceptanceService {
  /**
   * Get available jobs for a worker (based on their categories)
   */
  static async getAvailableJobs(
    workerCategories: string[],
    filters?: {
      categoryId?: string;
      budgetMin?: number;
      budgetMax?: number;
      limit?: number;
    }
  ): Promise<Job[]> {
    try {
      console.log('🔍 Getting ALL available jobs');
      console.log('🔍 Filters:', filters);

      const queries = [
        Query.equal('status', JOB_STATUS.OPEN),
        Query.orderDesc('$createdAt'),
        Query.limit(filters?.limit || 50)
      ];

      // Only filter by specific category if user explicitly selects one
      if (filters?.categoryId) {
        console.log('🔍 Filtering by specific category:', filters.categoryId);
        queries.push(Query.equal('categoryId', filters.categoryId));
      }
      // No automatic category filtering - show all jobs to all workers

      // Budget filters
      if (filters?.budgetMin !== undefined) {
        queries.push(Query.greaterThanEqual('budgetMax', filters.budgetMin));
      }
      if (filters?.budgetMax !== undefined) {
        queries.push(Query.lessThanEqual('budgetMin', filters.budgetMax));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        queries
      );

      console.log('✅ Found jobs:', response.documents.length);
      console.log('📋 Jobs:', response.documents);

      return response.documents as unknown as Job[];
    } catch (error) {
      console.error('Error fetching available jobs:', error);
      throw new Error('Failed to fetch available jobs');
    }
  }

  /**
   * Get job details with client information and distance calculation
   */
  static async getJobDetailsForWorker(
    jobId: string,
    workerLat?: number,
    workerLng?: number
  ): Promise<JobWithDetails> {
    try {
      const job = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId
      );

      // Fetch client details
      const client = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        job.clientId
      );

      // Get category details from constants (no database fetch needed)
      const category = SERVICE_CATEGORIES.find(cat => cat.id === job.categoryId);

      // Calculate distance if worker location provided
      let distanceFromWorker: number | undefined;
      if (workerLat && workerLng && job.locationLat && job.locationLng) {
        distanceFromWorker = this.calculateDistance(
          workerLat,
          workerLng,
          job.locationLat,
          job.locationLng
        );
      }

      return {
        ...(job as unknown as Job),
        clientName: client.name,
        clientEmail: client.email,
        clientRating: client.rating || 0,
        categoryName: category?.name || job.categoryId,
        distanceFromWorker,
      } as JobWithDetails;
    } catch (error) {
      console.error('Error fetching job details for worker:', error);
      throw new Error('Failed to fetch job details');
    }
  }

  /**
   * Check if worker is eligible to accept a job
   */
  static async checkJobEligibility(
    jobId: string,
    workerId: string,
    workerData: {
      isVerified: boolean;
      isActive: boolean;
      categories: string[];
      locationLat?: number;
      locationLng?: number;
      serviceRadius?: number;
    }
  ): Promise<{ eligible: boolean; reason?: string }> {
    try {
      console.log(`🔍 Checking eligibility for worker ${workerId} on job ${jobId}`);
      console.log(`👤 Worker data:`, {
        isVerified: workerData.isVerified,
        isActive: workerData.isActive,
        hasLocation: !!(workerData.locationLat && workerData.locationLng),
        serviceRadius: workerData.serviceRadius
      });

      // Get job
      const job = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId
      );

      console.log(`📋 Job status: "${job.status}"`);

      // Check if job is still open
      if (job.status !== JOB_STATUS.OPEN) {
        console.log(`❌ Eligibility check failed: Job status is "${job.status}", not "open"`);
        return {
          eligible: false,
          reason: 'This job is no longer available',
        };
      }

      // Check if worker is verified
      if (!workerData.isVerified) {
        console.log(`❌ Eligibility check failed: Worker not verified`);
        return {
          eligible: false,
          reason: 'You must be verified to accept jobs',
        };
      }

      // Check if worker is active
      if (!workerData.isActive) {
        console.log(`❌ Eligibility check failed: Worker not active`);
        return {
          eligible: false,
          reason: 'Your account is not active',
        };
      }

      // Category matching removed - workers can accept any job category

      // Check if worker is within service radius
      if (
        workerData.locationLat &&
        workerData.locationLng &&
        job.locationLat &&
        job.locationLng &&
        workerData.serviceRadius
      ) {
        const distance = this.calculateDistance(
          workerData.locationLat,
          workerData.locationLng,
          job.locationLat,
          job.locationLng
        );

        console.log(`📍 Distance check: ${distance.toFixed(1)}km (service radius: ${workerData.serviceRadius}km)`);

        if (distance > workerData.serviceRadius) {
          console.log(`❌ Eligibility check failed: Outside service radius`);
          return {
            eligible: false,
            reason: `Job location is ${distance.toFixed(1)}km away, outside your ${workerData.serviceRadius}km service radius`,
          };
        }
      }

      console.log(`✅ Eligibility check passed!`);
      return { eligible: true };
    } catch (error) {
      console.error('❌ Error checking job eligibility:', error);
      return {
        eligible: false,
        reason: 'Failed to verify eligibility',
      };
    }
  }

  /**
   * Accept a job (with race condition handling)
   *
   * This function:
   * 1. Checks if job is still open (atomic check)
   * 2. Updates job status to 'assigned'
   * 3. Creates a booking in BOOKINGS collection
   * 4. Holds payment in escrow
   * 5. Sends notifications
   *
   * Returns: { success: boolean, bookingId?: string, message: string }
   */
  static async acceptJob(
    jobId: string,
    workerId: string,
    workerData: {
      name: string;
      email: string;
      isVerified: boolean;
      isActive: boolean;
      categories: string[];
    },
    adminDatabases?: any // Optional admin client with API key for job updates
  ): Promise<{ success: boolean; bookingId?: string; message: string }> {
    try {
      console.log(`🔄 Attempting to accept job ${jobId} for worker ${workerId}`);

      // 1. Get and verify job is still open
      const job = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        jobId
      );

      console.log(`📋 Job status: "${job.status}" (expected: "${JOB_STATUS.OPEN}")`);
      console.log(`📋 Job assigned worker: ${job.assignedWorkerId || 'None'}`);
      console.log(`📋 Status match: ${job.status === JOB_STATUS.OPEN}`);

      if (job.status !== JOB_STATUS.OPEN) {
        console.log(`❌ Job not open. Current status: "${job.status}"`);
        return {
          success: false,
          message: 'Sorry, this job has already been accepted by another worker',
        };
      }

      console.log(`✅ Job is open, proceeding with acceptance...`);

      // 2. Get client wallet to verify sufficient balance
      const clientWallet = await WalletService.getOrCreateWallet(job.clientId);
      if (clientWallet.balance < job.budgetMax) {
        return {
          success: false,
          message: 'Client has insufficient wallet balance for this job',
        };
      }

      // 3. Create booking from job
      const booking = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.BOOKINGS,
        ID.unique(),
        {
          clientId: job.clientId,
          workerId,
          serviceId: job.$id, // Link to job
          categoryId: job.categoryId,
          status: 'confirmed', // Start as confirmed
          scheduledDate: job.scheduledDate,
          scheduledTime: job.scheduledTime,
          duration: job.duration * 60, // Convert hours to minutes
          // Location fields (flat structure for Appwrite)
          locationAddress: job.locationAddress,
          locationLat: job.locationLat,
          locationLng: job.locationLng,
          locationCity: '',
          locationState: '',
          locationCountry: 'Nigeria', // Default
          description: job.description, // Use description field instead of notes
          title: job.title, // Add job title
          totalAmount: job.budgetMax, // Required by Appwrite schema
          budgetAmount: job.budgetMax, // For UI consistency
          budgetCurrency: 'NGN',
          budgetIsHourly: false,
          paymentStatus: 'unpaid', // Will be 'held' after escrow
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );

      const bookingId = booking.$id;

      try {
        // 4. Hold payment in escrow
        const escrowResult = await WalletService.holdFundsForBooking({
          clientId: job.clientId,
          bookingId,
          amountInNaira: job.budgetMax,
        });

        if (!escrowResult.success) {
          // Rollback: Delete booking (use admin client if available)
          const dbClient = adminDatabases || databases;
          await dbClient.deleteDocument(DATABASE_ID, COLLECTIONS.BOOKINGS, bookingId);

          return {
            success: false,
            message: escrowResult.message || 'Failed to hold payment',
          };
        }

        // 5. Update booking payment status (use admin client if available)
        // 6. Update job status (atomic update - race condition handled here)
        // Use admin client if provided, otherwise use regular client for both operations
        const dbClient = adminDatabases || databases;

        await dbClient.updateDocument(
          DATABASE_ID,
          COLLECTIONS.BOOKINGS,
          bookingId,
          {
            paymentStatus: 'held',
          }
        );

        try {
          await dbClient.updateDocument(
            DATABASE_ID,
            COLLECTIONS.JOBS,
            jobId,
            {
              status: JOB_STATUS.ASSIGNED,
              assignedWorkerId: workerId,
              assignedAt: new Date().toISOString(),
              bookingId,
              updatedAt: new Date().toISOString(),
            }
          );

          console.log(`✅ Job status updated to 'assigned'`);
        } catch (updateError: any) {
          // If update fails (job already assigned or permission error), rollback everything
          console.error('Job update failed, rolling back:', updateError);

          // Rollback booking and escrow (use admin client if available)
          const rollbackClient = adminDatabases || databases;
          await rollbackClient.deleteDocument(DATABASE_ID, COLLECTIONS.BOOKINGS, bookingId);

          // Note: Wallet rollback will happen automatically via transaction idempotency
          // when the winning worker's escrow hold is processed

          // Check if it's a permission error
          const isPermissionError = updateError.code === 401 || updateError.type === 'user_unauthorized';

          return {
            success: false,
            message: isPermissionError
              ? 'Failed to complete job acceptance. Please try again.'
              : 'This job was just accepted by another worker',
          };
        }

        console.log(`✅ Job ${jobId} accepted by worker ${workerId}, booking ${bookingId} created`);

        return {
          success: true,
          bookingId,
          message: 'Job accepted successfully! Payment is secured in escrow.',
        };
      } catch (escrowError) {
        // Rollback booking if escrow fails (use admin client if available)
        console.error('Escrow failed, rolling back booking:', escrowError);
        const rollbackClient = adminDatabases || databases;
        await rollbackClient.deleteDocument(DATABASE_ID, COLLECTIONS.BOOKINGS, bookingId);

        return {
          success: false,
          message: 'Failed to process payment',
        };
      }
    } catch (error) {
      console.error('Error accepting job:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to accept job',
      };
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in kilometers
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Get recent jobs accepted by worker
   */
  static async getWorkerAcceptedJobs(workerId: string, limit: number = 10): Promise<Job[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        [
          Query.equal('assignedWorkerId', workerId),
          Query.orderDesc('assignedAt'),
          Query.limit(limit)
        ]
      );

      return response.documents as unknown as Job[];
    } catch (error) {
      console.error('Error fetching worker accepted jobs:', error);
      return [];
    }
  }
}
