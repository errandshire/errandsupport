import { databases, COLLECTIONS } from './appwrite';
import { ID } from 'appwrite';
import { User, Notification, NotificationType } from './types';

export interface EmailNotificationData {
  to: string;
  subject: string;
  message: string;
  type: NotificationType;
  data?: Record<string, any>;
}

export interface NotificationServiceConfig {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  batchEmailDelay: number; // Delay in minutes for batching emails
}

export class NotificationService {
  private static instance: NotificationService;
  private config: NotificationServiceConfig;
  private emailQueue: Map<string, EmailNotificationData[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.config = {
      emailEnabled: true,
      inAppEnabled: true,
      batchEmailDelay: 5 // 5 minutes delay for batching
    };
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Create in-app notification
  async createInAppNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    if (!this.config.inAppEnabled) return;

    try {
      const notification: Omit<Notification, '$id' | '$createdAt' | '$updatedAt' | '$permissions' | '$databaseId' | '$collectionId'> = {
        userId,
        type,
        title,
        message,
        data: data || {},
        isRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.NOTIFICATIONS || 'notifications',
        ID.unique(),
        notification
      );
    } catch (error) {
      console.error('Error creating in-app notification:', error);
    }
  }

  // Send email notification (placeholder - would integrate with actual email service)
  private async sendEmailNotification(emailData: EmailNotificationData): Promise<void> {
    if (!this.config.emailEnabled) return;

    try {
      // This would integrate with your email service (e.g., Resend, SendGrid, etc.)
      console.log('Sending email notification:', emailData);
      
      // For now, we'll just log the email data
      // In production, you would implement actual email sending here
      
      // Example implementation with fetch to your email API:
      /*
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      */
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  // Batch email notifications to avoid spam
  private async batchEmailNotification(userId: string, emailData: EmailNotificationData): Promise<void> {
    // Add to queue
    if (!this.emailQueue.has(userId)) {
      this.emailQueue.set(userId, []);
    }
    this.emailQueue.get(userId)!.push(emailData);

    // Clear existing timer
    if (this.batchTimers.has(userId)) {
      clearTimeout(this.batchTimers.get(userId)!);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      const queuedEmails = this.emailQueue.get(userId) || [];
      if (queuedEmails.length > 0) {
        // Send batched email
        const batchedEmail: EmailNotificationData = {
          to: emailData.to,
          subject: queuedEmails.length > 1 
            ? `You have ${queuedEmails.length} new notifications`
            : queuedEmails[0].subject,
          message: queuedEmails.length > 1
            ? this.createBatchedEmailMessage(queuedEmails)
            : queuedEmails[0].message,
          type: 'system_announcement',
          data: { batchCount: queuedEmails.length }
        };

        await this.sendEmailNotification(batchedEmail);
      }

      // Clean up
      this.emailQueue.delete(userId);
      this.batchTimers.delete(userId);
    }, this.config.batchEmailDelay * 60 * 1000); // Convert minutes to milliseconds

    this.batchTimers.set(userId, timer);
  }

  // Create batched email message
  private createBatchedEmailMessage(emails: EmailNotificationData[]): string {
    let message = 'You have new notifications:\n\n';
    
    emails.forEach((email, index) => {
      message += `${index + 1}. ${email.subject}\n   ${email.message}\n\n`;
    });

    message += 'Visit the app to view all your notifications.';
    return message;
  }

  // Handle new message notification
  async handleNewMessageNotification(
    recipientId: string,
    recipientEmail: string,
    senderName: string,
    messageContent: string,
    conversationId: string
  ): Promise<void> {
    const title = `New message from ${senderName}`;
    const message = `${senderName} sent you a message: "${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}"`;

    // Create in-app notification
    await this.createInAppNotification(
      recipientId,
      'new_message',
      title,
      message,
      { conversationId, senderName }
    );

    // Send email notification (batched)
    await this.batchEmailNotification(recipientId, {
      to: recipientEmail,
      subject: title,
      message: `${message}\n\nClick here to reply: ${process.env.NEXT_PUBLIC_APP_URL}/messages`,
      type: 'new_message',
      data: { conversationId, senderName }
    });
  }

  // Handle file shared notification
  async handleFileSharedNotification(
    recipientId: string,
    recipientEmail: string,
    senderName: string,
    fileName: string,
    fileType: string,
    conversationId: string
  ): Promise<void> {
    const title = `${senderName} shared a file`;
    const message = `${senderName} shared a ${fileType} file: ${fileName}`;

    // Create in-app notification
    await this.createInAppNotification(
      recipientId,
      'file_shared',
      title,
      message,
      { conversationId, senderName, fileName, fileType }
    );

    // Send email notification (batched)
    await this.batchEmailNotification(recipientId, {
      to: recipientEmail,
      subject: title,
      message: `${message}\n\nView the file: ${process.env.NEXT_PUBLIC_APP_URL}/messages`,
      type: 'file_shared',
      data: { conversationId, senderName, fileName, fileType }
    });
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.NOTIFICATIONS || 'notifications',
        notificationId,
        {
          isRead: true,
          updatedAt: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Get user notifications
  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.NOTIFICATIONS || 'notifications',
        [
          { type: 'equal', attribute: 'userId', value: userId },
          { type: 'orderDesc', attribute: 'createdAt' },
          { type: 'limit', value: limit }
        ]
      );

      return response.documents as Notification[];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  // Clear all timers (for cleanup)
  cleanup(): void {
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();
    this.emailQueue.clear();
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance(); 