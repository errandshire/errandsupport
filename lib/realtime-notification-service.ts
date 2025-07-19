import { databases, client, COLLECTIONS } from './appwrite';
import { Query } from 'appwrite';
import type { Notification } from './types';

export interface NotificationUpdate {
  type: 'notification_created' | 'notification_read' | 'notification_deleted';
  notification: Notification;
  unreadCount: number;
}

class RealtimeNotificationService {
  private notifications = new Map<string, Notification[]>();
  private subscribers = new Map<string, Set<(update: NotificationUpdate) => void>>();
  private realtimeSubscription: (() => void) | null = null;
  private creatingNotifications = new Set<string>(); // Prevent duplicates

  // Initialize real-time connection
  async initialize(userId: string) {
    if (this.realtimeSubscription) {
      this.realtimeSubscription();
    }

    // Subscribe to notification collection changes
    this.realtimeSubscription = client.subscribe(
      `databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.${COLLECTIONS.NOTIFICATIONS}.documents`,
      (response) => {
        this.handleRealtimeUpdate(response, userId);
      }
    );

    // Load initial notifications
    await this.loadUserNotifications(userId);
  }

  // Handle real-time updates
  private async handleRealtimeUpdate(response: any, currentUserId: string) {
    if (response.events.includes('databases.*.collections.*.documents.*.create')) {
      const notification = response.payload as Notification;
      
      if (notification.userId === currentUserId) {
        await this.processNewNotification(notification);
      }
    }
    
    if (response.events.includes('databases.*.collections.*.documents.*.update')) {
      const notification = response.payload as Notification;
      
      if (notification.userId === currentUserId) {
        await this.processNotificationUpdate(notification);
      }
    }
  }

  // Process new notification
  private async processNewNotification(notification: Notification) {
    const userId = notification.userId;
    
    if (!this.notifications.has(userId)) {
      this.notifications.set(userId, []);
    }
    
    const userNotifications = this.notifications.get(userId)!;
    
    // Check for duplicates
    const isDuplicate = userNotifications.some(n => n.$id === notification.$id);
    if (isDuplicate) return;
    
    // Add and sort by creation date
    userNotifications.unshift(notification);
    userNotifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Keep only latest 50 notifications
    if (userNotifications.length > 50) {
      userNotifications.splice(50);
    }
    
    // Notify subscribers
    this.notifySubscribers(userId, {
      type: 'notification_created',
      notification,
      unreadCount: this.getUnreadCount(userId)
    });
  }

  // Process notification updates
  private async processNotificationUpdate(notification: Notification) {
    const userId = notification.userId;
    const userNotifications = this.notifications.get(userId);
    
    if (userNotifications) {
      const index = userNotifications.findIndex(n => n.$id === notification.$id);
      if (index !== -1) {
        userNotifications[index] = notification;
        
        this.notifySubscribers(userId, {
          type: 'notification_read',
          notification,
          unreadCount: this.getUnreadCount(userId)
        });
      }
    }
  }

  // Load user notifications
  async loadUserNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.NOTIFICATIONS,
        [
          Query.equal('userId', userId),
          Query.orderDesc('createdAt'),
          Query.limit(limit)
        ]
      );

      const notifications = response.documents as unknown as Notification[];
      this.notifications.set(userId, notifications);
      
      return notifications;
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.notifications.set(userId, []);
      return [];
    }
  }

  // Create notification with deduplication
  async createNotification(notificationData: Partial<Notification>): Promise<boolean> {
    if (!notificationData.userId || !notificationData.message) {
      console.warn('Invalid notification data');
      return false;
    }

    // Create deduplication key
    const dedupeKey = `${notificationData.userId}_${notificationData.title}_${notificationData.message.substring(0, 50)}`;
    
    if (this.creatingNotifications.has(dedupeKey)) {
      return false; // Already creating this notification
    }

    this.creatingNotifications.add(dedupeKey);

    try {
      // Check for recent duplicate notifications (last 5 minutes)
      const recentNotifications = await this.getRecentNotifications(notificationData.userId!, 5);
      const isDuplicate = recentNotifications.some(n => 
        n.title === notificationData.title && 
        n.message === notificationData.message &&
        (Date.now() - new Date(n.createdAt).getTime()) < 300000 // 5 minutes
      );

      if (isDuplicate) {
        return false;
      }

      const { ID } = await import('appwrite');
      
      const notification = {
        id: ID.unique(),
        ...notificationData,
        type: notificationData.type || 'info',
        isRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.NOTIFICATIONS,
        notification.id,
        notification
      );

      return true;
    } catch (error) {
      console.error('Error creating notification:', error);
      return false;
    } finally {
      this.creatingNotifications.delete(dedupeKey);
    }
  }

  // Get recent notifications for deduplication
  private async getRecentNotifications(userId: string, minutes: number): Promise<Notification[]> {
    const userNotifications = this.notifications.get(userId) || [];
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    
    return userNotifications.filter(n => 
      new Date(n.createdAt) > cutoffTime
    );
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.NOTIFICATIONS,
        notificationId,
        { 
          isRead: true,
          updatedAt: new Date().toISOString()
        }
      );

      // Update local cache
      const userNotifications = this.notifications.get(userId);
      if (userNotifications) {
        const notification = userNotifications.find(n => n.$id === notificationId);
        if (notification) {
          notification.isRead = true;
          notification.updatedAt = new Date().toISOString();
        }
      }

      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const userNotifications = this.notifications.get(userId) || [];
      const unreadNotifications = userNotifications.filter(n => !n.isRead);

      // Batch update
      const updatePromises = unreadNotifications.map(notification =>
        databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.NOTIFICATIONS,
          notification.$id,
          { 
            isRead: true,
            updatedAt: new Date().toISOString()
          }
        )
      );

      await Promise.all(updatePromises);

      // Update local cache
      unreadNotifications.forEach(notification => {
        notification.isRead = true;
        notification.updatedAt = new Date().toISOString();
      });

      this.notifySubscribers(userId, {
        type: 'notification_read',
        notification: unreadNotifications[0], // Use first as representative
        unreadCount: 0
      });

      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  // Get user notifications
  getUserNotifications(userId: string): Notification[] {
    return this.notifications.get(userId) || [];
  }

  // Get unread count
  getUnreadCount(userId: string): number {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.isRead).length;
  }

  // Subscribe to notifications
  subscribe(userId: string, callback: (update: NotificationUpdate) => void) {
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, new Set());
    }
    this.subscribers.get(userId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(userId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(userId);
        }
      }
    };
  }

  // Notify subscribers
  private notifySubscribers(userId: string, update: NotificationUpdate) {
    const subscribers = this.subscribers.get(userId);
    if (subscribers) {
      subscribers.forEach(callback => callback(update));
    }
  }

  // Cleanup
  cleanup() {
    if (this.realtimeSubscription) {
      this.realtimeSubscription();
      this.realtimeSubscription = null;
    }
    
    this.notifications.clear();
    this.subscribers.clear();
    this.creatingNotifications.clear();
  }
}

export const realtimeNotificationService = new RealtimeNotificationService(); 