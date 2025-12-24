import { databases, COLLECTIONS } from './appwrite';
import { Query } from 'appwrite';
import { notificationService } from './notification-service';
import { USER_STATUS } from './constants';

export interface ClientDoc {
  $id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'client';
  status?: 'active' | 'inactive' | 'suspended';
  address?: string;
  city?: string;
  state?: string;
  avatar?: string;
  isActive?: boolean;
  isVerified?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClientStats {
  totalBookings: number;
  completedBookings: number;
  activeBookings: number;
  totalSpent: number;
  averageRating: number;
}

export interface ClientListParams {
  limit?: number;
  offset?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class AdminClientService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = {
    stats: 3 * 60 * 1000, // 3 minutes
    list: 2 * 60 * 1000, // 2 minutes
  };

  private readonly DEFAULT_LIMIT = 100;
  private readonly ACTIVE_BOOKING_STATUSES = ['confirmed', 'accepted', 'in_progress'] as const;

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

  /**
   * Get list of clients with optional filtering and pagination
   */
  async getClients(params: ClientListParams = {}): Promise<{
    clients: ClientDoc[];
    total: number;
  }> {
    const { limit = this.DEFAULT_LIMIT, offset = 0, search, status } = params;
    const cacheKey = `clients-${limit}-${offset}-${search || ''}-${status || ''}`;
    
    const cached = this.getCache<{ clients: ClientDoc[]; total: number }>(cacheKey);
    if (cached) return cached;

    try {
      const queries = [
        Query.equal('role', 'client'),
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
        Query.offset(offset)
      ];

      if (status) {
        queries.push(Query.equal('status', status));
      }

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        queries
      );

      let clients = response.documents as unknown as ClientDoc[];

      // Client-side filtering for search (if needed)
      if (search) {
        const searchLower = search.toLowerCase();
        clients = clients.filter(client => {
          const searchText = `${client.name || ''} ${client.email || ''} ${client.phone || ''} ${client.city || ''} ${client.state || ''}`.toLowerCase();
          return searchText.includes(searchLower);
        });
      }

      // Filter active clients if status filter is not applied
      if (!status) {
        clients = clients.filter(client => 
          client.status === USER_STATUS.ACTIVE || 
          (client.isActive !== false && !client.status)
        );
      }

      const result = {
        clients,
        total: response.total || clients.length
      };

      this.setCache(cacheKey, result, this.CACHE_TTL.list);
      return result;
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw new Error('Failed to fetch clients');
    }
  }

  /**
   * Get client statistics (bookings, spending, ratings)
   */
  async getClientStats(clientId: string): Promise<ClientStats> {
    const cacheKey = `client-stats-${clientId}`;
    const cached = this.getCache<ClientStats>(cacheKey);
    if (cached) return cached;

    try {
      // Fetch bookings and reviews in parallel
      const [bookingsResponse, reviewsResponse] = await Promise.all([
        databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.BOOKINGS,
          [
            Query.equal('clientId', clientId),
            Query.orderDesc('$createdAt'),
            Query.limit(100)
          ]
        ),
        databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.REVIEWS,
          [
            Query.equal('clientId', clientId),
            Query.limit(100)
          ]
        ).catch(() => ({ documents: [] })) // Gracefully handle if reviews don't exist
      ]);

      const bookings = bookingsResponse.documents;
      const totalBookings = bookings.length;
      const completedBookings = bookings.filter((b: any) => b.status === 'completed').length;
      const activeBookings = bookings.filter((b: any) => 
        this.ACTIVE_BOOKING_STATUSES.includes(b.status)
      ).length;
      
      const totalSpent = bookings.reduce(
        (sum: number, b: any) => sum + (b.budgetAmount || b.totalAmount || 0), 
        0
      );

      // Calculate average rating
      let averageRating = 0;
      if (reviewsResponse.documents.length > 0) {
        const ratings = reviewsResponse.documents
          .map((r: any) => r.rating)
          .filter((r: number) => r > 0);
        if (ratings.length > 0) {
          averageRating = ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length;
        }
      }

      const stats: ClientStats = {
        totalBookings,
        completedBookings,
        activeBookings,
        totalSpent,
        averageRating: Math.round(averageRating * 10) / 10
      };

      this.setCache(cacheKey, stats, this.CACHE_TTL.stats);
      return stats;
    } catch (error) {
      console.error('Error fetching client stats:', error);
      throw new Error('Failed to fetch client statistics');
    }
  }

  /**
   * Update client status
   */
  async updateClientStatus(
    clientId: string, 
    newStatus: 'active' | 'inactive' | 'suspended'
  ): Promise<void> {
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        clientId,
        {
          status: newStatus,
          isActive: newStatus === USER_STATUS.ACTIVE,
          updatedAt: new Date().toISOString()
        }
      );

      // Clear cache for this client
      this.clearClientCache(clientId);

      // Send notification (non-blocking)
      notificationService.createNotification({
        userId: clientId,
        title: 'Account Status Updated',
        message: `Your account status has been updated to ${newStatus}.`,
        type: newStatus === USER_STATUS.ACTIVE ? 'success' : 'warning',
        actionUrl: '/client/dashboard'
      }).catch(error => {
        console.error('Failed to create status notification:', error);
        // Don't throw - notification failure shouldn't fail the status update
      });
    } catch (error) {
      console.error('Error updating client status:', error);
      throw new Error('Failed to update client status');
    }
  }

  /**
   * Check if client has active bookings
   */
  async hasActiveBookings(clientId: string): Promise<boolean> {
    try {
      const bookingsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        [
          Query.equal('clientId', clientId),
          Query.limit(100)
        ]
      );

      return bookingsResponse.documents.some((booking: any) =>
        this.ACTIVE_BOOKING_STATUSES.includes(booking.status)
      );
    } catch (error) {
      console.error('Error checking active bookings:', error);
      // Return true to be safe (prevent deletion if check fails)
      return true;
    }
  }

  /**
   * Delete a client (only if no active bookings)
   */
  async deleteClient(clientId: string): Promise<void> {
    const hasActive = await this.hasActiveBookings(clientId);
    if (hasActive) {
      throw new Error('Cannot delete client with active bookings');
    }

    try {
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        clientId
      );

      // Clear cache
      this.clearClientCache(clientId);
    } catch (error) {
      console.error('Error deleting client:', error);
      throw new Error('Failed to delete client');
    }
  }

  /**
   * Send message to client
   */
  async sendMessageToClient(
    clientId: string,
    title: string,
    message: string
  ): Promise<void> {
    if (!title.trim() || !message.trim()) {
      throw new Error('Title and message are required');
    }

    try {
      await notificationService.createNotification({
        userId: clientId,
        title: title.trim(),
        message: message.trim(),
        type: 'info',
        actionUrl: '/client/dashboard'
      });
    } catch (error) {
      console.error('Error sending message to client:', error);
      throw new Error('Failed to send message');
    }
  }

  /**
   * Get client status (derived from status and isActive fields)
   */
  getClientStatus(client: ClientDoc): 'active' | 'inactive' | 'suspended' {
    if (client.status === USER_STATUS.SUSPENDED) return 'suspended';
    if (client.status === USER_STATUS.INACTIVE || !client.isActive) return 'inactive';
    return 'active';
  }

  /**
   * Clear cache for a specific client
   */
  clearClientCache(clientId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.includes(clientId)
    );
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const adminClientService = new AdminClientService();

