import { databases, COLLECTIONS } from './appwrite';
import { Query } from 'appwrite';

export interface DashboardStats {
  totalUsers: number;
  activeWorkers: number;
  activeClients: number;
  totalClients: number;
  pendingVerifications: number;
  systemHealth: number;
  userGrowth: string;
  workerGrowth: string;
  clientGrowth: string;
}

export interface RecentRegistration {
  id: string;
  name: string;
  type: 'worker' | 'client';
  category?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  timeAgo: string;
}

export interface SystemAlert {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  icon: 'check' | 'alert' | 'x' | 'info';
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class AdminDashboardService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = {
    stats: 5 * 60 * 1000, // 5 minutes
    registrations: 2 * 60 * 1000, // 2 minutes
    alerts: 1 * 60 * 1000, // 1 minute
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

  // Get dashboard statistics with caching
  async getDashboardStats(): Promise<DashboardStats> {
    const cacheKey = 'dashboard-stats';
    const cached = this.getCache<DashboardStats>(cacheKey);
    if (cached) return cached;

    try {
      // Parallel fetch for better performance
      const [usersResponse, workersResponse, clientsResponse] = await Promise.all([
        databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.USERS,
          [Query.limit(1)] // Just get count
        ),
        databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WORKERS,
          [
            Query.limit(100),
            Query.equal('isActive', true)
          ]
        ),
        databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.USERS,
          [
            Query.equal('role', 'client'),
            Query.limit(100)
          ]
        )
      ]);

      // Filter active clients (status === 'active' or isActive !== false and no status field)
      const activeClients = clientsResponse.documents.filter((client: any) => 
        client.status === 'active' || (client.isActive !== false && !client.status)
      );

      // Get pending verifications (workers with pending status)
      const pendingResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WORKERS,
        [
          Query.equal('verificationStatus', 'pending'),
          Query.limit(50)
        ]
      );

      const stats: DashboardStats = {
        totalUsers: usersResponse.total || 0,
        activeWorkers: workersResponse.documents.length,
        totalClients: clientsResponse.total || 0,
        activeClients: activeClients.length,
        pendingVerifications: pendingResponse.documents.length,
        systemHealth: 98, // Mock for now - could be real health check
        userGrowth: '+12%', // Mock - would calculate from historical data
        workerGrowth: '+5%', // Mock - would calculate from historical data
        clientGrowth: '+8%' // Mock - would calculate from historical data
      };

      this.setCache(cacheKey, stats, this.CACHE_TTL.stats);
      return stats;

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      
      // Return mock data on error
      return {
        totalUsers: 0,
        activeWorkers: 0,
        totalClients: 0,
        activeClients: 0,
        pendingVerifications: 0,
        systemHealth: 0,
        userGrowth: 'N/A',
        workerGrowth: 'N/A',
        clientGrowth: 'N/A'
      };
    }
  }

  // Get recent registrations with caching
  async getRecentRegistrations(limit: number = 10): Promise<RecentRegistration[]> {
    const cacheKey = `recent-registrations-${limit}`;
    const cached = this.getCache<RecentRegistration[]>(cacheKey);
    if (cached) return cached;

    try {
      // Get recent workers (they need approval)
      const workersResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WORKERS,
        [
          Query.orderDesc('$createdAt'),
          Query.limit(limit),
          Query.equal('verificationStatus', 'pending')
        ]
      );

      const registrations: RecentRegistration[] = workersResponse.documents.map(worker => ({
        id: worker.$id,
        name: worker.name || `${worker.firstName} ${worker.lastName}`.trim() || 'Unknown',
        type: 'worker' as const,
        category: worker.categories?.[0] || 'General',
        status: 'pending' as const,
        createdAt: worker.$createdAt,
        timeAgo: this.getTimeAgo(worker.$createdAt)
      }));

      this.setCache(cacheKey, registrations, this.CACHE_TTL.registrations);
      return registrations;

    } catch (error) {
      console.error('Error fetching recent registrations:', error);
      return [];
    }
  }

  // Get system alerts
  async getSystemAlerts(): Promise<SystemAlert[]> {
    const cacheKey = 'system-alerts';
    const cached = this.getCache<SystemAlert[]>(cacheKey);
    if (cached) return cached;

    // For now, return mock alerts - in production, these would come from monitoring systems
    const alerts: SystemAlert[] = [
      {
        id: '1',
        type: 'success',
        title: 'Database Backup Complete',
        message: 'Daily backup completed successfully',
        timestamp: new Date().toISOString(),
        icon: 'check'
      },
      {
        id: '2',
        type: 'warning',
        title: 'High API Usage',
        message: 'API usage is approaching the daily limit',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        icon: 'alert'
      }
    ];

    this.setCache(cacheKey, alerts, this.CACHE_TTL.alerts);
    return alerts;
  }

  // Get all dashboard data in parallel for faster loading
  async getDashboardData(): Promise<{
    stats: DashboardStats;
    registrations: RecentRegistration[];
    alerts: SystemAlert[];
  }> {
    try {
      const [stats, registrations, alerts] = await Promise.all([
        this.getDashboardStats(),
        this.getRecentRegistrations(5),
        this.getSystemAlerts()
      ]);

      return { stats, registrations, alerts };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  }

  // Prefetch data for faster subsequent loads
  async prefetchData(): Promise<void> {
    try {
      // Fire and forget - don't wait for results
      this.getDashboardData().catch(error => {
        console.warn('Prefetch failed:', error);
      });
    } catch (error) {
      // Ignore prefetch errors
    }
  }

  // Clear cache (useful for manual refresh)
  clearCache(): void {
    this.cache.clear();
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
      return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
    } else if (hours < 24) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else {
      return days === 1 ? '1 day ago' : `${days} days ago`;
    }
  }

  // Health check for the service
  async healthCheck(): Promise<boolean> {
    try {
      // Simple ping to database
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

export const adminDashboardService = new AdminDashboardService(); 