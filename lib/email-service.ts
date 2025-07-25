// Email configuration for client-side templates
const EMAIL_CONFIG = {
  from: process.env.NEXT_PUBLIC_FROM_EMAIL || 'notifications@erandwork.com',
  replyTo: process.env.NEXT_PUBLIC_REPLY_TO_EMAIL || 'support@erandwork.com',
  company: 'ErandWork',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://www.erandwork.com'
};

// Email types and interfaces
export interface EmailUser {
  id: string;
  name: string;
  email: string;
}

export interface MessageNotificationData {
  sender: EmailUser;
  recipient: EmailUser;
  messageContent: string;
  conversationUrl?: string;
}

export interface BookingEmailData {
  client: EmailUser;
  worker: EmailUser;
  booking: {
    id: string;
    title: string;
    description: string;
    scheduledDate: string;
    budgetAmount: number;
    budgetCurrency: string;
    locationAddress: string;
  };
  bookingUrl?: string;
}

export interface BookingCompletionData extends BookingEmailData {
  completedAt: string;
  rating?: number;
  review?: string;
  tip?: number;
}

// Email template builder
class EmailTemplateBuilder {
  private static getBaseTemplate(content: string, title: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .highlight { background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .amount { font-size: 18px; font-weight: bold; color: #059669; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${EMAIL_CONFIG.company}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>Best regards,<br>The ${EMAIL_CONFIG.company} Team</p>
            <p><a href="${EMAIL_CONFIG.baseUrl}">Visit our website</a> | <a href="${EMAIL_CONFIG.baseUrl}/support">Support</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static messageNotification(data: MessageNotificationData): string {
    const content = `
      <h2>New Message from ${data.sender.name}</h2>
      <p>Hello ${data.recipient.name},</p>
      <p>You've received a new message from <strong>${data.sender.name}</strong>:</p>
      <div class="highlight">
        <p><em>"${data.messageContent.length > 150 ? data.messageContent.substring(0, 150) + '...' : data.messageContent}"</em></p>
      </div>
      ${data.conversationUrl ? `<a href="${data.conversationUrl}" class="button">Reply to Message</a>` : ''}
      <p>Stay connected and respond promptly to maintain great communication with your clients and service providers.</p>
    `;
    return this.getBaseTemplate(content, 'New Message Notification');
  }

  static bookingAccepted(data: BookingEmailData): string {
    const content = `
      <h2>Great News! Your Booking Has Been Accepted</h2>
      <p>Hello ${data.client.name},</p>
      <p><strong>${data.worker.name}</strong> has accepted your booking request!</p>
      
      <div class="highlight">
        <h3>${data.booking.title}</h3>
        <p><strong>Service Provider:</strong> ${data.worker.name}</p>
        <p><strong>Scheduled Date:</strong> ${new Date(data.booking.scheduledDate).toLocaleDateString()}</p>
        <p><strong>Location:</strong> ${data.booking.locationAddress}</p>
        <p><strong>Budget:</strong> <span class="amount">${data.booking.budgetCurrency} ${data.booking.budgetAmount.toLocaleString()}</span></p>
      </div>
      
      ${data.bookingUrl ? `<a href="${data.bookingUrl}" class="button">View Booking Details</a>` : ''}
      
      <p>Your service provider will be in touch soon. You can message them directly through the platform if you have any questions.</p>
    `;
    return this.getBaseTemplate(content, 'Booking Accepted');
  }

  static bookingConfirmed(data: BookingEmailData): string {
    const content = `
      <h2>Booking Confirmed - Ready to Start!</h2>
      <p>Hello ${data.worker.name},</p>
      <p>Great news! <strong>${data.client.name}</strong> has confirmed the booking and payment is secured.</p>
      
      <div class="highlight">
        <h3>${data.booking.title}</h3>
        <p><strong>Client:</strong> ${data.client.name}</p>
        <p><strong>Scheduled Date:</strong> ${new Date(data.booking.scheduledDate).toLocaleDateString()}</p>
        <p><strong>Location:</strong> ${data.booking.locationAddress}</p>
        <p><strong>Payment Amount:</strong> <span class="amount">${data.booking.budgetCurrency} ${data.booking.budgetAmount.toLocaleString()}</span></p>
      </div>
      
      ${data.bookingUrl ? `<a href="${data.bookingUrl}" class="button">View Booking Details</a>` : ''}
      
      <p>The payment is securely held in escrow and will be released to you upon successful completion of the service.</p>
      <p>Please arrive on time and deliver excellent service. Contact the client if you have any questions.</p>
    `;
    return this.getBaseTemplate(content, 'Booking Confirmed');
  }

  static bookingCompleted(data: BookingCompletionData): string {
    const content = `
      <h2>Service Completed Successfully!</h2>
      <p>Hello ${data.client.name},</p>
      <p><strong>${data.worker.name}</strong> has marked your service as completed.</p>
      
      <div class="highlight">
        <h3>${data.booking.title}</h3>
        <p><strong>Service Provider:</strong> ${data.worker.name}</p>
        <p><strong>Completed:</strong> ${new Date(data.completedAt).toLocaleDateString()}</p>
        <p><strong>Location:</strong> ${data.booking.locationAddress}</p>
        <p><strong>Amount:</strong> <span class="amount">${data.booking.budgetCurrency} ${data.booking.budgetAmount.toLocaleString()}</span></p>
      </div>
      
      ${data.bookingUrl ? `<a href="${data.bookingUrl}" class="button">Confirm & Review Service</a>` : ''}
      
      <p>Please review the completed work and confirm satisfaction to release payment to your service provider.</p>
      <p>Your feedback helps maintain our quality standards and assists other users in making informed decisions.</p>
    `;
    return this.getBaseTemplate(content, 'Service Completed');
  }

  static paymentReleased(data: BookingEmailData): string {
    const content = `
      <h2>Payment Released - Thank You!</h2>
      <p>Hello ${data.worker.name},</p>
      <p>Congratulations! Payment for your completed service has been released.</p>
      
      <div class="highlight">
        <h3>${data.booking.title}</h3>
        <p><strong>Client:</strong> ${data.client.name}</p>
        <p><strong>Payment Amount:</strong> <span class="amount">${data.booking.budgetCurrency} ${data.booking.budgetAmount.toLocaleString()}</span></p>
      </div>
      
      <p>The payment has been transferred to your account. It may take 1-3 business days to appear in your bank account depending on your payment method.</p>
      <p>Thank you for providing excellent service through ${EMAIL_CONFIG.company}!</p>
    `;
    return this.getBaseTemplate(content, 'Payment Released');
  }

  static bookingCancelled(data: BookingEmailData, cancelledBy: 'client' | 'worker', reason?: string): string {
    const isClientCancellation = cancelledBy === 'client';
    const recipient = isClientCancellation ? data.worker : data.client;
    const canceller = isClientCancellation ? data.client : data.worker;
    
    const content = `
      <h2>Booking Cancelled</h2>
      <p>Hello ${recipient.name},</p>
      <p>Unfortunately, <strong>${canceller.name}</strong> has cancelled the following booking:</p>
      
      <div class="highlight">
        <h3>${data.booking.title}</h3>
        <p><strong>Scheduled Date:</strong> ${new Date(data.booking.scheduledDate).toLocaleDateString()}</p>
        <p><strong>Location:</strong> ${data.booking.locationAddress}</p>
        <p><strong>Amount:</strong> <span class="amount">${data.booking.budgetCurrency} ${data.booking.budgetAmount.toLocaleString()}</span></p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>
      
      ${!isClientCancellation ? '<p>Any payments made will be automatically refunded to your original payment method within 5-7 business days.</p>' : ''}
      
      <p>We apologize for any inconvenience. You can find other ${isClientCancellation ? 'service providers' : 'opportunities'} on our platform.</p>
    `;
    return this.getBaseTemplate(content, 'Booking Cancelled');
  }

  static workerCompletionNotification(data: BookingEmailData): string {
    const content = `
      <h2>Job Completed Successfully!</h2>
      <p>Hello ${data.worker.name},</p>
      <p>Great news! Your job has been completed and confirmed by the client.</p>
      
      <div class="highlight">
        <h3>${data.booking.title}</h3>
        <p><strong>Client:</strong> ${data.client.name}</p>
        <p><strong>Scheduled Date:</strong> ${new Date(data.booking.scheduledDate).toLocaleDateString()}</p>
        <p><strong>Location:</strong> ${data.booking.locationAddress}</p>
        <p><strong>Amount:</strong> <span class="amount">${data.booking.budgetCurrency} ${data.booking.budgetAmount.toLocaleString()}</span></p>
      </div>
      
      <p>Your payment will be processed according to the platform's payment schedule. Keep up the great work!</p>
    `;
    return this.getBaseTemplate(content, 'Job Completed');
  }
}

// Email service class
class EmailService {
  private async sendEmail(to: string, subject: string, html: string, type?: string): Promise<boolean> {
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          html,
          type
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to send email:', { to, subject, error: errorData.error });
        return false;
      }

      const result = await response.json();
      console.log('Email sent successfully:', { to, subject, messageId: result.messageId });
      return true;
    } catch (error) {
      console.error('Failed to send email:', { to, subject, error });
      return false;
    }
  }

  // Message notification emails
  async sendMessageNotification(data: MessageNotificationData): Promise<boolean> {
    const subject = `New message from ${data.sender.name} - ${EMAIL_CONFIG.company}`;
    const html = EmailTemplateBuilder.messageNotification(data);
    return this.sendEmail(data.recipient.email, subject, html, 'message_notification');
  }

  // Booking-related emails
  async sendBookingAcceptedEmail(data: BookingEmailData): Promise<boolean> {
    const subject = `Your booking has been accepted by ${data.worker.name}!`;
    const html = EmailTemplateBuilder.bookingAccepted(data);
    return this.sendEmail(data.client.email, subject, html, 'booking_accepted');
  }

  async sendBookingConfirmedEmail(data: BookingEmailData): Promise<boolean> {
    const subject = `Booking confirmed - ${data.booking.title}`;
    const html = EmailTemplateBuilder.bookingConfirmed(data);
    return this.sendEmail(data.worker.email, subject, html, 'booking_confirmed');
  }

  async sendBookingCompletedEmail(data: BookingCompletionData): Promise<boolean> {
    const subject = `Service completed - Please confirm and review`;
    const html = EmailTemplateBuilder.bookingCompleted(data);
    return this.sendEmail(data.client.email, subject, html, 'booking_completed');
  }

  async sendWorkerCompletionNotification(data: BookingEmailData): Promise<boolean> {
    const subject = `Job completed - ${data.booking.title}`;
    const html = EmailTemplateBuilder.workerCompletionNotification(data);
    return this.sendEmail(data.worker.email, subject, html, 'worker_completion_notification');
  }

  async sendPaymentReleasedEmail(data: BookingEmailData): Promise<boolean> {
    const subject = `Payment released - ${data.booking.budgetCurrency} ${data.booking.budgetAmount.toLocaleString()}`;
    const html = EmailTemplateBuilder.paymentReleased(data);
    return this.sendEmail(data.worker.email, subject, html, 'payment_released');
  }

  async sendBookingCancelledEmail(
    data: BookingEmailData, 
    cancelledBy: 'client' | 'worker', 
    reason?: string
  ): Promise<boolean> {
    const isClientCancellation = cancelledBy === 'client';
    const recipient = isClientCancellation ? data.worker : data.client;
    const subject = `Booking cancelled - ${data.booking.title}`;
    const html = EmailTemplateBuilder.bookingCancelled(data, cancelledBy, reason);
    return this.sendEmail(recipient.email, subject, html, 'booking_cancelled');
  }

  // Bulk email sending for notifications
  async sendBulkEmails(emails: Array<{
    to: string;
    subject: string;
    html: string;
  }>): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    // Send emails in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const promises = batch.map(async (email) => {
        const success = await this.sendEmail(email.to, email.subject, email.html, 'bulk');
        return success ? 'success' : 'failed';
      });

      const results = await Promise.all(promises);
      successful += results.filter(r => r === 'success').length;
      failed += results.filter(r => r === 'failed').length;

      // Add delay between batches to respect rate limits
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { successful, failed };
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Utility functions for common email scenarios
export const EmailHelpers = {
  // Generate URLs for email links
  getConversationUrl: (userId: string, conversationId?: string): string => {
    const path = conversationId ? `/messages?conversation=${conversationId}` : '/messages';
    return `${EMAIL_CONFIG.baseUrl}${path}`;
  },

  getBookingUrl: (bookingId: string): string => {
    return `${EMAIL_CONFIG.baseUrl}/bookings?id=${bookingId}`;
  },

  // Validate email address
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Truncate message content for email preview
  truncateMessage: (content: string, maxLength: number = 150): string => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  }
}; 