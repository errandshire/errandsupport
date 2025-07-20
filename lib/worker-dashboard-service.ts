import { databases } from '@/lib/appwrite';
import { COLLECTIONS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { EscrowService } from './escrow-service';
import { VirtualWalletService } from './virtual-wallet-service';
import type { 
  UserBalance,
  EscrowTransaction
} from './types';

export interface WorkerStats {
  totalEarnings: number;
  completedJobs: number;
  activeBookings: number;
  pendingBookings: number;
  avgRating: number;
  totalReviews: number;
  monthlyEarnings: number;
  weeklyEarnings: number;
  responseRate: number;
  completionRate: number;
}

export interface ProcessedBooking {
  id: string;
  title: string;
  client: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  scheduledDate: string;
  estimatedDuration: number;
  budgetAmount: number;
  budgetCurrency: string;
  status: string;
  urgency: string;
  locationAddress: string;
  requirements?: string[];
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  timeAgo: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class WorkerDashboardService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = {
    stats: 5 * 60 * 1000, // 5 minutes
    bookings: 2 * 60 * 1000, // 2 minutes
    balance: 3 * 60 * 1000, // 3 minutes
  };

  private isValidCache<T>(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const now = Date.now();
    return now - entry.timestamp < entry.ttl;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private getCache<T>(key: string): T | null {
    if (!this.isValidCache(key)) return null;
    return this.cache.get(key)?.data || null;
  }

  // Get worker statistics with caching
  async getWorkerStats(userId: string): Promise<WorkerStats> {
    const cacheKey = `worker-stats-${userId}`;
    const cached = this.getCache<WorkerStats>(cacheKey);
    if (cached) return cached;

    try {
      // Fetch all bookings for this worker
      const bookingsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        [
          Query.equal('workerId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ]
      );

      const bookings = bookingsResponse.documents;
      
      // Calculate stats
      const completedBookings = bookings.filter(b => b.status === 'completed');
      const activeBookings = bookings.filter(b => ['accepted', 'in_progress'].includes(b.status));
      const pendingBookings = bookings.filter(b => b.status === 'confirmed');
      
      const totalEarnings = completedBookings.reduce((sum, b) => sum + (b.budgetAmount || 0), 0);
      
      // Calculate monthly earnings
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const monthlyEarnings = completedBookings
        .filter(b => new Date(b.completedAt) >= thisMonth)
        .reduce((sum, b) => sum + (b.budgetAmount || 0), 0);

      // Calculate weekly earnings
      const thisWeek = new Date();
      thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
      thisWeek.setHours(0, 0, 0, 0);
      
      const weeklyEarnings = completedBookings
        .filter(b => new Date(b.completedAt) >= thisWeek)
        .reduce((sum, b) => sum + (b.budgetAmount || 0), 0);

      // Calculate ratings
      const ratedBookings = completedBookings.filter(b => b.clientRating && b.clientRating > 0);
      const avgRating = ratedBookings.length > 0
        ? ratedBookings.reduce((sum, b) => sum + b.clientRating, 0) / ratedBookings.length
        : 0;

      // Calculate response and completion rates
      const totalResponded = bookings.filter(b => b.status !== 'confirmed').length;
      const responseRate = bookings.length > 0 ? (totalResponded / bookings.length) * 100 : 0;
      
      const completionRate = bookings.length > 0 
        ? (completedBookings.length / bookings.length) * 100 
        : 0;

      const stats: WorkerStats = {
        totalEarnings,
        completedJobs: completedBookings.length,
        activeBookings: activeBookings.length,
        pendingBookings: pendingBookings.length,
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews: ratedBookings.length,
        monthlyEarnings,
        weeklyEarnings,
        responseRate: Math.round(responseRate),
        completionRate: Math.round(completionRate)
      };

      this.setCache(cacheKey, stats, this.CACHE_TTL.stats);
      return stats;

    } catch (error) {
      console.error('Error fetching worker stats:', error);
      
      // Return default stats on error
      return {
        totalEarnings: 0,
        completedJobs: 0,
        activeBookings: 0,
        pendingBookings: 0,
        avgRating: 0,
        totalReviews: 0,
        monthlyEarnings: 0,
        weeklyEarnings: 0,
        responseRate: 0,
        completionRate: 0
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
      // Get worker profile to check if there's a separate worker ID
      let workerProfileId = userId;
      try {
        const workerProfile = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WORKERS,
          [Query.equal('userId', userId)]
        );
        if (workerProfile.documents.length > 0) {
          workerProfileId = workerProfile.documents[0].$id;
        }
      } catch (error) {
        console.warn('Could not find worker profile, using user ID directly');
      }

      // Fetch all relevant bookings using both user ID and worker profile ID
      const [availableResponse, acceptedResponse] = await Promise.all([
        databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.BOOKINGS,
          [
            Query.equal('status', 'confirmed'),
            Query.orderDesc('$createdAt'),
            Query.limit(50)
          ]
        ),
        databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.BOOKINGS,
          [
            Query.or([
              Query.equal('workerId', userId),
              Query.equal('workerId', workerProfileId)
            ]),
            Query.notEqual('status', 'completed'),
            Query.orderDesc('$createdAt'),
            Query.limit(50)
          ]
        )
      ]);

      // Process bookings and fetch client info in parallel
      const processBookings = async (bookings: any[]): Promise<ProcessedBooking[]> => {
        return await Promise.all(
          bookings.map(async (booking) => {
            let clientInfo = null;

            try {
              if (booking.clientId) {
                const client = await databases.getDocument(
                  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                  COLLECTIONS.USERS,
                  booking.clientId
                );
                clientInfo = {
                  id: client.$id,
                  name: client.name || client.displayName || 'Client',
                  avatar: client.avatar || client.profileImage,
                  email: client.email
                };
              }
            } catch (error) {
              console.warn('Could not fetch client info:', error);
            }

            return {
              id: booking.$id,
              title: booking.title || 'Service Booking',
              client: clientInfo || {
                id: booking.clientId,
                name: 'Client'
              },
              scheduledDate: booking.scheduledDate || booking.$createdAt,
              estimatedDuration: booking.estimatedDuration || 1,
              budgetAmount: booking.budgetAmount || 0,
              budgetCurrency: booking.budgetCurrency || 'NGN',
              status: booking.status || 'pending',
              urgency: booking.urgency || 'medium',
              locationAddress: booking.locationAddress || booking.location || '',
              requirements: booking.requirements || [],
              createdAt: booking.$createdAt,
              acceptedAt: booking.acceptedAt,
              completedAt: booking.completedAt,
              timeAgo: this.getTimeAgo(booking.$createdAt)
            };
          })
        );
      };

      const [availableBookings, acceptedBookings] = await Promise.all([
        processBookings(availableResponse.documents),
        processBookings(acceptedResponse.documents)
      ]);

      const result = { availableBookings, acceptedBookings };
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

  // Get worker balance with caching
  async getWorkerBalance(userId: string): Promise<{
    balance: UserBalance | null;
    escrowTransactions: EscrowTransaction[];
  }> {
    const cacheKey = `worker-balance-${userId}`;
    const cached = this.getCache<{
      balance: UserBalance | null;
      escrowTransactions: EscrowTransaction[];
    }>(cacheKey);
    if (cached) return cached;

    try {
      const [legacyBalance, virtualWallet, escrowTransactions] = await Promise.all([
        EscrowService.getUserBalance(userId),
        VirtualWalletService.getUserWallet(userId),
        EscrowService.getUserEscrowTransactions(userId, 'worker', 50)
      ]);

      // Combine legacy and virtual wallet balances
      const combinedBalance: UserBalance = {
        $id: legacyBalance?.$id || 'combined',
        userId: userId,
        availableBalance: (legacyBalance?.availableBalance || 0) + (virtualWallet?.availableBalance || 0),
        pendingBalance: (legacyBalance?.pendingBalance || 0) + (virtualWallet?.pendingBalance || 0),
        totalEarnings: (legacyBalance?.totalEarnings || 0) + (virtualWallet?.totalDeposits || 0),
        totalWithdrawn: legacyBalance?.totalWithdrawn || 0,
        currency: legacyBalance?.currency || 'NGN',
        updatedAt: new Date().toISOString(),
        // Add virtual wallet info for extended functionality
        virtualWallet: virtualWallet,
        legacyBalance: legacyBalance
      } as UserBalance & { virtualWallet: any | null; legacyBalance: UserBalance | null };

      const result = { balance: combinedBalance, escrowTransactions };
      this.setCache(cacheKey, result, this.CACHE_TTL.balance);
      return result;

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
      balance: UserBalance | null;
      escrowTransactions: EscrowTransaction[];
    };
  }> {
    try {
      const [stats, bookings, balance] = await Promise.all([
        this.getWorkerStats(userId),
        this.getWorkerBookings(userId),
        this.getWorkerBalance(userId)
      ]);

      return { stats, bookings, balance };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  // Prefetch data for better UX
  async prefetchData(userId: string): Promise<void> {
    try {
      // Fire and forget
      this.getDashboardData(userId).catch(error => {
        console.warn('Prefetch failed:', error);
      });
    } catch (error) {
      // Ignore prefetch errors
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Clear specific user cache
  clearUserCache(userId: string): void {
    const userCacheKeys = Array.from(this.cache.keys()).filter(key => 
      key.includes(userId)
    );
    userCacheKeys.forEach(key => this.cache.delete(key));
  }

  // Helper to calculate time ago
  private getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) {
      return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
    } else if (hours < 24) {
      return hours === 1 ? '1h ago' : `${hours}h ago`;
    } else {
      return days === 1 ? '1d ago' : `${days}d ago`;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        [Query.limit(1)]
      );
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export const workerDashboardService = new WorkerDashboardService(); 