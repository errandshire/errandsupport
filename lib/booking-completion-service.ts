import { databases, COLLECTIONS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { AutoReleaseService } from '@/lib/auto-release-service';
import { EscrowService } from '@/lib/escrow-service';
import { BOOKING_STATUS } from '@/lib/escrow-utils';
import type { Booking } from '@/lib/types';

/**
 * Booking Completion Service - Phase 2 Integration
 * Handles job completion flow and triggers auto-release evaluation
 */

export interface BookingCompletionRequest {
  bookingId: string;
  completedBy: 'worker' | 'client' | 'admin';
  userId: string;
  completionNote?: string;
  clientConfirmation?: boolean;
  workerConfirmation?: boolean;
  rating?: {
    score: number;
    review?: string;
  };
}

export interface BookingCompletionResult {
  success: boolean;
  bookingId: string;
  newStatus: string;
  autoReleaseTriggered: boolean;
  autoReleaseEligible: boolean;
  estimatedReleaseTime?: string;
  message: string;
}

export class BookingCompletionService {
  
  /**
   * Mark a booking as completed and evaluate for auto-release
   */
  static async completeBooking(request: BookingCompletionRequest): Promise<BookingCompletionResult> {
    const { bookingId, completedBy, userId, completionNote, clientConfirmation, workerConfirmation, rating } = request;
    
    try {
      console.log(`📋 Processing booking completion: ${bookingId} by ${completedBy}`);

      // Get current booking
      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      ) as unknown as Booking;

      // Validate completion request
      const validation = this.validateCompletionRequest(booking, request);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Update booking status
      const updateData: Partial<Booking> = {
        status: BOOKING_STATUS.COMPLETED,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add completion metadata
      if (completionNote) {
        updateData.completionNote = completionNote;
      }

      if (clientConfirmation !== undefined) {
        updateData.clientConfirmed = clientConfirmation;
      }

      if (workerConfirmation !== undefined) {
        updateData.workerConfirmed = workerConfirmation;
      }

      if (rating) {
        if (completedBy === 'client') {
          updateData.clientRating = rating.score;
          updateData.clientReview = rating.review;
        } else if (completedBy === 'worker') {
          updateData.workerRating = rating.score;
          updateData.workerReview = rating.review;
        }
      }

      // Update the booking
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        updateData
      );

      console.log(`✅ Booking ${bookingId} marked as completed`);

      // Check for immediate auto-release eligibility
      const autoReleaseResult = await this.evaluateForAutoRelease(bookingId, completedBy);

      return {
        success: true,
        bookingId,
        newStatus: BOOKING_STATUS.COMPLETED,
        autoReleaseTriggered: autoReleaseResult.triggered,
        autoReleaseEligible: autoReleaseResult.eligible,
        estimatedReleaseTime: autoReleaseResult.estimatedReleaseTime,
        message: autoReleaseResult.triggered 
          ? 'Booking completed and payment auto-released!'
          : autoReleaseResult.eligible 
            ? `Booking completed. Payment will be auto-released ${autoReleaseResult.estimatedReleaseTime}.`
            : 'Booking completed successfully.'
      };

    } catch (error) {
      console.error(`❌ Error completing booking ${bookingId}:`, error);
      
      return {
        success: false,
        bookingId,
        newStatus: booking?.status || 'unknown',
        autoReleaseTriggered: false,
        autoReleaseEligible: false,
        message: error instanceof Error ? error.message : 'Failed to complete booking'
      };
    }
  }

  /**
   * Validate that a completion request is allowed
   */
  private static validateCompletionRequest(
    booking: Booking, 
    request: BookingCompletionRequest
  ): { isValid: boolean; error?: string } {
    
    // Check if booking can be completed
    if (booking.status === BOOKING_STATUS.COMPLETED) {
      return { isValid: false, error: 'Booking is already completed' };
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      return { isValid: false, error: 'Cannot complete a cancelled booking' };
    }

    if (booking.status === BOOKING_STATUS.DISPUTED) {
      return { isValid: false, error: 'Cannot complete a disputed booking' };
    }

    // Validate user permissions
    if (request.completedBy === 'worker' && booking.workerId !== request.userId) {
      return { isValid: false, error: 'Only the assigned worker can mark this booking as completed' };
    }

    if (request.completedBy === 'client' && booking.clientId !== request.userId) {
      return { isValid: false, error: 'Only the booking client can confirm completion' };
    }

    // Check if booking is in progress or accepted (ready for completion)
    const allowedStatuses = [BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.IN_PROGRESS];
    if (!allowedStatuses.includes(booking.status as any)) {
      return { 
        isValid: false, 
        error: `Booking must be in 'accepted' or 'in_progress' status to be completed. Current status: ${booking.status}` 
      };
    }

    return { isValid: true };
  }

  /**
   * Evaluate if the completed booking is eligible for immediate auto-release
   */
  private static async evaluateForAutoRelease(
    bookingId: string, 
    completedBy: string
  ): Promise<{ 
    triggered: boolean; 
    eligible: boolean; 
    estimatedReleaseTime?: string;
    rule?: string;
  }> {
    try {
      // Get active auto-release rules
      const rules = await AutoReleaseService.getActiveRules();
      
      // Check for immediate release rules (0 hour delay)
      const immediateRules = rules.filter(rule => 
        rule.conditions.autoReleaseAfterHours === 0 &&
        rule.conditions.requiredStatus === BOOKING_STATUS.COMPLETED
      );

      // Check for client confirmation immediate release
      if (completedBy === 'client' && immediateRules.some(rule => rule.conditions.requireClientConfirmation)) {
        try {
          // Trigger immediate auto-release
          const immediateRule = immediateRules.find(rule => rule.conditions.requireClientConfirmation);
          if (immediateRule) {
            await AutoReleaseService.triggerManualAutoRelease(bookingId, immediateRule.id);
            return {
              triggered: true,
              eligible: true,
              rule: immediateRule.name
            };
          }
        } catch (error) {
          console.error('Failed to trigger immediate auto-release:', error);
        }
      }

      // Check for scheduled auto-release rules
      const scheduledRules = rules.filter(rule => 
        rule.conditions.autoReleaseAfterHours && 
        rule.conditions.autoReleaseAfterHours > 0 &&
        rule.conditions.requiredStatus === BOOKING_STATUS.COMPLETED
      );

      if (scheduledRules.length > 0) {
        // Find the rule with the shortest delay
        const nextRule = scheduledRules.reduce((shortest, current) => 
          (current.conditions.autoReleaseAfterHours || 0) < (shortest.conditions.autoReleaseAfterHours || 0) 
            ? current 
            : shortest
        );

        const releaseTime = new Date();
        releaseTime.setHours(releaseTime.getHours() + (nextRule.conditions.autoReleaseAfterHours || 0));

        return {
          triggered: false,
          eligible: true,
          estimatedReleaseTime: this.formatRelativeTime(nextRule.conditions.autoReleaseAfterHours || 0),
          rule: nextRule.name
        };
      }

      return {
        triggered: false,
        eligible: false
      };

    } catch (error) {
      console.error('Error evaluating auto-release:', error);
      return {
        triggered: false,
        eligible: false
      };
    }
  }

  /**
   * Format time for user display
   */
  private static formatRelativeTime(hours: number): string {
    if (hours < 1) {
      return 'within the hour';
    } else if (hours === 1) {
      return 'in 1 hour';
    } else if (hours < 24) {
      return `in ${hours} hours`;
    } else {
      const days = Math.round(hours / 24);
      return days === 1 ? 'in 1 day' : `in ${days} days`;
    }
  }

  /**
   * Get completion history for a booking
   */
  static async getCompletionHistory(bookingId: string): Promise<any[]> {
    try {
      // This would fetch completion logs if we implement them
      // For now, return basic completion info from the booking
      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

      const history = [];
      
      if (booking.completedAt) {
        history.push({
          action: 'completed',
          timestamp: booking.completedAt,
          by: 'worker', // Could be enhanced to track who completed it
          note: booking.completionNote || 'Job marked as completed'
        });
      }

      return history;
    } catch (error) {
      console.error('Error fetching completion history:', error);
      return [];
    }
  }

  /**
   * Cancel a booking (also triggers auto-release evaluation for refunds)
   */
  static async cancelBooking(
    bookingId: string, 
    cancelledBy: string, 
    reason: string,
    userId: string
  ): Promise<BookingCompletionResult> {
    try {
      console.log(`📋 Processing booking cancellation: ${bookingId} by ${cancelledBy}`);

      // Get current booking
      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      ) as unknown as Booking;

      // Validate cancellation
      if (booking.status === BOOKING_STATUS.COMPLETED) {
        throw new Error('Cannot cancel a completed booking');
      }

      if (booking.status === BOOKING_STATUS.CANCELLED) {
        throw new Error('Booking is already cancelled');
      }

      // Update booking status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: BOOKING_STATUS.CANCELLED,
          cancelledAt: new Date().toISOString(),
          cancellationReason: reason,
          updatedAt: new Date().toISOString()
        }
      );

      // Process refund if payment was escrowed
      if (booking.paymentStatus === 'escrowed') {
        try {
          await EscrowService.refundEscrowPayment(bookingId, userId, reason);
          console.log(`💰 Refund processed for cancelled booking ${bookingId}`);
        } catch (refundError) {
          console.error('Failed to process refund:', refundError);
        }
      }

      return {
        success: true,
        bookingId,
        newStatus: BOOKING_STATUS.CANCELLED,
        autoReleaseTriggered: false,
        autoReleaseEligible: false,
        message: 'Booking cancelled and refund processed'
      };

    } catch (error) {
      console.error(`❌ Error cancelling booking ${bookingId}:`, error);
      throw error;
    }
  }
} 