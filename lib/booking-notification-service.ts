import { databases, COLLECTIONS } from '@/lib/appwrite';
import { ID } from 'appwrite';

/**
 * Booking Notification Service
 * Handles in-app notifications and email notifications for booking updates
 */

export interface BookingNotification {
  $id?: string;
  userId: string;
  bookingId: string;
  workerId: string;
  clientId: string;
  type: 'booking_accepted' | 'work_started' | 'work_completed' | 'booking_confirmed' | 'payment_released';
  title: string;
  message: string;
  status: 'unread' | 'read';
  actionUrl?: string;
  metadata?: any;
  createdAt: string;
}

export interface EmailNotificationData {
  to: string;
  clientName: string;
  workerName: string;
  bookingTitle: string;
  bookingId: string;
  status: string;
  actionUrl?: string;
  amount?: number;
}

export class BookingNotificationService {

  /**
   * Send notification when worker accepts booking
   */
  static async notifyBookingAccepted(
    bookingId: string,
    clientId: string,
    workerId: string,
    bookingData: any
  ): Promise<void> {
    try {
      // Get worker info
      const workerInfo = await this.getWorkerInfo(workerId);
      const clientInfo = await this.getClientInfo(clientId);

      // Create in-app notification
      await this.createInAppNotification({
        userId: clientId,
        bookingId,
        workerId,
        clientId,
        type: 'booking_accepted',
        title: 'Booking Accepted! 🎉',
        message: `${workerInfo.name} has accepted your booking for "${bookingData.title}". Work will start soon!`,
        actionUrl: `/client/bookings/${bookingId}`,
        metadata: {
          workerName: workerInfo.name,
          bookingTitle: bookingData.title
        }
      });

      // Send email notification
      await this.sendEmailNotification({
        type: 'booking_accepted',
        to: clientInfo.email,
        clientName: clientInfo.name,
        workerName: workerInfo.name,
        bookingTitle: bookingData.title,
        bookingId,
        status: 'accepted',
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/client/bookings/${bookingId}`
      });

      console.log(`✅ Booking acceptance notifications sent to client ${clientId}`);

    } catch (error) {
      console.error('❌ Failed to send booking acceptance notifications:', error);
      // Don't throw - notification failure shouldn't break main flow
    }
  }

  /**
   * Send notification when worker starts work
   */
  static async notifyWorkStarted(
    bookingId: string,
    clientId: string,
    workerId: string,
    bookingData: any
  ): Promise<void> {
    try {
      const workerInfo = await this.getWorkerInfo(workerId);
      const clientInfo = await this.getClientInfo(clientId);

      // Create in-app notification
      await this.createInAppNotification({
        userId: clientId,
        bookingId,
        workerId,
        clientId,
        type: 'work_started',
        title: 'Work Started! 🚀',
        message: `${workerInfo.name} has started working on "${bookingData.title}". You can track progress in your bookings.`,
        actionUrl: `/client/bookings/${bookingId}`,
        metadata: {
          workerName: workerInfo.name,
          bookingTitle: bookingData.title
        }
      });

      // Send email notification
      await this.sendEmailNotification({
        type: 'work_started',
        to: clientInfo.email,
        clientName: clientInfo.name,
        workerName: workerInfo.name,
        bookingTitle: bookingData.title,
        bookingId,
        status: 'in_progress',
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/client/bookings/${bookingId}`
      });

      console.log(`✅ Work started notifications sent to client ${clientId}`);

    } catch (error) {
      console.error('❌ Failed to send work started notifications:', error);
    }
  }

