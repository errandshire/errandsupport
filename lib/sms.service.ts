/**
 * SMS Service using Twilio API
 * Documentation: https://www.twilio.com/docs/sms
 */

interface SendSMSParams {
  to: string; // Phone number in international format (e.g., 2348123456789)
  message: string;
}

interface SendSMSResponse {
  success: boolean;
  messageId?: string;
  message?: string;
  error?: string;
}

export class SMSService {
  private static readonly ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  private static readonly AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  private static readonly FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;
  private static readonly BASE_URL = 'https://api.twilio.com/2010-04-01';

  /**
   * Send SMS to a single phone number
   */
  static async sendSMS({ to, message }: SendSMSParams): Promise<SendSMSResponse> {
    try {
      // Validate credentials
      if (!this.ACCOUNT_SID || !this.AUTH_TOKEN || !this.FROM_NUMBER) {
        console.error('Twilio credentials not configured');
        return { success: false, error: 'SMS service not configured' };
      }

      // Clean and validate phone number
      const phoneNumber = this.formatPhoneNumber(to);
      if (!phoneNumber) {
        return { success: false, error: 'Invalid phone number format' };
      }

      // Validate message
      if (!message || message.trim().length === 0) {
        return { success: false, error: 'Message cannot be empty' };
      }

      // Truncate message if too long (max 160 characters for single SMS)
      const truncatedMessage = message.length > 160
        ? message.substring(0, 157) + '...'
        : message;

      // Create basic auth header
      const authHeader = 'Basic ' + Buffer.from(`${this.ACCOUNT_SID}:${this.AUTH_TOKEN}`).toString('base64');

      // Send SMS via Twilio API
      const response = await fetch(`${this.BASE_URL}/Accounts/${this.ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: `+${phoneNumber}`,
          From: this.FROM_NUMBER,
          Body: truncatedMessage,
        }),
      });

      const data = await response.json();

      if (response.ok && data.sid) {
        return {
          success: true,
          messageId: data.sid,
          message: 'SMS sent successfully',
        };
      } else {
        console.error('Twilio API error:', data);
        return {
          success: false,
          error: data.message || 'Failed to send SMS',
        };
      }
    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS',
      };
    }
  }

  /**
   * Send SMS to multiple phone numbers
   */
  static async sendBulkSMS(recipients: string[], message: string): Promise<SendSMSResponse[]> {
    const results = await Promise.all(
      recipients.map(phoneNumber => this.sendSMS({ to: phoneNumber, message }))
    );
    return results;
  }

  /**
   * Format phone number to international format
   * Converts 08012345678 to 2348012345678
   */
  private static formatPhoneNumber(phone: string): string | null {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Nigerian number starting with 0 (e.g., 08012345678)
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return '234' + cleaned.substring(1);
    }

    // Already in international format (e.g., 2348012345678)
    if (cleaned.startsWith('234') && cleaned.length === 13) {
      return cleaned;
    }

    // Invalid format
    return null;
  }

  /**
   * Validate Nigerian phone number
   */
  static isValidNigerianPhone(phone: string): boolean {
    const formatted = this.formatPhoneNumber(phone);
    return formatted !== null;
  }

  /**
   * Send booking notification SMS
   */
  static async sendBookingNotification(phoneNumber: string, bookingDetails: {
    workerName?: string;
    clientName?: string;
    service: string;
    date: string;
    status: string;
  }): Promise<SendSMSResponse> {
    const { workerName, clientName, service, date, status } = bookingDetails;

    let message = '';
    if (status === 'pending') {
      message = `New booking request for ${service} on ${date}. Check your dashboard for details.`;
    } else if (status === 'accepted') {
      message = `Booking confirmed! ${workerName} will provide ${service} on ${date}.`;
    } else if (status === 'completed') {
      message = `Booking completed. Please review your experience.`;
    } else if (status === 'cancelled') {
      message = `Booking for ${service} has been cancelled.`;
    }

    return this.sendSMS({ to: phoneNumber, message });
  }

  /**
   * Send dispute notification SMS
   */
  static async sendDisputeNotification(phoneNumber: string, disputeDetails: {
    bookingId: string;
    status: string;
    role: 'client' | 'worker' | 'admin';
  }): Promise<SendSMSResponse> {
    const { bookingId, status, role } = disputeDetails;

    let message = '';
    if (status === 'raised' && role === 'worker') {
      message = `A dispute has been raised for booking #${bookingId}. Please respond on the platform.`;
    } else if (status === 'responded' && role === 'admin') {
      message = `Worker has responded to dispute #${bookingId}. Review required.`;
    } else if (status === 'resolved') {
      message = `Dispute #${bookingId} has been resolved. Check your dashboard for details.`;
    }

    return this.sendSMS({ to: phoneNumber, message });
  }

  /**
   * Send payment notification SMS
   */
  static async sendPaymentNotification(phoneNumber: string, paymentDetails: {
    amount: number;
    type: 'received' | 'sent' | 'refund' | 'withdrawal';
    reference?: string;
  }): Promise<SendSMSResponse> {
    const { amount, type, reference } = paymentDetails;
    const formattedAmount = `₦${amount.toLocaleString()}`;

    let message = '';
    if (type === 'received') {
      message = `Payment received: ${formattedAmount}. Ref: ${reference}`;
    } else if (type === 'sent') {
      message = `Payment sent: ${formattedAmount}. Ref: ${reference}`;
    } else if (type === 'refund') {
      message = `Refund processed: ${formattedAmount}. Ref: ${reference}`;
    } else if (type === 'withdrawal') {
      message = `Withdrawal processed: ${formattedAmount}. Ref: ${reference}`;
    }

    return this.sendSMS({ to: phoneNumber, message });
  }

  /**
   * Send OTP SMS
   */
  static async sendOTP(phoneNumber: string, otp: string): Promise<SendSMSResponse> {
    const message = `Your ErrandSupport verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
    return this.sendSMS({ to: phoneNumber, message });
  }

  /**
   * Send welcome SMS
   */
  static async sendWelcomeSMS(phoneNumber: string, name: string, role: 'client' | 'worker'): Promise<SendSMSResponse> {
    const message = role === 'client'
      ? `Welcome ${name}! Find trusted workers for your errands on ErrandSupport. Start booking now.`
      : `Welcome ${name}! Start accepting jobs and earning on ErrandSupport. Complete your profile to get started.`;

    return this.sendSMS({ to: phoneNumber, message });
  }
}
