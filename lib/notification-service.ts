import { COLLECTIONS, ID, API_BASE_URL } from './api';
import { SMSService } from './sms.service';
import { ApiService } from './api';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  // Additional fields for linking
  bookingId?: string;
  messageId?: string;
  senderId?: string;
  recipientId?: string;
  actionUrl?: string;
}

interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  bookingId?: string;
  messageId?: string;
  senderId?: string;
  recipientId?: string;
  actionUrl?: string;
  data?: any;
  idempotencyKey?: string;
  createdAt: string;
}

class NotificationService {
  static async getUserNotifications(userId: string, limit: number = 10): Promise<Notification[]> {
    if (!userId) {
      console.warn('No user ID provided for notifications');
      return [];
    }

    try {
      const response = await ApiService.request<any[]>(
        `/notifications?filter_userId=${userId}&limit=${limit}`
      );

      // Map response to Notification interface (map $id to id)
      return (response || []).map(doc => ({
        ...doc,
        id: doc.$id
      })) as unknown as Notification[];
    } catch (error) {
      // If collection doesn't exist or other errors, return empty array
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  static async markAsRead(notificationId: string): Promise<void> {
    if (!notificationId) return;

    try {
      await ApiService.request(`/notifications/${notificationId}`, {
        method: 'PUT',
        body: JSON.stringify({ isRead: true })
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  static async createNotification({
    userId,
    title,
    message,
    type = 'info',
    bookingId,
    messageId,
    senderId,
    recipientId,
    actionUrl,
    data,
    idempotencyKey
  }: Partial<Notification> & { idempotencyKey?: string; data?: any }): Promise<void> {
    if (!userId || !message) {
      console.warn('Invalid notification data:', { userId, message });
      return;
    }

    try {
      // Check for duplicate notifications using idempotency key first using VPS API
      if (idempotencyKey) {
        const existingNotification = await ApiService.request<any[]>(
          `/notifications?filter_idempotencyKey=${idempotencyKey}&limit=1`
        );

        if (existingNotification && existingNotification.length > 0) {
          console.log('Duplicate notification prevented (idempotency):', { userId, idempotencyKey });
          return;
        }
      } else {
        // Fallback: Check for recent duplicate notifications (last 5 minutes) if no idempotency key using VPS API
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const recentNotifications = await ApiService.request<any[]>(
          `/notifications?filter_userId=${userId}&filter_title=${title || 'Notification'}&filter_message=${message}&filter_createdAt_gt=${fiveMinutesAgo}&limit=1`
        );

        if (recentNotifications && recentNotifications.length > 0) {
          console.log('Duplicate notification prevented (content-based):', { userId, title, message });
          return;
        }
      }

      // Create a clean notification object with only valid fields
      const notificationData: NotificationData = {
        userId,
        title: title || 'Notification',
        message,
        type,
        isRead: false,
        bookingId,
        messageId,
        senderId,
        recipientId,
        actionUrl,
        data,
        idempotencyKey,
        createdAt: new Date().toISOString()
      };

      // Remove undefined fields
      const cleanData = Object.fromEntries(
        Object.entries(notificationData).filter(([_, value]) => value !== undefined)
      ) as NotificationData;

      // Create notification using VPS API
      await ApiService.request('/notifications', {
        method: 'POST',
        body: JSON.stringify({
          $id: ID.unique(),
          ...cleanData
        })
      });

      // Send push notification via VPS
      try {
        await fetch(`${API_BASE_URL}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            title: title || 'Notification',
            body: message,
            data: { 
              type: type || 'info', 
              actionUrl, 
              bookingId, 
              messageId, 
              senderId, 
              recipientId,
              ...(data || {})
            },
          }),
        });
      } catch (pushError) {
        console.warn('Push notification failed (non-blocking):', pushError);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error; // Re-throw to handle in calling code
    }
  }


  static async deleteNotification(notificationId: string): Promise<void> {
    if (!notificationId) return;

    try {
      await databases.deleteDocument(
        DATABASE_ID!,
        COLLECTIONS.NOTIFICATIONS,
        notificationId
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  static async clearAllNotifications(userId: string): Promise<void> {
    if (!userId) return;

    try {
      const notifications = await this.getUserNotifications(userId, 100);
      await Promise.all(
        notifications.map(notification =>
          this.deleteNotification(notification.id)
        )
      );
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }
}

export const notificationService = NotificationService; 