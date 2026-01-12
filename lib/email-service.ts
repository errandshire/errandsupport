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

export interface WorkerVerificationData {
  worker: EmailUser;
  action: 'approved' | 'rejected';
  rejectionReason?: string;
  adminName?: string;
}

export interface WithdrawalRequestData {
  to: string;
  userName: string;
  amount: string;
  bankName: string;
  accountNumber: string;
  withdrawalId: string;
}

export interface WithdrawalApprovalData {
  to: string;
  userName: string;
  amount: string;
  bankName: string;
  accountNumber: string;
}

export interface WithdrawalRejectionData extends WithdrawalApprovalData {
  reason: string;
}

export interface AdminWithdrawalNotificationData {
  to: string;
  userName: string;
  userEmail: string;
  amount: string;
  bankName: string;
  accountNumber: string;
  withdrawalId: string;
}

export interface PasswordResetData {
  to: string;
  userName: string;
  resetUrl: string;
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

  static workerApproved(data: WorkerVerificationData): string {
    const content = `
      <h2>🎉 Congratulations! Your Application Has Been Approved</h2>
      <p>Hello ${data.worker.name},</p>
      <p>Great news! Your application to join ${EMAIL_CONFIG.company} as a service provider has been <strong>approved</strong>!</p>
      
      <div class="highlight">
        <p><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">APPROVED</span></p>
        <p><strong>Approved On:</strong> ${new Date().toLocaleDateString()}</p>
        ${data.adminName ? `<p><strong>Reviewed By:</strong> ${data.adminName}</p>` : ''}
      </div>
      
      <p>You can now:</p>
      <ul>
        <li>✅ Start receiving booking requests from clients</li>
        <li>✅ Set your availability and working hours</li>
        <li>✅ Update your profile and service offerings</li>
        <li>✅ Begin earning money through our platform</li>
      </ul>
      
      <a href="${EMAIL_CONFIG.baseUrl}/worker/dashboard" class="button">Access Your Dashboard</a>
      
      <p>Welcome to the ${EMAIL_CONFIG.company} community! We're excited to have you on board.</p>
      <p>If you have any questions, feel free to contact our support team.</p>
    `;
    return this.getBaseTemplate(content, 'Application Approved');
  }

  static workerRejected(data: WorkerVerificationData): string {
    const content = `
      <h2>Application Status Update</h2>
      <p>Hello ${data.worker.name},</p>
      <p>Thank you for your interest in joining ${EMAIL_CONFIG.company} as a service provider.</p>
      
      <div class="highlight">
        <p><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">NOT APPROVED</span></p>
        <p><strong>Reviewed On:</strong> ${new Date().toLocaleDateString()}</p>
        ${data.adminName ? `<p><strong>Reviewed By:</strong> ${data.adminName}</p>` : ''}
        ${data.rejectionReason ? `<p><strong>Reason:</strong> ${data.rejectionReason}</p>` : ''}
      </div>
      
      ${data.rejectionReason ? `
        <p><strong>What you can do:</strong></p>
        <ul>
          <li>Review the feedback provided above</li>
          <li>Address any issues mentioned</li>
          <li>Resubmit your application with improvements</li>
        </ul>
      ` : `
        <p>Unfortunately, your application did not meet our current requirements. This could be due to various factors including documentation completeness, experience level, or other platform criteria.</p>
      `}
      
      <p>You're welcome to reapply in the future once you've addressed any concerns. We appreciate your interest in our platform.</p>
      
      <a href="${EMAIL_CONFIG.baseUrl}/support" class="button">Contact Support</a>
      
      <p>If you have any questions about this decision, please don't hesitate to reach out to our support team.</p>
    `;
    return this.getBaseTemplate(content, 'Application Status Update');
  }

  static withdrawalRequest(data: WithdrawalRequestData): string {
    const content = `
      <h2>Withdrawal Request Submitted 💸</h2>
      <p>Hello ${data.userName},</p>
      <p>Your withdrawal request has been processed successfully!</p>

      <div class="highlight">
        <p><strong>Withdrawal Amount:</strong> <span class="amount">₦${data.amount}</span></p>
        <p><strong>Bank:</strong> ${data.bankName}</p>
        <p><strong>Account Number:</strong> ${data.accountNumber}</p>
        <p><strong>Status:</strong> <span style="color: #2563eb; font-weight: bold;">PROCESSING</span></p>
      </div>

      <p><strong>What happens next:</strong></p>
      <ul>
        <li>✅ Amount deducted from your wallet</li>
        <li>🔄 Transfer initiated to your bank account</li>
        <li>⏰ Funds arrive within 1-3 business days</li>
      </ul>

      <p>You can track your withdrawal in your wallet dashboard.</p>

      <a href="${EMAIL_CONFIG.baseUrl}/worker/wallet" class="button">View Wallet</a>
    `;
    return this.getBaseTemplate(content, 'Withdrawal Processing');
  }

