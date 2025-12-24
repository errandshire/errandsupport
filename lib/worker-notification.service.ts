import { databases } from './appwrite';
import { Query } from 'appwrite';
import { COLLECTIONS } from './appwrite';
import { emailService } from './email-service';
import { TermiiSMSService } from './termii-sms.service';
import { ID } from 'appwrite';

interface WorkerDoc {
  $id: string;
  userId: string;
  displayName?: string;
  name?: string;
  email?: string;
  phone?: string;
  idDocument?: string;
  selfieWithId?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  submittedAt?: string;
  rejectionReason?: string;
}

interface NotificationStats {
  totalWorkers: number;
  emailsSent: number;
  emailsFailed: number;
  smsSent: number;
  smsFailed: number;
  inAppSent: number;
  inAppFailed: number;
}

export class WorkerNotificationService {
  /**
   * Find all workers with incomplete documents
   * Includes workers who:
   * - Never uploaded any documents (no idDocument or selfieWithId)
   * - Were rejected and need to re-upload (verificationStatus === 'rejected')
   */
  private static async findIncompleteWorkers(): Promise<WorkerDoc[]> {
    try {
      // Get all workers
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WORKERS,
        [Query.orderDesc('$createdAt'), Query.limit(1000)]
      );

      const workers = response.documents as unknown as WorkerDoc[];

      // Filter workers with incomplete documents
      const incompleteWorkers = workers.filter(worker => {
        // Check if rejected (needs to re-upload)
        const isRejected = worker.verificationStatus === 'rejected';

        // Check if never uploaded documents
        const neverUploaded = !worker.idDocument || !worker.selfieWithId;

        // Include if rejected OR never uploaded (but exclude verified workers)
        return (isRejected || neverUploaded) && worker.verificationStatus !== 'verified';
      });

      // Fetch user data for each worker to get email and phone
      const workersWithUserData = await Promise.all(
        incompleteWorkers.map(async (worker) => {
          try {
            const user = await databases.getDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              COLLECTIONS.USERS,
              worker.userId
            );
            return {
              ...worker,
              email: user.email,
              phone: user.phone,
              displayName: worker.displayName || user.name || worker.name,
              name: user.name || worker.name
            } as WorkerDoc;
          } catch (error) {
            console.warn(`Could not fetch user data for worker ${worker.userId}:`, error);
            return worker;
          }
        })
      );

      console.log(`Found ${workersWithUserData.length} workers with incomplete documents`);
      return workersWithUserData;
    } catch (error) {
      console.error('Error fetching incomplete workers:', error);
      throw new Error('Failed to fetch workers');
    }
  }

  /**
   * Send email notification to a worker
   */
  private static async sendEmailNotification(worker: WorkerDoc): Promise<boolean> {
    try {
      const workerName = worker.displayName || worker.name || 'Worker';
      await emailService.sendDocumentReminderEmail({
        id: worker.userId,
        name: workerName,
        email: worker.email!
      });

      console.log(`✓ Email sent to ${workerName} (${worker.email})`);
      return true;
    } catch (error) {
      console.error(`✗ Failed to send email to ${worker.email}:`, error);
      return false;
    }
  }

  /**
   * Send SMS notification to a worker
   */
  private static async sendSMSNotification(worker: WorkerDoc): Promise<boolean> {
    try {
      const workerName = worker.displayName || worker.name || 'there';
      const message = `Hi ${workerName}! Complete your ErandWork profile by uploading your verification documents to start earning. Visit: ${process.env.NEXT_PUBLIC_BASE_URL}/onboarding`;

      const result = await TermiiSMSService.sendSMS({
        to: worker.phone!,
        message
      });

      if (result.success) {
        console.log(`✓ SMS sent to ${workerName} (${worker.phone})`);
      } else {
        console.error(`✗ SMS failed for ${worker.phone}:`, result.error);
      }

      return result.success;
    } catch (error) {
      console.error(`✗ Failed to send SMS to ${worker.phone}:`, error);
      return false;
    }
  }

  /**
   * Create in-app notification for a worker
   */
  private static async sendInAppNotification(worker: WorkerDoc): Promise<boolean> {
    try {
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.NOTIFICATIONS,
        ID.unique(),
        {
          userId: worker.userId,
          title: 'Complete Your Profile',
          message: 'Upload your verification documents to start receiving bookings and earning money on ErandWork.',
          type: 'warning',
          isRead: false,
          actionUrl: '/onboarding',
          createdAt: new Date().toISOString(),
          idempotencyKey: `document_reminder_${worker.userId}_${Date.now()}`
        }
      );

      console.log(`✓ In-app notification created for user ${worker.userId}`);
      return true;
    } catch (error) {
      console.error(`✗ Failed to create in-app notification for ${worker.userId}:`, error);
      return false;
    }
  }

  /**
   * Send document upload reminders to all workers with incomplete profiles
   * Sends Email + SMS + In-app notification
   */
  static async notifyIncompleteWorkers(): Promise<NotificationStats> {
    const stats: NotificationStats = {
      totalWorkers: 0,
      emailsSent: 0,
      emailsFailed: 0,
      smsSent: 0,
      smsFailed: 0,
      inAppSent: 0,
      inAppFailed: 0
    };

    try {
      // Find all workers with incomplete documents
      const incompleteWorkers = await this.findIncompleteWorkers();
      stats.totalWorkers = incompleteWorkers.length;

      if (incompleteWorkers.length === 0) {
        console.log('No workers with incomplete documents found');
        return stats;
      }

      // Send notifications to each worker
      for (const worker of incompleteWorkers) {
        // Skip worker if they have no contact info at all
        if (!worker.email && !worker.phone && !worker.userId) {
          console.warn(`Worker ${worker.$id} has no contact information, skipping`);
          stats.emailsFailed++;
          stats.smsFailed++;
          stats.inAppFailed++;
          continue;
        }

        // Send email (if they have email)
        if (worker.email) {
          const emailSent = await this.sendEmailNotification(worker);
          if (emailSent) {
            stats.emailsSent++;
          } else {
            stats.emailsFailed++;
          }
        } else {
          stats.emailsFailed++;
        }

        // Send SMS (if they have phone)
        if (worker.phone) {
          const smsSent = await this.sendSMSNotification(worker);
          if (smsSent) {
            stats.smsSent++;
          } else {
            stats.smsFailed++;
          }
        } else {
          stats.smsFailed++;
        }

        // Send in-app notification (if they have userId)
        if (worker.userId) {
          const inAppSent = await this.sendInAppNotification(worker);
          if (inAppSent) {
            stats.inAppSent++;
          } else {
            stats.inAppFailed++;
          }
        } else {
          stats.inAppFailed++;
        }

        // Add delay between workers to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('Document reminder notifications sent:', stats);
      return stats;
    } catch (error) {
      console.error('Error sending worker notifications:', error);
      throw error;
    }
  }
}
