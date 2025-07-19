import { databases } from './appwrite';
import { Query } from 'appwrite';
import { COLLECTIONS } from './appwrite';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
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
          Query.orderDesc('createdAt'),
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

  static async createNotification(notification: Partial<Notification>): Promise<void> {
    if (!notification.userId || !notification.message) {
      console.warn('Invalid notification data');
      return;
    }

    try {
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.NOTIFICATIONS,
        'unique()',
        {
          ...notification,
          type: notification.type || 'info',
          isRead: false,
          createdAt: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }
}

export const notificationService = NotificationService; 