  static withdrawalApproved(data: WithdrawalApprovalData): string {
    const content = `
      <h2>🎉 Withdrawal Approved - Processing Now!</h2>
      <p>Hello ${data.userName},</p>
      <p>Great news! Your withdrawal request has been <strong>approved</strong> and is now being processed.</p>
      
      <div class="highlight">
        <p><strong>Withdrawal Amount:</strong> <span class="amount">₦${data.amount}</span></p>
        <p><strong>Bank:</strong> ${data.bankName}</p>
        <p><strong>Account Number:</strong> ${data.accountNumber}</p>
        <p><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">APPROVED & PROCESSING</span></p>
      </div>
      
      <p><strong>What happens next?</strong></p>
      <ul>
        <li>✅ Your withdrawal has been approved by our admin team</li>
        <li>🔄 The transfer is being processed to your bank account</li>
        <li>⏰ Funds should appear in your account within 1-3 business days</li>
        <li>📧 You'll receive another notification once the transfer is completed</li>
      </ul>
      
      <p>Thank you for using ${EMAIL_CONFIG.company}! Your earnings are on their way to you.</p>
      
      <a href="${EMAIL_CONFIG.baseUrl}/worker/wallet" class="button">View Wallet Dashboard</a>
    `;
    return this.getBaseTemplate(content, 'Withdrawal Approved');
  }

  static withdrawalRejected(data: WithdrawalRejectionData): string {
    const content = `
      <h2>Withdrawal Request Update</h2>
      <p>Hello ${data.userName},</p>
      <p>We regret to inform you that your withdrawal request has been <strong>rejected</strong>.</p>
      
      <div class="highlight">
        <p><strong>Withdrawal Amount:</strong> <span class="amount">₦${data.amount}</span></p>
        <p><strong>Bank:</strong> ${data.bankName}</p>
        <p><strong>Account Number:</strong> ${data.accountNumber}</p>
        <p><strong>Status:</strong> <span style="color: #dc2626; font-weight: bold;">REJECTED</span></p>
        <p><strong>Reason:</strong> ${data.reason}</p>
        <p><strong>Account Status:</strong> <span style="color: #059669; font-weight: bold;">AMOUNT RETURNED</span></p>
      </div>
      
      <p><strong>What this means:</strong></p>
      <ul>
        <li>💰 Your funds have been returned to your available balance</li>
        <li>🔄 You can submit a new withdrawal request if needed</li>
        <li>📞 Contact support if you need clarification on the rejection reason</li>
        <li>✅ The deducted amount is now back in your wallet</li>
      </ul>
      
      <p>We apologize for any inconvenience. If you believe this is an error or need assistance, please contact our support team.</p>
      
      <a href="${EMAIL_CONFIG.baseUrl}/worker/wallet" class="button">View Wallet Dashboard</a>
      <a href="${EMAIL_CONFIG.baseUrl}/support" class="button" style="background-color: #6b7280; margin-left: 10px;">Contact Support</a>
    `;
    return this.getBaseTemplate(content, 'Withdrawal Request Update');
  }

  static adminWithdrawalNotification(data: AdminWithdrawalNotificationData): string {
    const content = `
      <h2>New Withdrawal Request 💸</h2>
      <p>Hello Admin,</p>
      <p>A worker has requested a withdrawal. Transfer initiated in Paystack.</p>

      <div class="highlight">
        <p><strong>Worker:</strong> ${data.userName} (${data.userEmail})</p>
        <p><strong>Amount:</strong> <span class="amount">₦${data.amount}</span></p>
        <p><strong>Bank:</strong> ${data.bankName}</p>
        <p><strong>Account:</strong> ${data.accountNumber}</p>
        <p><strong>Status:</strong> <span style="color: #2563eb; font-weight: bold;">AWAITING OTP</span></p>
      </div>

     

      <a href="${EMAIL_CONFIG.baseUrl}/admin/withdrawals" class="button">View Paystack Details</a>
    `;
    return this.getBaseTemplate(content, 'New Withdrawal - OTP Required');
  }

