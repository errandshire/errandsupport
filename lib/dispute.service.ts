import { databases, COLLECTIONS } from './appwrite';
import { ID, Query } from 'appwrite';
import { TermiiSMSService } from './termii-sms.service';

/**
 * DISPUTE SERVICE
 *
 * Handles disputes between clients and workers
 */

export interface CreateDisputeParams {
  bookingId: string;
  clientId: string;
  workerId: string;
  category: string;
  clientStatement: string;
  evidence?: string[];
}

export interface UpdateDisputeParams {
  disputeId: string;
  workerResponse?: string;
  adminNotes?: string;
  resolution?: 'approve_worker' | 'refund_client' | 'resolve_themselves';
  status?: 'pending' | 'worker_responded' | 'under_review' | 'resolved';
}

export class DisputeService {

  /**
   * Create a new dispute
   */
  static async createDispute(params: CreateDisputeParams) {
    try {
      const { bookingId, clientId, workerId, category, clientStatement, evidence } = params;

      // Check if dispute already exists for this booking
      const existing = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.DISPUTES,
        [Query.equal('bookingId', bookingId)]
      );

      if (existing.documents.length > 0) {
        return {
          success: false,
          message: 'Dispute already exists for this booking'
        };
      }

      // Get booking details
      const booking = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId
      );

      // Create dispute
      const dispute = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.DISPUTES,
        ID.unique(),
        {
          bookingId,
          clientId,
          workerId,
          category,
          clientStatement,
          workerResponse: null,
          adminNotes: null,
          evidence: evidence || [],
          status: 'pending',
          resolution: null,
          amount: booking.budgetAmount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // Update booking status
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.BOOKINGS,
        bookingId,
        {
          status: 'disputed',
          updatedAt: new Date().toISOString()
        }
      );

