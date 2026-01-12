import { databases, DATABASE_ID, COLLECTIONS } from './appwrite';
import { Query, ID } from 'appwrite';
import { emailService } from './email-service';
import { TermiiSMSService } from './termii-sms.service';
import { notificationService } from './notification-service';

/**
 * Broadcast Service
 * Handles admin broadcast messaging to users via Email, SMS, and In-app notifications
 */

export interface BroadcastFilters {
  role: 'worker' | 'client' | 'all';
  verificationStatus?: string[]; // ['verified', 'pending', 'rejected']
  isActive?: boolean;
  registrationDate?: {
    from: string; // ISO date
    to: string;   // ISO date
  };
}

export interface BroadcastMessage {
  title: string;
  content: string; // Plain text
  htmlContent: string; // Rich HTML
}

export interface BroadcastChannels {
  email: boolean;
  sms: boolean;
  inApp: boolean;
}

export interface BroadcastResult {
  success: boolean;
  broadcastId?: string;
  stats: {
    totalTargeted: number;
    emailsSent: number;
    emailsFailed: number;
    smsSent: number;
    smsFailed: number;
    inAppSent: number;
    inAppFailed: number;
  };
  estimatedCost: number;
  message: string;
}

export interface BroadcastTemplate {
  $id?: string;
  adminId: string;
  name: string;
  title: string;
  content: string;
  htmlContent: string;
  category: 'worker' | 'client' | 'general';
  createdAt?: string;
  updatedAt?: string;
}

export interface BroadcastHistory {
  $id: string;
  adminId: string;
  title: string;
  content: string;
  htmlContent: string;
  channels: string[];
  targetRole: string;
  filters: any;
  recipientCount: number;
  emailsSent: number;
  smsSent: number;
  inAppSent: number;
  emailsFailed: number;
  smsFailed: number;
  estimatedCost: number;
  status: 'sent' | 'sending' | 'failed';
  sentAt: string;
  createdAt: string;
}

const SMS_COST_PER_MESSAGE = 8; // ₦8 per SMS via Termii

export class BroadcastService {
  /**
   * Get targeted users based on filters
   */
  static async getTargetedUsers(filters: BroadcastFilters): Promise<any[]> {
    try {
      const queries: any[] = [Query.limit(5000)]; // Max users to query

      // Role filter
      if (filters.role === 'worker') {
        queries.push(Query.equal('role', 'worker'));
      } else if (filters.role === 'client') {
        queries.push(Query.equal('role', 'client'));
      }
      // 'all' = no role filter

      // Active status filter
      if (filters.isActive !== undefined) {
        queries.push(Query.equal('status', filters.isActive ? 'active' : 'inactive'));
      }

      // Registration date filter
      if (filters.registrationDate) {
        queries.push(Query.greaterThanEqual('$createdAt', filters.registrationDate.from));
        queries.push(Query.lessThanEqual('$createdAt', filters.registrationDate.to));
      }

      // Query USERS collection
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS,
        queries
      );

      let users = response.documents;

      // Verification status filter (only for workers)
      if (filters.verificationStatus && filters.verificationStatus.length > 0 && filters.role === 'worker') {
        // Need to cross-reference with WORKERS collection
        const workerQueries = [
          Query.limit(5000),
          Query.equal('verificationStatus', filters.verificationStatus)
        ];

        const workersResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.WORKERS,
          workerQueries
        );

        // Filter users to only include those with matching verification status
        const verifiedWorkerUserIds = workersResponse.documents.map((w: any) => w.userId);
        users = users.filter(u => verifiedWorkerUserIds.includes(u.$id));
      }

