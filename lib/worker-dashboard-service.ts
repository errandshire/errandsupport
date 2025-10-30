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
      const stats: WorkerStats = {
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

      this.setCache(cacheKey, stats, this.CACHE_TTL.stats);
      return stats;
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
      const result = {
        availableBookings: [],
        acceptedBookings: []
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

  // Get worker balance (PAYMENT SYSTEM REMOVED)
  async getWorkerBalance(userId: string): Promise<{
    balance: any | null;
    escrowTransactions: any[];
  }> {
    // Payment system has been removed
    return {
      balance: null,
      escrowTransactions: []
    };
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
