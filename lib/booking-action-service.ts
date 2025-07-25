import { databases, COLLECTIONS } from './appwrite';
import { ID, Query } from 'appwrite';
import { EscrowService } from './escrow-service';
import { VirtualWalletService } from './virtual-wallet-service';
import { notificationService } from './notification-service';
import { emailService, EmailHelpers } from './email-service';
import { BOOKING_STATUS } from './constants';
import type { Booking } from './types';

export interface BookingActionRequest {
  bookingId: string;
  userId: string;
  userRole: 'worker' | 'client';
  action: 'accept' | 'reject' | 'start_work' | 'mark_completed' | 'confirm_completion' | 'dispute';
  reason?: string;
  rating?: {
    score: number;
    review?: string;
  };
  disputeDetails?: {
    category: string;
    description: string;
    evidence?: string[];
  };
}

export interface BookingActionResult {
  success: boolean;
  message: string;
  newStatus?: string;
  refundProcessed?: boolean;
  paymentReleased?: boolean;
  notificationsSent?: boolean;
}

export class BookingActionService {
  
  /**
   * Handle worker accepting a booking
   */
  static async acceptBooking(request: BookingActionRequest): Promise<BookingActionResult> {
    try {
      const { bookingId, userId } = request;
      
      // Get booking details
      const booking = await this.getBooking(bookingId);
      this.validateWorkerAction(booking, userId, 'accept');
      
      if (booking.status !== 'confirmed') {
        throw new Error('Booking must be in confirmed status to accept');
      }

      // Update booking status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'accepted',
          workerId: userId,
          acceptedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // Send notification to client
      await notificationService.createNotification({
        userId: booking.clientId,
        title: 'Booking Accepted!',
        message: `Your booking "${booking.title}" has been accepted by the worker.`,
        type: 'success',
        bookingId,
        actionUrl: `/client/bookings?id=${bookingId}`
      });

      // Send email notification
      try {
        const [clientInfo, workerInfo] = await Promise.all([
          databases.getDocument(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!, COLLECTIONS.USERS, booking.clientId),
          databases.getDocument(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!, COLLECTIONS.USERS, userId)
        ]);

        if (EmailHelpers.isValidEmail(clientInfo.email)) {
          await emailService.sendBookingAcceptedEmail({
            client: {
              id: clientInfo.$id,
              name: clientInfo.name,
              email: clientInfo.email
            },
            worker: {
              id: workerInfo.$id,
              name: workerInfo.name,
              email: workerInfo.email
            },
            booking: {
              id: booking.$id,
              title: booking.title,
              description: booking.description,
              scheduledDate: booking.scheduledDate,
              budgetAmount: booking.budgetAmount,
              budgetCurrency: booking.budgetCurrency,
              locationAddress: booking.locationAddress
            },
            bookingUrl: EmailHelpers.getBookingUrl(booking.$id)
          });
        }
      } catch (emailError) {
        console.error('Failed to send booking accepted email:', emailError);
        // Don't fail the booking acceptance if email fails
      }

      console.log(`✅ Booking ${bookingId} accepted by worker ${userId}`);
      
      return {
        success: true,
        message: 'Booking accepted successfully. Client has been notified.',
        newStatus: 'accepted',
        notificationsSent: true
      };

    } catch (error) {
      console.error('Error accepting booking:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to accept booking'
      };
    }
  }

  /**
   * Handle worker rejecting a booking with instant refund
   */
  static async rejectBooking(request: BookingActionRequest): Promise<BookingActionResult> {
    try {
      console.log('🔍 BookingActionService.rejectBooking called with:', request);
      
      const { bookingId, userId, reason = 'Worker declined booking' } = request;
      
      console.log('📋 Extracted values:', { bookingId, userId, reason });
      
      // Get booking details
      const booking = await this.getBooking(bookingId);
      console.log('📄 Retrieved booking:', booking);
      
      this.validateWorkerAction(booking, userId, 'reject');
      
      if (booking.status !== 'confirmed') {
        throw new Error('Booking must be in confirmed status to reject');
      }

      // Update booking status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason,
          updatedAt: new Date().toISOString()
        }
      );

      // Process instant refund to client's virtual wallet
      let refundProcessed = false;
      try {
        // Refund escrow to virtual wallet
        await EscrowService.refundEscrowPayment(bookingId, userId, reason);
        
        // Add funds to client's virtual wallet
        await VirtualWalletService.creditClientRefund(
          booking.clientId,
          booking.budgetAmount,
          bookingId,
          `Refund for rejected booking: ${booking.title}`
        );
        
        refundProcessed = true;
        console.log(`💰 Instant refund processed for booking ${bookingId}`);
      } catch (refundError) {
        console.error('Error processing refund:', refundError);
      }