  /**
   * Send notification when worker marks work as completed
   */
  static async notifyWorkCompleted(
    bookingId: string,
    clientId: string,
    workerId: string,
    bookingData: any
  ): Promise<void> {
    try {
      const workerInfo = await this.getWorkerInfo(workerId);
      const clientInfo = await this.getClientInfo(clientId);

      // Create in-app notification
      await this.createInAppNotification({
        userId: clientId,
        bookingId,
        workerId,
        clientId,
        type: 'work_completed',
        title: 'Work Completed! ✅',
        message: `${workerInfo.name} has marked "${bookingData.title}" as completed. Please review and confirm to release payment.`,
        actionUrl: `/client/bookings/${bookingId}`,
        metadata: {
          workerName: workerInfo.name,
          bookingTitle: bookingData.title,
          requiresAction: true
        }
      });

      // Send email notification
      await this.sendEmailNotification({
        type: 'work_completed',
        to: clientInfo.email,
        clientName: clientInfo.name,
        workerName: workerInfo.name,
        bookingTitle: bookingData.title,
        bookingId,
        status: 'worker_completed',
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/client/bookings/${bookingId}`,
        amount: bookingData.budgetAmount
      });

      console.log(`✅ Work completion notifications sent to client ${clientId}`);

    } catch (error) {
      console.error('❌ Failed to send work completion notifications:', error);
    }
  }

  /**
   * Send notification when client confirms completion and payment is released
   */
  static async notifyPaymentReleased(
    bookingId: string,
    workerId: string,
    clientId: string,
    bookingData: any,
    amount: number
  ): Promise<void> {
    try {
      const workerInfo = await this.getWorkerInfo(workerId);
      const clientInfo = await this.getClientInfo(clientId);

      // Create in-app notification for worker
      await this.createInAppNotification({
        userId: workerId,
        bookingId,
        workerId,
        clientId,
        type: 'payment_released',
        title: 'Payment Released! 💰',
        message: `Client confirmed completion of "${bookingData.title}". Payment of ₦${amount.toLocaleString()} has been released to your account.`,
        actionUrl: `/worker/earnings`,
        metadata: {
          clientName: clientInfo.name,
          bookingTitle: bookingData.title,
          amount
        }
      });

      // Send email notification to worker
      await this.sendEmailNotification({
        type: 'payment_released',
        to: workerInfo.email,
        clientName: clientInfo.name,
        workerName: workerInfo.name,
        bookingTitle: bookingData.title,
        bookingId,
        status: 'completed',
        amount
      });

      console.log(`✅ Payment release notifications sent to worker ${workerId}`);

    } catch (error) {
      console.error('❌ Failed to send payment release notifications:', error);
    }
  }

  /**
   * Create in-app notification
   */
  private static async createInAppNotification(data: Omit<BookingNotification, '$id' | 'status' | 'createdAt'>): Promise<void> {
    try {
      const notification: Omit<BookingNotification, '$id'> = {
        ...data,
        status: 'unread',
        createdAt: new Date().toISOString()
      };

      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.NOTIFICATIONS,
        ID.unique(),
        {
          ...notification,
          metadata: notification.metadata ? JSON.stringify(notification.metadata) : undefined
        }
      );

    } catch (error) {
      console.error('Error creating in-app notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification via Resend
   */
  private static async sendEmailNotification(data: EmailNotificationData & { type: string }): Promise<void> {
    try {
      const emailContent = this.generateEmailContent(data);

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'notifications@yourdomain.com',
          to: [data.to],
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Resend API error: ${error}`);
      }

      console.log(`✅ Email sent successfully to ${data.to}`);

    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
      // Don't throw - email failure shouldn't break main flow
    }
  }

