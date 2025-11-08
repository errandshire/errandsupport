/**
 * SMS Service using Termii API
 * Documentation: https://developers.termii.com/
 */

interface SendSMSParams {
  to: string; // Phone number in international format (e.g., 2348123456789)
  message: string;
  senderId?: string; // Optional sender ID (default from env)
}

interface SendSMSResponse {
  success: boolean;
  messageId?: string;
  message?: string;
  error?: string;
}

export class SMSService {
  private static readonly API_KEY = process.env.TERMII_API_KEY;
  private static readonly SENDER_ID = process.env.TERMII_SENDER_ID || 'ErrandSupp'; // Max 11 characters
  private static readonly BASE_URL = 'https://api.ng.termii.com/api';

  /**
   * Send SMS to a single phone number
   */
  static async sendSMS({ to, message, senderId }: SendSMSParams): Promise<SendSMSResponse> {
    try {
      // Validate API key
      if (!this.API_KEY) {
        console.error('Termii API key not configured');
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

      // Send SMS via Termii API
      const response = await fetch(`${this.BASE_URL}/sms/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber,
          from: senderId || this.SENDER_ID,
          sms: truncatedMessage,
          type: 'plain',
          channel: 'generic',
          api_key: this.API_KEY,
        }),
      });

      const data = await response.json();

      if (response.ok && data.message_id) {
        return {
          success: true,
          messageId: data.message_id,
          message: 'SMS sent successfully',
        };
      } else {
        console.error('Termii API error:', data);
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
