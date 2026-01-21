import { databases } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { ReviewService } from './review-service';

export interface WorkerStats {
  totalEarnings: number;
  completedJobs: number;
  activeBookings: number;
  pendingBookings: number;
  avgRating: number;
  totalReviews: number;
  monthlyEarnings: number;
  weeklyEarnings: number;
  responseTime: number;
  acceptanceRate: number;
}

export interface ProcessedBooking {
  $id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  serviceTitle: string;
  categoryName: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  location: any;
  notes?: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  selectedAt?: string; // When worker was selected for this booking
  jobId?: string; // Original job ID for reference
}

class WorkerDashboardService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = {
    stats: 5 * 60 * 1000, // 5 minutes
    bookings: 2 * 60 * 1000, // 2 minutes
    balance: 1 * 60 * 1000, // 1 minute
  };

  // Cache helpers
  private getCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL.stats;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Auto cleanup after TTL
    setTimeout(() => this.cache.delete(key), ttl);
  }

  // Get worker stats with caching
  async getWorkerStats(userId: string): Promise<WorkerStats> {
    const cacheKey = `worker-stats-${userId}`;
    const cached = this.getCache<WorkerStats>(cacheKey);
    if (cached) return cached;

    try {
      const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

      // Fetch all bookings for this worker
      const allBookings = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BOOKINGS,
        [
          Query.equal('workerId', userId),
          Query.limit(5000) // Get all bookings
        ]
      );

      const bookings = allBookings.documents;

      // Calculate completed jobs
      const completedBookings = bookings.filter((b: any) => b.status === 'completed');
      const completedJobs = completedBookings.length;

      // Calculate active bookings (confirmed, accepted, in_progress, worker_completed)
      const activeBookings = bookings.filter((b: any) =>
        ['confirmed', 'accepted', 'in_progress', 'worker_completed'].includes(b.status)
      ).length;

      // Calculate pending bookings (pending status)
      const pendingBookings = bookings.filter((b: any) => b.status === 'pending').length;

      // Calculate total earnings from completed bookings
      const totalEarnings = completedBookings.reduce((sum: number, b: any) => {
        const amount = Number(b.totalAmount || b.budgetAmount || 0);
        return sum + amount;
      }, 0);

      // Calculate monthly earnings (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const monthlyEarnings = completedBookings
        .filter((b: any) => {
          const completedDate = new Date(b.completedAt || b.$createdAt);
          return completedDate >= thirtyDaysAgo;
        })
        .reduce((sum: number, b: any) => {
          const amount = Number(b.totalAmount || b.budgetAmount || 0);
          return sum + amount;
        }, 0);

      // Calculate weekly earnings (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weeklyEarnings = completedBookings
        .filter((b: any) => {
          const completedDate = new Date(b.completedAt || b.$createdAt);
          return completedDate >= sevenDaysAgo;
        })
        .reduce((sum: number, b: any) => {
          const amount = Number(b.totalAmount || b.budgetAmount || 0);
          return sum + amount;
        }, 0);

      // Get reviews and ratings
      const reviewStats = await ReviewService.getWorkerReviewStats(userId);
      const avgRating = reviewStats.averageRating;
      const totalReviews = reviewStats.totalReviews;

      // Calculate acceptance rate from applications
      try {
        const applications = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.JOB_APPLICATIONS,
          [
            Query.equal('workerId', userId),
            Query.limit(1000)
          ]
        );

        const selectedApps = applications.documents.filter((app: any) => app.status === 'selected');
        const acceptedApps = applications.documents.filter((app: any) => app.acceptedAt);
        const acceptanceRate = selectedApps.length > 0
          ? Math.round((acceptedApps.length / selectedApps.length) * 100)
          : 0;

        const stats: WorkerStats = {
          totalEarnings,
          completedJobs,
          activeBookings,
          pendingBookings,
          avgRating,
          totalReviews,
          monthlyEarnings,
          weeklyEarnings,
          responseTime: 0, // Not implemented yet
          acceptanceRate
        };

        this.setCache(cacheKey, stats, this.CACHE_TTL.stats);
        return stats;
      } catch (appError) {
        console.error('Error fetching applications for acceptance rate:', appError);

        const stats: WorkerStats = {
          totalEarnings,
          completedJobs,
          activeBookings,
          pendingBookings,
          avgRating,
          totalReviews,
          monthlyEarnings,
          weeklyEarnings,
          responseTime: 0,
          acceptanceRate: 0
        };

        this.setCache(cacheKey, stats, this.CACHE_TTL.stats);
        return stats;
      }
    } catch (error) {
      console.error('Error fetching worker stats:', error);
      return {
        totalEarnings: 0,
        completedJobs: 0,
        activeBookings: 0,
        pendingBookings: 0,
        avgRating: 0,
        totalReviews: 0,
        monthlyEarnings: 0,
        weeklyEarnings: 0,
        responseTime: 0,
        acceptanceRate: 0
      };
    }
  }

  // Get worker bookings with caching
  async getWorkerBookings(userId: string): Promise<{
    availableBookings: ProcessedBooking[];
    acceptedBookings: ProcessedBooking[];
  }> {
    const cacheKey = `worker-bookings-${userId}`;
    const cached = this.getCache<{
      availableBookings: ProcessedBooking[];
      acceptedBookings: ProcessedBooking[];
    }>(cacheKey);
    if (cached) return cached;

    try {
      const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

      // Fetch bookings for this worker
      const bookingsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BOOKINGS,
        [
          Query.equal('workerId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(100) // Get recent bookings
        ]
      );

      // Get booking IDs to fetch applications
      const bookingIds = bookingsResponse.documents.map((b: any) => b.$id);

      // Fetch job applications by bookingId to get selectedAt times
      let applicationsMap = new Map<string, any>();
      if (bookingIds.length > 0) {
        try {
          const applicationsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.JOB_APPLICATIONS,
            [
              Query.equal('bookingId', bookingIds),
              Query.equal('status', 'selected'),
              Query.limit(100)
            ]
          );
          applicationsResponse.documents.forEach((app: any) => {
            applicationsMap.set(app.bookingId, app);
          });
        } catch (appError) {
          console.warn('Could not fetch job applications:', appError);
        }
      }

      // Extract unique client IDs and category IDs
      const clientIds = [...new Set(bookingsResponse.documents
        .map((b: any) => b.clientId)
        .filter(Boolean))];
      const categoryIds = [...new Set(bookingsResponse.documents
        .map((b: any) => b.categoryId)
        .filter(Boolean))];

      // Batch fetch clients and categories
      let clientsMap = new Map<string, any>();
      let categoriesMap = new Map<string, any>();

      // Fetch clients (may fail due to permissions - handle gracefully)
      if (clientIds.length > 0) {
        try {
          const clientsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.USERS,
            [Query.equal('$id', clientIds), Query.limit(100)]
          );
          clientsResponse.documents.forEach((client: any) => {
            clientsMap.set(client.$id, client);
          });
        } catch (clientError) {
          console.warn('Could not fetch client data (permission issue):', clientError);
        }
      }

      // Fetch categories
      if (categoryIds.length > 0) {
        try {
          const categoriesResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.CATEGORIES,
            [Query.equal('$id', categoryIds), Query.limit(100)]
          );
          categoriesResponse.documents.forEach((cat: any) => {
            categoriesMap.set(cat.$id, cat);
          });
        } catch (categoryError) {
          console.warn('Could not fetch category data:', categoryError);
        }
      }

      // Process bookings with fetched data
      const processedBookings: ProcessedBooking[] = bookingsResponse.documents.map((booking: any) => {
        const client = clientsMap.get(booking.clientId);
        const category = categoriesMap.get(booking.categoryId);
        const application = applicationsMap.get(booking.$id); // Map by bookingId

        // Format date properly
        let formattedDate = booking.scheduledDate || booking.date || '';
        let formattedTime = booking.scheduledTime || booking.time || '';

        // If date contains a full timestamp, extract just the date part
        if (formattedDate && formattedDate.includes('T')) {
          const dateObj = new Date(formattedDate);
          formattedDate = dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }

        // If time is in 24-hour format (HH:MM), keep it as is
        // If it's a timestamp, extract the time
        if (formattedTime && formattedTime.includes('T')) {
          const timeObj = new Date(formattedTime);
          formattedTime = timeObj.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        }

        return {
          $id: booking.$id,
          clientId: booking.clientId || '',
          clientName: client?.name || client?.displayName || 'Client',
          clientEmail: client?.email || '',
          serviceTitle: booking.title || booking.service || 'Service',
          categoryName: category?.name || 'General Service',
          scheduledDate: formattedDate,
          scheduledTime: formattedTime,
          duration: booking.duration || booking.estimatedDuration || 1,
          location: {
            address: booking.locationAddress || booking.location || '',
            lat: booking.locationLat,
            lng: booking.locationLng
          },
          notes: booking.notes || booking.description || '',
          totalAmount: Number(booking.totalAmount || booking.budgetAmount || 0),
          status: booking.status || 'pending',
          createdAt: booking.$createdAt,
          updatedAt: booking.$updatedAt,
          selectedAt: application?.selectedAt,
          jobId: booking.jobId
        };
      });

      // Helper function to check if booking is in the past
      const isBookingInPast = (bookingData: any, processedBooking: ProcessedBooking): boolean => {
        try {
          // First try to use the raw database values for more accurate checking
          const rawDate = bookingData.scheduledDate || bookingData.date;
          const rawTime = bookingData.scheduledTime || bookingData.time;

          let scheduledDateTime: Date | null = null;

          // Try to parse raw ISO timestamp first (most accurate)
          if (rawDate && rawDate.includes('T')) {
            scheduledDateTime = new Date(rawDate);
          }
          // Try to combine date and time if both are available
          else if (rawDate && rawTime) {
            // If date is in YYYY-MM-DD format and time is in HH:MM format
            if (rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const combinedStr = `${rawDate}T${rawTime}:00`;
              scheduledDateTime = new Date(combinedStr);
            }
          }

          // If we couldn't parse raw data, try the processed/formatted data
          if (!scheduledDateTime || isNaN(scheduledDateTime.getTime())) {
            const scheduledDateStr = processedBooking.scheduledDate;
            const scheduledTimeStr = processedBooking.scheduledTime;

            // Parse formatted date like "Jan 21, 2026"
            const dateMatch = scheduledDateStr.match(/(\w+)\s+(\d+),?\s+(\d{4})/);
            if (dateMatch) {
              const [, month, day, year] = dateMatch;
              const monthMap: { [key: string]: number } = {
                'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
              };
              const monthIndex = monthMap[month] ?? 0;

              // Parse time like "09:44" or "9:44 AM"
              let hours = 0;
              let minutes = 0;

              if (scheduledTimeStr) {
                const timeMatch = scheduledTimeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                if (timeMatch) {
                  hours = parseInt(timeMatch[1], 10);
                  minutes = parseInt(timeMatch[2], 10);
                  const isPM = timeMatch[3]?.toUpperCase() === 'PM';

                  if (isPM && hours !== 12) {
                    hours += 12;
                  } else if (!isPM && hours === 12) {
                    hours = 0;
                  }
                }
              }

              scheduledDateTime = new Date(parseInt(year), monthIndex, parseInt(day), hours, minutes);
            }
          }

          // Check if date is valid and in the past
          if (scheduledDateTime && !isNaN(scheduledDateTime.getTime())) {
            const now = new Date();
            // Add 1 hour buffer - only consider it "past" if it's more than 1 hour ago
            const bufferTime = 60 * 60 * 1000; // 1 hour in milliseconds
            return (now.getTime() - scheduledDateTime.getTime()) > bufferTime;
          }

          return false;
        } catch (error) {
          console.error('Error checking if booking is in past:', error);
          return false;
        }
      };

      // Split into available and accepted, filtering out past bookings from available
      const availableBookings = processedBookings.filter((processedBooking, index) => {
        const isPending = ['pending', 'confirmed'].includes(processedBooking.status);
        const rawBooking = bookingsResponse.documents[index];
        const isNotPast = !isBookingInPast(rawBooking, processedBooking);
        return isPending && isNotPast;
      });

      const acceptedBookings = processedBookings.filter(b =>
        ['accepted', 'in_progress', 'worker_completed'].includes(b.status)
      );

      const result = {
        availableBookings,
        acceptedBookings
      };

      this.setCache(cacheKey, result, this.CACHE_TTL.bookings);
      return result;
    } catch (error) {
      console.error('Error fetching worker bookings:', error);
      return {
        availableBookings: [],
        acceptedBookings: []
      };
    }
  }

  // Get worker balance
  async getWorkerBalance(userId: string): Promise<{
    balance: any | null;
    escrowTransactions: any[];
  }> {
    try {
      const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

      // Fetch worker wallet
      const wallets = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.VIRTUAL_WALLETS,
        [
          Query.equal('userId', userId),
          Query.limit(1)
        ]
      );

      if (wallets.documents.length === 0) {
        return {
          balance: null,
          escrowTransactions: []
        };
      }

      const wallet = wallets.documents[0];

      // Fetch recent wallet transactions
      const transactions = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WALLET_TRANSACTIONS,
        [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(50)
        ]
      );

      return {
        balance: wallet,
        escrowTransactions: transactions.documents
      };
    } catch (error) {
      console.error('Error fetching worker balance:', error);
      return {
        balance: null,
        escrowTransactions: []
      };
    }
  }

  // Get all dashboard data in parallel
  async getDashboardData(userId: string): Promise<{
    stats: WorkerStats;
    bookings: {
      availableBookings: ProcessedBooking[];
      acceptedBookings: ProcessedBooking[];
    };
    balance: {
      balance: any | null;
      escrowTransactions: any[];
    };
  }> {
    try {
      const [stats, bookings, balance] = await Promise.all([
        this.getWorkerStats(userId),
        this.getWorkerBookings(userId),
        this.getWorkerBalance(userId)
      ]);

      return {
        stats,
        bookings,
        balance
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  // Clear all caches for a specific user
  clearUserCache(userId: string): void {
    const keys = Array.from(this.cache.keys()).filter(key => key.includes(userId));
    keys.forEach(key => this.cache.delete(key));
  }

  // Clear all caches
  clearAllCaches(): void {
    this.cache.clear();
  }
}

export const workerDashboardService = new WorkerDashboardService();