  /**
   * Generate email content based on notification type
   */
  private static generateEmailContent(data: EmailNotificationData & { type: string }): {
    subject: string;
    html: string;
    text: string;
  } {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    switch (data.type) {
      case 'booking_accepted':
        return {
          subject: `Great news! ${data.workerName} accepted your booking`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #10b981;">Booking Accepted! 🎉</h1>
              <p>Hi ${data.clientName},</p>
              <p><strong>${data.workerName}</strong> has accepted your booking for "<strong>${data.bookingTitle}</strong>".</p>
              <p>Work will start soon and you'll be notified when they begin.</p>
              <div style="margin: 30px 0;">
                <a href="${data.actionUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Booking Details</a>
              </div>
              <p>Thanks for using our platform!</p>
            </div>
          `,
          text: `Hi ${data.clientName}, ${data.workerName} has accepted your booking for "${data.bookingTitle}". Work will start soon and you'll be notified when they begin. View details: ${data.actionUrl}`
        };

      case 'work_started':
        return {
          subject: `${data.workerName} started working on your booking`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #3b82f6;">Work Started! 🚀</h1>
              <p>Hi ${data.clientName},</p>
              <p><strong>${data.workerName}</strong> has started working on "<strong>${data.bookingTitle}</strong>".</p>
              <p>You can track the progress and communicate with them through your dashboard.</p>
              <div style="margin: 30px 0;">
                <a href="${data.actionUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Track Progress</a>
              </div>
              <p>Thanks for using our platform!</p>
            </div>
          `,
          text: `Hi ${data.clientName}, ${data.workerName} has started working on "${data.bookingTitle}". You can track progress through your dashboard: ${data.actionUrl}`
        };

      case 'work_completed':
        return {
          subject: `${data.workerName} completed your booking - Action Required`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #f59e0b;">Work Completed! ✅</h1>
              <p>Hi ${data.clientName},</p>
              <p><strong>${data.workerName}</strong> has marked "<strong>${data.bookingTitle}</strong>" as completed.</p>
              <p><strong>Action Required:</strong> Please review the work and confirm completion to release the payment of <strong>₦${data.amount?.toLocaleString()}</strong>.</p>
              <div style="margin: 30px 0;">
                <a href="${data.actionUrl}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review & Confirm</a>
              </div>
              <p>Thanks for using our platform!</p>
            </div>
          `,
          text: `Hi ${data.clientName}, ${data.workerName} has completed "${data.bookingTitle}". Please review and confirm to release payment of ₦${data.amount?.toLocaleString()}. Review: ${data.actionUrl}`
        };

      case 'payment_released':
        return {
          subject: `Payment Released - ₦${data.amount?.toLocaleString()} from ${data.clientName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #10b981;">Payment Released! 💰</h1>
              <p>Hi ${data.workerName},</p>
              <p><strong>${data.clientName}</strong> has confirmed completion of "<strong>${data.bookingTitle}</strong>".</p>
              <p>Your payment of <strong>₦${data.amount?.toLocaleString()}</strong> has been released and will be available in your account.</p>
              <div style="margin: 30px 0;">
                <a href="${baseUrl}/worker/earnings" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Earnings</a>
              </div>
              <p>Keep up the great work!</p>
            </div>
          `,
          text: `Hi ${data.workerName}, ${data.clientName} confirmed completion of "${data.bookingTitle}". Your payment of ₦${data.amount?.toLocaleString()} has been released. View earnings: ${baseUrl}/worker/earnings`
        };

      default:
        return {
          subject: 'Booking Update',
          html: `<p>Your booking has been updated.</p>`,
          text: 'Your booking has been updated.'
        };
    }
  }

  /**
   * Get worker information
   */
  private static async getWorkerInfo(workerId: string): Promise<any> {
    try {
      const response = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        workerId
      );
      return response;
    } catch (error) {
      console.error('Error fetching worker info:', error);
      return { name: 'Worker', email: '' };
    }
  }

  /**
   * Get client information
   */
  private static async getClientInfo(clientId: string): Promise<any> {
    try {
      const response = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        clientId
      );
      return response;
    } catch (error) {
      console.error('Error fetching client info:', error);
      return { name: 'Client', email: '' };
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(userId: string, limit: number = 50): Promise<BookingNotification[]> {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.NOTIFICATIONS,
        [
          { attribute: 'userId', value: userId },
          { attribute: '$createdAt', value: 'desc' },
          { attribute: '$limit', value: limit }
        ]
      );

      return response.documents.map(doc => ({
        ...doc,
        metadata: doc.metadata ? JSON.parse(doc.metadata) : undefined
      })) as unknown as BookingNotification[];

    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.NOTIFICATIONS,
        notificationId,
        {
          status: 'read'
        }
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.NOTIFICATIONS,
        [
          { attribute: 'userId', value: userId },
          { attribute: 'status', value: 'unread' }
        ]
      );

      return response.total;

    } catch (error) {
      console.error('Error fetching unread notification count:', error);
      return 0;
    }
  }
} 