  static passwordReset(data: PasswordResetData): string {
    const content = `
      <h2>Reset Your Password 🔐</h2>
      <p>Hello ${data.userName},</p>
      <p>We received a request to reset your password for your ${EMAIL_CONFIG.company} account.</p>
      
      <div class="highlight">
        <p><strong>Reset Link:</strong> This link will expire in 1 hour for security reasons</p>
        <p><strong>Requested At:</strong> ${new Date().toLocaleString()}</p>
      </div>
      
      <a href="${data.resetUrl}" class="button">Reset My Password</a>
      
      <p><strong>If you didn't request this password reset:</strong></p>
      <ul>
        <li>You can safely ignore this email</li>
        <li>Your password will remain unchanged</li>
        <li>No further action is required</li>
      </ul>
      
      <p>For security reasons, this link will expire in 1 hour. If you need to reset your password after that, please request a new reset link.</p>
    `;
    return this.getBaseTemplate(content, 'Password Reset Request');
  }

  static welcomeUser(data: { name: string; role: 'client' | 'worker'; nextStepsUrl?: string }): string {
    const headline = data.role === 'client'
      ? 'Welcome to ErrandWork!'
      : 'Welcome to the ErrandWork pro community!';

    const heroCopy = data.role === 'client'
      ? 'Find trusted, vetted workers for all your errands and projects. Secure payments, real-time updates, and dispute protection keep you in control.'
      : 'Set up your profile, showcase your skills, and start accepting well-paid errands from verified clients. Payments are secured in escrow and released once the job is done.';

    const actionLabel = data.role === 'client' ? 'Browse Workers' : 'Complete Profile';
    const actionUrl = data.nextStepsUrl || (data.role === 'client'
      ? `${EMAIL_CONFIG.baseUrl}/workers`
      : `${EMAIL_CONFIG.baseUrl}/worker/profile`);

    const tipsList = data.role === 'client'
      ? `
        <ul>
          <li>💳 Fund your wallet and book instantly.</li>
          <li>🛡️ Payments stay in escrow until you're happy.</li>
          <li>💬 Chat with workers and track progress.</li>
        </ul>
      `
      : `
        <ul>
          <li>✅ Complete your profile and verification.</li>
          <li>📅 Keep your availability updated.</li>
          <li>💼 Deliver great service to earn top reviews.</li>
        </ul>
      `;

    const content = `
      <h2>${headline}</h2>
      <p>Hello ${data.name},</p>
      <p>${heroCopy}</p>
      <div class="highlight">
        <p><strong>Next Steps:</strong></p>
        ${tipsList}
      </div>
      <a href="${actionUrl}" class="button">${actionLabel}</a>
    `;

    return this.getBaseTemplate(content, 'Welcome to ErrandWork');
  }

  static documentReminder(data: EmailUser): string {
    const content = `
      <h2>Complete Your Profile to Start Earning</h2>
      <p>Hello ${data.name},</p>
      <p>We noticed that your worker profile is almost complete! To start receiving bookings and earning money on ${EMAIL_CONFIG.company}, you need to upload your verification documents.</p>

      <div class="highlight">
        <p><strong>Required Documents:</strong></p>
        <ul>
          <li>📄 <strong>Valid ID Document</strong> - National ID, Passport, Driver's License, or Voter Card</li>
          <li>🤳 <strong>Selfie with ID</strong> - A clear photo of you holding your ID document</li>
          <li>📋 <strong>Additional Documents</strong> (Optional) - Certifications, references, or other credentials</li>
        </ul>
      </div>

      <p><strong>Why do we need these documents?</strong></p>
      <ul>
        <li>✅ Verify your identity and build trust with clients</li>
        <li>🛡️ Protect both you and our platform users</li>
        <li>💼 Unlock access to high-quality job opportunities</li>
        <li>⭐ Stand out with a verified badge on your profile</li>
      </ul>

      <a href="${EMAIL_CONFIG.baseUrl}/onboarding" class="button">Upload Documents Now</a>

      <p><strong>What happens after upload?</strong></p>
      <ul>
        <li>Our team will review your documents within 24-48 hours</li>
        <li>You'll receive an email notification about your verification status</li>
        <li>Once approved, you can start accepting bookings immediately!</li>
      </ul>

      <p>Don't miss out on earning opportunities. Complete your verification today!</p>
      <p>If you have any questions or need assistance, our support team is here to help.</p>
    `;
    return this.getBaseTemplate(content, 'Complete Your Profile - Upload Documents');
  }

