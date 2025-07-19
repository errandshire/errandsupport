import { databases, COLLECTIONS } from './appwrite';
import { Query } from 'appwrite';

export interface ClientStats {
  totalBookings: number;
  completedTasks: number;
  activeBookings: number;
  pendingTasks: number;
  completionRate: number;
  monthlySpending: number;
  totalSpent: number;
  avgRating: number;
}

export interface RecentBooking {
  id: string;
  service: string;
  worker: string;
  workerAvatar?: string;
  date: string;
  status: string;
  price: string;
  rating?: number;
  urgency?: string;
  location?: string;
  timeAgo: string;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: 'workers' | 'bookings' | 'messages' | 'wallet' | 'settings';
  color: string;
  count?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ClientDashboardService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = {
    stats: 3 * 60 * 1000, // 3 minutes
    bookings: 2 * 60 * 1000, // 2 minutes
    actions: 5 * 60 * 1000, // 5 minutes
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

  // Get client statistics with caching
  async getClientStats(userId: string): Promise<ClientStats> {
    const cacheKey = `client-stats-${userId}`;
    const cached = this.getCache<ClientStats>(cacheKey);
    if (cached) return cached;

    try {
      // Fetch bookings for this client
      const bookingsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        [
          Query.equal('clientId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(100) // Reasonable limit for stats calculation
        ]
      );

      const bookings = bookingsResponse.documents;
      
      // Calculate stats
      const totalBookings = bookings.length;
      const completedTasks = bookings.filter(b => b.status === 'completed').length;
      const activeBookings = bookings.filter(b => 
        ['confirmed', 'accepted', 'in_progress'].includes(b.status)
      ).length;
      const pendingTasks = bookings.filter(b => 
        ['confirmed', 'accepted'].includes(b.status)
      ).length;
      
      const completionRate = totalBookings > 0 ? (completedTasks / totalBookings) * 100 : 0;
      
      // Calculate spending
      const totalSpent = bookings.reduce((sum, b) => sum + (b.budgetAmount || 0), 0);
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const monthlySpending = bookings
        .filter(b => new Date(b.$createdAt) >= thisMonth)
        .reduce((sum, b) => sum + (b.budgetAmount || 0), 0);

      // Calculate average rating (from completed bookings)
      const ratedBookings = bookings.filter(b => b.clientRating && b.clientRating > 0);
      const avgRating = ratedBookings.length > 0
        ? ratedBookings.reduce((sum, b) => sum + b.clientRating, 0) / ratedBookings.length
        : 0;

      const stats: ClientStats = {
        totalBookings,
        completedTasks,
        activeBookings,
        pendingTasks,
        completionRate: Math.round(completionRate),
        monthlySpending,
        totalSpent,
        avgRating: Math.round(avgRating * 10) / 10 // Round to 1 decimal
      };

      this.setCache(cacheKey, stats, this.CACHE_TTL.stats);
      return stats;

    } catch (error) {
      console.error('Error fetching client stats:', error);
      
      // Return default stats on error
      return {
        totalBookings: 0,
        completedTasks: 0,
        activeBookings: 0,
        pendingTasks: 0,
        completionRate: 0,
        monthlySpending: 0,
        totalSpent: 0,
        avgRating: 0
      };
    }
  }

  // Get recent bookings with caching
  async getRecentBookings(userId: string, limit: number = 5): Promise<RecentBooking[]> {
    const cacheKey = `recent-bookings-${userId}-${limit}`;
    const cached = this.getCache<RecentBooking[]>(cacheKey);
    if (cached) return cached;

    try {
      const bookingsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        [
          Query.equal('clientId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(limit)
        ]
      );

      // Get worker info for each booking in parallel
      const bookingsWithWorkers = await Promise.all(
        bookingsResponse.documents.map(async (booking) => {
          let workerName = 'Worker';
          let workerAvatar = '';

          try {
            if (booking.workerId) {
              const worker = await databases.getDocument(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                COLLECTIONS.USERS,
                booking.workerId
              );
              workerName = worker.name || worker.displayName || 'Worker';
              workerAvatar = worker.avatar || worker.profileImage || '';
            }
          } catch (error) {
            console.warn('Could not fetch worker info:', error);
          }

          return {
            id: booking.$id,
            service: booking.title || 'Service Booking',
            worker: workerName,
            workerAvatar,
            date: new Date(booking.scheduledDate || booking.$createdAt).toLocaleString(),
            status: booking.status || 'pending',
            price: `₦${(booking.budgetAmount || 0).toLocaleString()}`,
            rating: booking.clientRating || 0,
            urgency: booking.urgency || 'medium',
            location: booking.locationAddress || booking.location || '',
            timeAgo: this.getTimeAgo(booking.$createdAt)
          };
        })
      );

      this.setCache(cacheKey, bookingsWithWorkers, this.CACHE_TTL.bookings);
      return bookingsWithWorkers;

    } catch (error) {
      console.error('Error fetching recent bookings:', error);
      return [];
    }
  }

  // Get quick actions for the dashboard
  async getQuickActions(userId: string): Promise<QuickAction[]> {
    const cacheKey = `quick-actions-${userId}`;
    const cached = this.getCache<QuickAction[]>(cacheKey);
    if (cached) return cached;

    try {
      // Get unread messages count
      let unreadMessages = 0;
      try {
        const messagesResponse = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.MESSAGES,
          [
            Query.equal('recipientId', userId),
            Query.equal('isRead', false),
            Query.limit(50)
          ]
        );
        unreadMessages = messagesResponse.documents.length;
      } catch (error) {
        console.warn('Could not fetch messages count:', error);
      }

      // Get active bookings count
      let activeBookings = 0;
      try {
        const activeResponse = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.BOOKINGS,
          [
            Query.equal('clientId', userId),
            Query.equal('status', 'in_progress'),
            Query.limit(10)
          ]
        );
        activeBookings = activeResponse.documents.length;
      } catch (error) {
        console.warn('Could not fetch active bookings:', error);
      }

      const actions: QuickAction[] = [
        {
          id: 'find-workers',
          title: 'Find Workers',
          description: 'Browse and hire service providers',
          href: '/workers',
          icon: 'workers',
          color: 'bg-emerald-500'
        },
        {
          id: 'view-bookings',
          title: 'My Bookings',
          description: 'View and manage your bookings',
          href: '/client/bookings',
          icon: 'bookings',
          color: 'bg-blue-500',
          count: activeBookings > 0 ? activeBookings : undefined
        },
        {
          id: 'messages',
          title: 'Messages',
          description: 'Chat with your service providers',
          href: '/client/messages',
          icon: 'messages',
          color: 'bg-purple-500',
          count: unreadMessages > 0 ? unreadMessages : undefined
        },
        {
          id: 'wallet',
          title: 'My Wallet',
          description: 'Manage payments and balance',
          href: '/client/wallet',
          icon: 'wallet',
          color: 'bg-orange-500'
        }
      ];

      this.setCache(cacheKey, actions, this.CACHE_TTL.actions);
      return actions;

    } catch (error) {
      console.error('Error fetching quick actions:', error);
      
      // Return default actions on error
      return [
        {
          id: 'find-workers',
          title: 'Find Workers',
          description: 'Browse and hire service providers',
          href: '/workers',
          icon: 'workers',
          color: 'bg-emerald-500'
        },
        {
          id: 'view-bookings',
          title: 'My Bookings',
          description: 'View and manage your bookings',
          href: '/client/bookings',
          icon: 'bookings',
          color: 'bg-blue-500'
        }
      ];
    }
  }

  // Get all dashboard data in parallel
  async getDashboardData(userId: string): Promise<{
    stats: ClientStats;
    recentBookings: RecentBooking[];
    quickActions: QuickAction[];
  }> {
    try {
      const [stats, recentBookings, quickActions] = await Promise.all([
        this.getClientStats(userId),
        this.getRecentBookings(userId, 5),
        this.getQuickActions(userId)
      ]);

      return { stats, recentBookings, quickActions };
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

export const clientDashboardService = new ClientDashboardService(); 