      console.log(`📊 Filtered ${users.length} users matching criteria`);
      return users;

    } catch (error) {
      console.error('Error fetching targeted users:', error);
      throw error;
    }
  }

  /**
   * Calculate SMS cost
   */
  static calculateSMSCost(recipientCount: number): number {
    return recipientCount * SMS_COST_PER_MESSAGE;
  }

  /**
   * Generate preview of how message will appear in each channel
   */
  static generatePreview(message: BroadcastMessage): {
    email: string;
    sms: string;
    inApp: string;
  } {
    // SMS - strip HTML and truncate
    const smsText = this.htmlToPlainText(message.htmlContent || message.content);
    const smsTruncated = smsText.length > 160
      ? smsText.substring(0, 157) + '...'
      : smsText;

    return {
      email: message.htmlContent,
      sms: smsTruncated,
      inApp: message.content
    };
  }

  /**
   * Convert HTML to plain text
   */
  static htmlToPlainText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Send broadcast to all targeted users
   */
  static async sendBroadcast(params: {
    adminId: string;
    message: BroadcastMessage;
    channels: BroadcastChannels;
    filters: BroadcastFilters;
    users: any[];
  }): Promise<BroadcastResult> {
    const { adminId, message, channels, filters, users } = params;

    const stats = {
      totalTargeted: users.length,
      emailsSent: 0,
      emailsFailed: 0,
      smsSent: 0,
      smsFailed: 0,
      inAppSent: 0,
      inAppFailed: 0,
    };

    try {
      // Create broadcast log entry
      const broadcastId = ID.unique();

      // Note: Due to Appwrite attribute limits, we store content in filters as JSON
      const broadcastLog = {
        adminId,
        title: message.title,
        channels: Object.keys(channels).filter(key => channels[key as keyof BroadcastChannels]),
        targetRole: filters.role,
        filters: JSON.stringify({
          ...filters,
          _content: message.content, // Store content here due to attribute limit
          _htmlContent: message.htmlContent, // Store HTML here
        }),
        recipientCount: users.length,
        emailsSent: 0,
        smsSent: 0,
        inAppSent: 0,
        emailsFailed: 0,
        smsFailed: 0,
        estimatedCost: channels.sms ? this.calculateSMSCost(users.length) : 0,
        status: 'sending',
        sentAt: new Date().toISOString(),
      };

      try {
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.BROADCAST_MESSAGES,
          broadcastId,
          broadcastLog
        );
        console.log('📝 Broadcast log saved:', broadcastId);
      } catch (error) {
        console.error('❌ Failed to save broadcast log:', error);
        // Continue anyway - don't let logging failure stop the broadcast
      }

      // Process users in batches
      const batchSize = 50;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);

        console.log(`📤 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} users)`);

        // Send to each user in batch
        await Promise.all(batch.map(async (user) => {
          try {
            // Send in-app notification
            if (channels.inApp) {
              try {
                await notificationService.createNotification({
                  userId: user.$id,
                  title: message.title,
                  message: this.htmlToPlainText(message.htmlContent || message.content),
                  type: 'info',
                  actionUrl: user.role === 'worker' ? '/worker/dashboard' : '/client/dashboard',
                  idempotencyKey: `broadcast_${broadcastId}_${user.$id}`,
                });
                stats.inAppSent++;
              } catch (error) {
                console.error(`❌ In-app notification failed for user ${user.$id}:`, error);
                stats.inAppFailed++;
              }
            }

            // Send email
            if (channels.email && user.email) {
              try {
                const emailHtml = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <style>
                      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                      .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
                      .content { padding: 30px; background-color: #f9fafb; }
                      .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <h1>ErrandWork</h1>
                      </div>
                      <div class="content">
                        ${message.htmlContent}
                      </div>
                      <div class="footer">
                        <p>Best regards,<br>The ErrandWork Team</p>
                      </div>
                    </div>
                  </body>
                  </html>
                `;

                await fetch('/api/email/send', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: user.email,
                    subject: message.title,
                    html: emailHtml,
                    type: 'admin_broadcast',
                  }),
                });
                stats.emailsSent++;
              } catch (error) {
                console.error(`❌ Email failed for user ${user.$id}:`, error);
                stats.emailsFailed++;
              }
            }

            // Send SMS
            if (channels.sms && user.phone) {
              try {
                const smsText = `ErrandWork: ${message.title}\n\n${this.htmlToPlainText(message.htmlContent || message.content).substring(0, 140)}`;

                await TermiiSMSService.sendSMS({
                  to: user.phone,
                  message: smsText,
                });
                stats.smsSent++;
              } catch (error) {
                console.error(`❌ SMS failed for user ${user.$id}:`, error);
                stats.smsFailed++;
              }
            }
          } catch (error) {
            console.error(`❌ Failed to process user ${user.$id}:`, error);
          }
        }));

        // Delay between batches to avoid rate limiting
        if (i + batchSize < users.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      }

      // Update broadcast log with final stats
      try {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.BROADCAST_MESSAGES,
          broadcastId,
          {
            emailsSent: stats.emailsSent,
            smsSent: stats.smsSent,
            inAppSent: stats.inAppSent,
            emailsFailed: stats.emailsFailed,
            smsFailed: stats.smsFailed,
            status: 'sent',
          }
        );
        console.log('✅ Broadcast log updated with final stats');
      } catch (error) {
        console.error('❌ Failed to update broadcast log:', error);
      }

      console.log('✅ Broadcast complete:', stats);

      return {
        success: true,
        broadcastId,
        stats,
        estimatedCost: channels.sms ? this.calculateSMSCost(users.length) : 0,
        message: `Broadcast sent successfully to ${users.length} users`,
      };

    } catch (error) {
      console.error('Error sending broadcast:', error);
      return {
        success: false,
        stats,
        estimatedCost: channels.sms ? this.calculateSMSCost(users.length) : 0,
        message: error instanceof Error ? error.message : 'Failed to send broadcast',
      };
    }
  }

  /**
   * Save broadcast template (placeholder - requires BROADCAST_TEMPLATES collection)
   */
  static async saveTemplate(template: BroadcastTemplate): Promise<void> {
    try {
      console.log('💾 Saving template:', template);
      // TODO: Save to BROADCAST_TEMPLATES collection when created
      // await databases.createDocument(
      //   DATABASE_ID,
      //   'BROADCAST_TEMPLATES',
      //   ID.unique(),
      //   template
      // );
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  }

  /**
   * Get broadcast templates (placeholder)
   */
  static async getTemplates(adminId: string): Promise<BroadcastTemplate[]> {
    try {
      console.log('📖 Fetching templates for admin:', adminId);
      // TODO: Fetch from BROADCAST_TEMPLATES collection when created
      return [];
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  }

  /**
   * Get broadcast history
   */
  static async getBroadcastHistory(adminId: string, limit: number = 50): Promise<BroadcastHistory[]> {
    try {
      console.log('📜 Fetching broadcast history for admin:', adminId);

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BROADCAST_MESSAGES,
        [
          Query.equal('adminId', adminId),
          Query.orderDesc('sentAt'),
          Query.limit(limit),
        ]
      );

      // Parse the content from filters JSON
      const history = response.documents.map((doc: any) => {
        const filters = doc.filters ? JSON.parse(doc.filters) : {};
        const content = filters._content || '';
        const htmlContent = filters._htmlContent || '';

        return {
          $id: doc.$id,
          adminId: doc.adminId,
          title: doc.title,
          content,
          htmlContent,
          channels: doc.channels || [],
          targetRole: doc.targetRole,
          filters,
          recipientCount: doc.recipientCount || 0,
          emailsSent: doc.emailsSent || 0,
          smsSent: doc.smsSent || 0,
          inAppSent: doc.inAppSent || 0,
          emailsFailed: doc.emailsFailed || 0,
          smsFailed: doc.smsFailed || 0,
          estimatedCost: doc.estimatedCost || 0,
          status: doc.status,
          sentAt: doc.sentAt,
          createdAt: doc.$createdAt,
        } as BroadcastHistory;
      });

      return history;
    } catch (error) {
      console.error('Error fetching broadcast history:', error);
      return [];
    }
  }
}