      // Send notification to client
      await notificationService.createNotification({
        userId: booking.clientId,
        title: 'Booking Declined',
        message: `Your booking "${booking.title}" was declined. ${refundProcessed ? 'Refund has been added to your wallet.' : 'Refund is being processed.'}`,
        type: 'warning',
        bookingId,
        actionUrl: `/client/wallet`
      });

      // Send email notification
      await this.sendEmailNotification(
        booking.clientId,
        'Booking Declined - Refund Processed',
        `Unfortunately, your booking "${booking.title}" was declined by the worker. ${refundProcessed ? 'Your payment has been instantly refunded to your virtual wallet.' : 'Your refund is being processed and will be available shortly.'}`
      );

      console.log(`❌ Booking ${bookingId} rejected by worker ${userId}`);
      
      return {
        success: true,
        message: 'Booking rejected and refund processed successfully.',
        newStatus: 'rejected',
        refundProcessed,
        notificationsSent: true
      };

    } catch (error) {
      console.error('Error rejecting booking:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reject booking'
      };
    }
  }

  /**
   * Handle worker starting work
   */
  static async startWork(request: BookingActionRequest): Promise<BookingActionResult> {
    try {
      const { bookingId, userId } = request;
      
      // Get booking details
      const booking = await this.getBooking(bookingId);
      this.validateWorkerAction(booking, userId, 'start_work');
      
      if (booking.status !== 'accepted') {
        throw new Error('Booking must be accepted before starting work');
      }

      // Update booking status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // Send notification to client
      await notificationService.createNotification({
        userId: booking.clientId,
        title: 'Work Started',
        message: `Work has started on your booking "${booking.title}".`,
        type: 'info',
        bookingId,
        actionUrl: `/client/bookings?id=${bookingId}`
      });

      console.log(`🚀 Work started for booking ${bookingId}`);
      
      return {
        success: true,
        message: 'Work started successfully. Client has been notified.',
        newStatus: 'in_progress',
        notificationsSent: true
      };

    } catch (error) {
      console.error('Error starting work:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start work'
      };
    }
  }

  /**
   * Handle worker marking work as completed
   */
  static async markCompleted(request: BookingActionRequest): Promise<BookingActionResult> {
    try {
      const { bookingId, userId } = request;
      
      // Get booking details
      const booking = await this.getBooking(bookingId);
      this.validateWorkerAction(booking, userId, 'mark_completed');
      
      if (booking.status !== 'in_progress') {
        throw new Error('Booking must be in progress to mark as completed');
      }

      // Update booking status to worker_completed (awaiting client confirmation)
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'worker_completed',
          workerCompletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // Send notification to client for confirmation
      await notificationService.createNotification({
        userId: booking.clientId,
        title: 'Work Completed - Please Confirm',
        message: `The worker has marked your booking "${booking.title}" as completed. Please review and confirm to release payment.`,
        type: 'info',
        bookingId,
        actionUrl: `/client/bookings?id=${bookingId}`
      });

      // Send email notification
      await this.sendEmailNotification(
        booking.clientId,
        'Work Completed - Action Required',
        `The worker has completed your booking "${booking.title}". Please log in to review and confirm completion to release payment.`
      );

      console.log(`✅ Work marked completed for booking ${bookingId}, awaiting client confirmation`);
      
      return {
        success: true,
        message: 'Work marked as completed. Client has been notified to confirm.',
        newStatus: 'worker_completed',
        notificationsSent: true
      };

    } catch (error) {
      console.error('Error marking work completed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to mark work as completed'
      };
    }
  }

  /**
   * Handle client confirming completion and releasing payment
   */
  static async confirmCompletion(request: BookingActionRequest): Promise<BookingActionResult> {
    try {
      const { bookingId, userId, rating } = request;
      
      // Get booking details
      const booking = await this.getBooking(bookingId);
      this.validateClientAction(booking, userId, 'confirm_completion');
      
      if (booking.status !== 'worker_completed') {
        throw new Error('Booking must be worker completed to confirm');
      }

      // Update booking status
      const updateData: any = {
        status: 'completed',
        clientConfirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add rating if provided
      if (rating) {
        updateData.clientRating = rating.score;
        updateData.clientReview = rating.review || '';
      }

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        updateData
      );

      // Release payment from escrow to worker
      let paymentReleased = false;
      try {
        await EscrowService.releaseEscrowPayment(
          bookingId,
          userId,
          'Client confirmed completion'
        );
        paymentReleased = true;
        console.log(`💰 Payment released for booking ${bookingId}`);
      } catch (paymentError) {
        console.error('Error releasing payment:', paymentError);
      }

      // Send notification to worker
      await notificationService.createNotification({
        userId: booking.workerId,
        title: 'Payment Released!',
        message: `Client confirmed completion of "${booking.title}". Payment has been released to your account.`,
        type: 'success',
        bookingId,
        actionUrl: `/worker/earnings`
      });

      // Send email notification to worker
      await this.sendEmailNotification(
        booking.workerId,
        'Payment Released - Job Completed',
        `Great news! The client confirmed completion of your work on "${booking.title}" and your payment has been released.`
      );

      console.log(`✅ Booking ${bookingId} completed and payment released`);
      
      return {
        success: true,
        message: 'Completion confirmed and payment released successfully.',
        newStatus: 'completed',
        paymentReleased,
        notificationsSent: true
      };

    } catch (error) {
      console.error('Error confirming completion:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to confirm completion'
      };
    }
  }

  /**
   * Handle client raising a dispute
   */
  static async raiseDispute(request: BookingActionRequest): Promise<BookingActionResult> {
    try {
      const { bookingId, userId, disputeDetails } = request;
      
      if (!disputeDetails) {
        throw new Error('Dispute details are required');
      }

      // Get booking details
      const booking = await this.getBooking(bookingId);
      this.validateClientAction(booking, userId, 'dispute');
      
      if (!['worker_completed', 'completed'].includes(booking.status)) {
        throw new Error('Can only dispute completed or worker-completed bookings');
      }

      // Update booking status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'disputed',
          disputedAt: new Date().toISOString(),
          disputeCategory: disputeDetails.category,
          disputeDescription: disputeDetails.description,
          disputeEvidence: disputeDetails.evidence || [],
          updatedAt: new Date().toISOString()
        }
      );

      // Create dispute record for admin review
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.DISPUTES,
        ID.unique(),
        {
          bookingId,
          clientId: booking.clientId,
          workerId: booking.workerId,
          category: disputeDetails.category,
          description: disputeDetails.description,
          evidence: disputeDetails.evidence || [],
          status: 'pending_review',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // Send notification to worker
      await notificationService.createNotification({
        userId: booking.workerId,
        title: 'Dispute Raised',
        message: `A dispute has been raised for booking "${booking.title}". Our team will review and contact you.`,
        type: 'warning',
        bookingId
      });

      // Send notification to admin
      await notificationService.createNotification({
        userId: 'admin', // You'll need to handle admin notifications
        title: 'New Dispute Requires Review',
        message: `Dispute raised for booking "${booking.title}" - Category: ${disputeDetails.category}`,
        type: 'warning',
        bookingId,
        actionUrl: `/admin/disputes`
      });

      console.log(`⚠️ Dispute raised for booking ${bookingId}`);
      
      return {
        success: true,
        message: 'Dispute raised successfully. Our team will review and contact you within 24 hours.',
        newStatus: 'disputed',
        notificationsSent: true
      };

    } catch (error) {
      console.error('Error raising dispute:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to raise dispute'
      };
    }
  }

  /**
   * Get booking by ID
   */
  private static async getBooking(bookingId: string): Promise<any> {
    try {
      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );
      return booking;
    } catch (error) {
      throw new Error('Booking not found');
    }
  }

  /**
   * Validate worker action permissions
   */
  private static validateWorkerAction(booking: any, userId: string, action: string): void {
    console.log('🔍 validateWorkerAction debug:', {
      bookingStatus: booking.status,
      bookingWorkerId: booking.workerId,
      currentUserId: userId,
      action: action,
      isConfirmedStatus: booking.status === 'confirmed',
      isAcceptOrReject: (action === 'accept' || action === 'reject'),
      shouldAllowAction: booking.status === 'confirmed' && (action === 'accept' || action === 'reject')
    });

    // For confirmed bookings (available to all workers), allow any worker to accept/reject
    if (booking.status === 'confirmed' && (action === 'accept' || action === 'reject')) {
      console.log(`✅ Allowing ${action} action on confirmed booking by any worker`);
      return;
    }
    
    // For other statuses, the worker must be assigned to the booking
    if (booking.workerId !== userId) {
      console.log(`❌ Authorization failed - workerId mismatch:`, {
        bookingWorkerId: booking.workerId,
        currentUserId: userId,
        bookingStatus: booking.status
      });
      throw new Error('Unauthorized: You can only perform actions on your own bookings');
    }
    
    console.log(`✅ Authorization passed - worker is assigned to booking`);
  }

  /**
   * Validate client action permissions
   */
  private static validateClientAction(booking: any, userId: string, action: string): void {
    if (booking.clientId !== userId) {
      throw new Error('Unauthorized: You can only perform actions on your own bookings');
    }
  }

  /**
   * Send email notification (placeholder - implement with your email service)
   */
  private static async sendEmailNotification(userId: string, subject: string, message: string): Promise<void> {
    try {
      // Get user email
      const user = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.USERS,
        userId
      );

      // TODO: Implement email sending service
      console.log(`📧 Email notification sent to ${user.email}: ${subject}`);
      
      // You can integrate with services like:
      // - SendGrid
      // - Resend
      // - AWS SES
      // - Mailgun
      
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't throw - email failure shouldn't break the main flow
    }
  }
} 