  static jobPostedNotification(data: { workerName: string; job: { id: string; title: string; budget: number; location: string; scheduledDate: string } }): string {
    const content = `
      <h2>🎯 New Job Available!</h2>
      <p>Hello ${data.workerName},</p>
      <p>A new job has been posted that might interest you!</p>

      <div class="highlight">
        <h3>${data.job.title}</h3>
        <p><strong>Budget:</strong> <span class="amount">₦${data.job.budget.toLocaleString()}</span></p>
        <p><strong>Location:</strong> ${data.job.location}</p>
        <p><strong>Scheduled:</strong> ${new Date(data.job.scheduledDate).toLocaleDateString()}</p>
      </div>

      <a href="${EMAIL_CONFIG.baseUrl}/worker/jobs/${data.job.id}" class="button">View Job Details & Apply</a>

      <p><strong>Act fast!</strong> Jobs are assigned on a first-come, first-served basis. Apply now to increase your chances of getting selected.</p>
      <p>Make sure your profile is complete and up-to-date to stand out to clients.</p>
    `;
    return this.getBaseTemplate(content, 'New Job Available');
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

  // Worker verification emails
  async sendWorkerApprovalEmail(data: WorkerVerificationData): Promise<boolean> {
    const subject = `🎉 Welcome to ${EMAIL_CONFIG.company} - Your Application is Approved!`;
    const html = EmailTemplateBuilder.workerApproved(data);
    return this.sendEmail(data.worker.email, subject, html, 'worker_approved');
  }

  async sendWorkerRejectionEmail(data: WorkerVerificationData): Promise<boolean> {
    const subject = `Application Status Update - ${EMAIL_CONFIG.company}`;
    const html = EmailTemplateBuilder.workerRejected(data);
    return this.sendEmail(data.worker.email, subject, html, 'worker_rejected');
  }

  async sendWelcomeEmail(data: { to: string; name: string; role: 'client' | 'worker'; nextStepsUrl?: string }): Promise<boolean> {
    const subject = data.role === 'client'
      ? `Welcome ${data.name.split(' ')[0]}! Let's get your errands done`
      : `Welcome ${data.name.split(' ')[0]}! Let's start earning on ErrandWork`;
    const html = EmailTemplateBuilder.welcomeUser({
      name: data.name,
      role: data.role,
      nextStepsUrl: data.nextStepsUrl
    });
    return this.sendEmail(data.to, subject, html, 'welcome');
  }

  // Withdrawal-related emails
  async sendWithdrawalRequestEmail(data: WithdrawalRequestData): Promise<boolean> {
    const subject = `Withdrawal Request Submitted - ₦${data.amount}`;
    const html = EmailTemplateBuilder.withdrawalRequest(data);
    return this.sendEmail(data.to, subject, html, 'withdrawal_request');
  }

  async sendWithdrawalApprovedEmail(data: WithdrawalApprovalData): Promise<boolean> {
    const subject = `🎉 Withdrawal Approved - ₦${data.amount}`;
    const html = EmailTemplateBuilder.withdrawalApproved(data);
    return this.sendEmail(data.to, subject, html, 'withdrawal_approved');
  }

  async sendWithdrawalRejectedEmail(data: WithdrawalRejectionData): Promise<boolean> {
    const subject = `Withdrawal Request Update - ₦${data.amount}`;
    const html = EmailTemplateBuilder.withdrawalRejected(data);
    return this.sendEmail(data.to, subject, html, 'withdrawal_rejected');
  }

  async sendAdminWithdrawalNotification(data: AdminWithdrawalNotificationData): Promise<boolean> {
    const subject = `⚠️ New Withdrawal Request - ₦${data.amount} from ${data.userName}`;
    const html = EmailTemplateBuilder.adminWithdrawalNotification(data);
    return this.sendEmail(data.to, subject, html, 'admin_withdrawal_notification');
  }

  async sendPasswordResetEmail(data: PasswordResetData): Promise<boolean> {
    const subject = `Reset Your Password - ${EMAIL_CONFIG.company}`;
    const html = EmailTemplateBuilder.passwordReset(data);
    return this.sendEmail(data.to, subject, html, 'password_reset');
  }

  async sendDocumentReminderEmail(data: EmailUser): Promise<boolean> {
    const subject = `Complete Your Profile - Upload Verification Documents`;
    const html = EmailTemplateBuilder.documentReminder(data);
    return this.sendEmail(data.email, subject, html, 'document_reminder');
  }

  // Job posting notification email
  async sendJobPostingNotification(data: {
    to: string;
    workerName: string;
    job: { id: string; title: string; budget: number; location: string; scheduledDate: string }
  }): Promise<boolean> {
    const subject = `New Job Available: ${data.job.title}`;
    const html = EmailTemplateBuilder.jobPostedNotification({
      workerName: data.workerName,
      job: data.job
    });
    return this.sendEmail(data.to, subject, html, 'job_posted');
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