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
      const { rating: avgRating, count: totalReviews } = await ReviewService.getWorkerRating(userId);

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

        return {
          $id: booking.$id,
          clientId: booking.clientId || '',
          clientName: client?.name || client?.displayName || 'Client',
          clientEmail: client?.email || '',
          serviceTitle: booking.title || booking.service || 'Service',
          categoryName: category?.name || 'General Service',
          scheduledDate: booking.scheduledDate || booking.date || '',
          scheduledTime: booking.scheduledTime || booking.time || '',
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
          updatedAt: booking.$updatedAt
        };
      });

      // Split into available and accepted
      const availableBookings = processedBookings.filter(b =>
        ['pending', 'confirmed'].includes(b.status)
      );

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