      // Notify worker (in-app + SMS)
      try {
        const { notificationService } = await import('./notification-service');

        // In-app notification
        await notificationService.createNotification({
          userId: workerId,
          title: 'Dispute Raised ⚠️',
          message: `Client has raised a dispute for booking. Please provide your response.`,
          type: 'warning',
          bookingId,
          actionUrl: `/worker/disputes/${dispute.$id}`,
          idempotencyKey: `dispute_worker_${dispute.$id}`
        });

        // SMS notification
        try {
          const workerUser = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            COLLECTIONS.USERS,
            workerId
          );
          if (workerUser.phone) {
            await TermiiSMSService.sendDisputeNotification(workerUser.phone, {
              bookingId,
              status: 'raised',
              role: 'worker'
            });
          }
        } catch (smsError) {
          console.error('Failed to send SMS:', smsError);
        }
      } catch (error) {
        console.error('Failed to notify worker:', error);
      }

      // Notify admin
      try {
        const { notificationService } = await import('./notification-service');
        await notificationService.createNotification({
          userId: 'admin', // You'll need to get admin user IDs
          title: 'New Dispute 🚨',
          message: `A new dispute has been raised for booking #${bookingId}.`,
          type: 'warning',
          bookingId,
          actionUrl: `/admin/disputes/${dispute.$id}`,
          idempotencyKey: `dispute_admin_${dispute.$id}`
        });
      } catch (error) {
        console.error('Failed to notify admin:', error);
      }

      return {
        success: true,
        message: 'Dispute raised successfully. Worker and admin have been notified.',
        disputeId: dispute.$id
      };

    } catch (error) {
      console.error('Error creating dispute:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create dispute'
      };
    }
  }

  /**
   * Worker responds to dispute
   */
  static async addWorkerResponse(disputeId: string, workerId: string, response: string) {
    try {
      const dispute = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.DISPUTES,
        disputeId
      );

      if (dispute.workerId !== workerId) {
        return {
          success: false,
          message: 'Unauthorized'
        };
      }

      if (dispute.workerResponse) {
        return {
          success: false,
          message: 'Worker response already submitted'
        };
      }

      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.DISPUTES,
        disputeId,
        {
          workerResponse: response,
          status: 'worker_responded',
          updatedAt: new Date().toISOString()
        }
      );

      // Notify admin
      try {
        const { notificationService } = await import('./notification-service');
        await notificationService.createNotification({
          userId: 'admin',
          title: 'Worker Responded to Dispute',
          message: `Worker has provided their response to dispute #${disputeId}.`,
          type: 'info',
          actionUrl: `/admin/disputes/${disputeId}`,
          idempotencyKey: `dispute_worker_response_${disputeId}`
        });
      } catch (error) {
        console.error('Failed to notify admin:', error);
      }

      return {
        success: true,
        message: 'Response submitted successfully'
      };

    } catch (error) {
      console.error('Error adding worker response:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add response'
      };
    }
  }

  /**
   * Admin resolves dispute
   */
  static async resolveDispute(params: {
    disputeId: string;
    resolution: 'approve_worker' | 'refund_client' | 'resolve_themselves';
    adminNotes?: string;
  }) {
    try {
      const { disputeId, resolution, adminNotes } = params;

      const dispute = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.DISPUTES,
        disputeId
      );

      // Update dispute
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.DISPUTES,
        disputeId,
        {
          resolution,
          adminNotes: adminNotes || null,
          status: 'resolved',
          resolvedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      // Handle payment based on resolution
      if (resolution === 'approve_worker') {
        // Set booking back to worker_completed so payment can be released
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.BOOKINGS,
          dispute.bookingId,
          {
            status: 'worker_completed',
            updatedAt: new Date().toISOString()
          }
        );

        // Release payment to worker
        const { BookingCompletionService } = await import('./booking-completion.service');
        await BookingCompletionService.completeBooking({
          bookingId: dispute.bookingId,
          clientId: dispute.clientId,
          workerId: dispute.workerId,
          amount: dispute.amount
        });
      } else if (resolution === 'refund_client') {
        // Refund to client
        const { BookingCompletionService } = await import('./booking-completion.service');
        await BookingCompletionService.cancelBooking({
          bookingId: dispute.bookingId,
          clientId: dispute.clientId,
          reason: 'Dispute resolved in favor of client'
        });
      }
      // If 'resolve_themselves', no automatic payment action

      // Notify both parties
      try {
        const { notificationService } = await import('./notification-service');

        const messages: Record<string, string> = {
          approve_worker: 'Admin approved the work. Payment released to worker.',
          refund_client: 'Admin approved refund. Money returned to your wallet.',
          resolve_themselves: 'Admin suggests you both resolve this yourselves. Please communicate directly.'
        };

        // Notify client
        await notificationService.createNotification({
          userId: dispute.clientId,
          title: 'Dispute Resolved',
          message: messages[resolution],
          type: 'success',
          bookingId: dispute.bookingId,
          actionUrl: `/client/bookings`,
          idempotencyKey: `dispute_resolved_client_${disputeId}`
        });

        // Notify worker
        await notificationService.createNotification({
          userId: dispute.workerId,
          title: 'Dispute Resolved',
          message: messages[resolution],
          type: 'success',
          bookingId: dispute.bookingId,
          actionUrl: `/worker/bookings`,
          idempotencyKey: `dispute_resolved_worker_${disputeId}`
        });
      } catch (error) {
        console.error('Failed to send notifications:', error);
      }

      return {
        success: true,
        message: 'Dispute resolved successfully'
      };

    } catch (error) {
      console.error('Error resolving dispute:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to resolve dispute'
      };
    }
  }

  /**
   * Get dispute by ID
   */
  static async getDispute(disputeId: string) {
    try {
      const dispute = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.DISPUTES,
        disputeId
      );
      return dispute;
    } catch (error) {
      console.error('Error getting dispute:', error);
      throw error;
    }
  }

  /**
   * Get all disputes (for admin)
   */
  static async getAllDisputes(status?: string) {
    try {
      const queries: any[] = [
        Query.orderDesc('createdAt'),
        Query.limit(100)
      ];

      if (status && status !== 'all') {
        queries.push(Query.equal('status', status));
      }

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.DISPUTES,
        queries
      );

      return response.documents;
    } catch (error) {
      console.error('Error getting disputes:', error);
      return [];
    }
  }
}
