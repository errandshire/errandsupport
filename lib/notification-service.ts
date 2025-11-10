import { databases } from './appwrite';
import { ID } from 'appwrite';
import { Query } from 'appwrite';
import { COLLECTIONS } from './appwrite';
import { SMSService } from './sms.service';

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
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.NOTIFICATIONS,
        [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(limit)
        ]
      );

      return response.documents as unknown as Notification[];
    } catch (error) {
      // If collection doesn't exist or other errors, return empty array
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  static async markAsRead(notificationId: string): Promise<void> {
    if (!notificationId) return;

    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.NOTIFICATIONS,
        notificationId,
        { isRead: true }
      );
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
    idempotencyKey
  }: Partial<Notification> & { idempotencyKey?: string }): Promise<void> {
    if (!userId || !message) {
      console.warn('Invalid notification data:', { userId, message });
      return;
    }

    try {
      // Check for duplicate notifications using idempotency key first
      if (idempotencyKey) {
        const existingNotification = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.NOTIFICATIONS,
          [
            Query.equal('idempotencyKey', idempotencyKey),
            Query.limit(1)
          ]
        );

        if (existingNotification.documents.length > 0) {
          console.log('Duplicate notification prevented (idempotency):', { userId, idempotencyKey });
          return;
        }
      } else {
        // Fallback: Check for recent duplicate notifications (last 5 minutes) if no idempotency key
        const recentNotifications = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.NOTIFICATIONS,
          [
            Query.equal('userId', userId),
            Query.equal('title', title || 'Notification'),
            Query.equal('message', message),
            Query.greaterThan('createdAt', new Date(Date.now() - 5 * 60 * 1000).toISOString()),
            Query.limit(1)
          ]
        );

        if (recentNotifications.documents.length > 0) {
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
        idempotencyKey,
        createdAt: new Date().toISOString()
      };

      // Remove undefined fields
      const cleanData = Object.fromEntries(
        Object.entries(notificationData).filter(([_, value]) => value !== undefined)
      ) as NotificationData;

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.NOTIFICATIONS,
        ID.unique(),
        cleanData
      );
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error; // Re-throw to handle in calling code
    }
  }


  static async deleteNotification(notificationId: string): Promise<void> {
    if (!notificationId) return;

    try {
      await databases.deleteDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
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