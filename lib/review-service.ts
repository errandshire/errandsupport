import { databases, COLLECTIONS } from './appwrite';
import { Query, ID } from 'appwrite';
import type { Review } from './types';

export interface CreateReviewRequest {
  bookingId: string;
  clientId: string;
  workerId: string;
  rating: number; // 1-5
  comment?: string;
  isPublic?: boolean;
}

export interface ReviewWithDetails extends Review {
  clientName?: string;
  clientAvatar?: string;
  jobTitle?: string;
  category?: string;
  response?: {
    comment: string;
    createdAt: string;
  };
}

export interface WorkerReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export class ReviewService {
  /**
   * Create a new review
   */
  static async createReview(data: CreateReviewRequest): Promise<Review> {
    try {
      // Check if review already exists for this booking
      const existingReviews = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.REVIEWS,
        [Query.equal('bookingId', data.bookingId)]
      );

      if (existingReviews.documents.length > 0) {
        throw new Error('Review already exists for this booking');
      }

      // Create the review
      const review = await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.REVIEWS,
        ID.unique(),
        {
          bookingId: data.bookingId,
          clientId: data.clientId,
          workerId: data.workerId,
          rating: data.rating,
          comment: data.comment || '',
          isPublic: data.isPublic ?? true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );

      // Update worker rating statistics
      await this.updateWorkerRatingStats(data.workerId);

      return review as Review;
    } catch (error) {
      console.error('Error creating review:', error);
      throw error;
    }
  }

  /**
   * Get reviews for a specific worker
   */
  static async getWorkerReviews(
    workerId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ReviewWithDetails[]> {
    try {
      const reviews = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.REVIEWS,
        [
          Query.equal('workerId', workerId),
          Query.equal('isPublic', true),
          Query.orderDesc('$createdAt'),
          Query.limit(limit),
          Query.offset(offset)
        ]
      );

      // Enrich reviews with client and booking details
      const enrichedReviews = await Promise.all(
        reviews.documents.map(async (review) => {
          try {
            // Get client details
            const client = await databases.getDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              COLLECTIONS.USERS,
              review.clientId
            );

            // Get booking details
            const booking = await databases.getDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              COLLECTIONS.BOOKINGS,
              review.bookingId
            );

            return {
              ...review,
              clientName: client.name || client.email,
              clientAvatar: client.profileImage,
              jobTitle: booking.title || 'Service Request',
              category: booking.category,
            } as ReviewWithDetails;
          } catch (error) {
            console.warn('Error enriching review:', error);
            return {
              ...review,
              clientName: 'Anonymous',
              jobTitle: 'Service Request',
            } as ReviewWithDetails;
          }
        })
      );

      return enrichedReviews;
    } catch (error) {
      console.error('Error fetching worker reviews:', error);
      return [];
    }
  }

  /**
   * Get review statistics for a worker
   */
  static async getWorkerReviewStats(workerId: string): Promise<WorkerReviewStats> {
    try {
      const reviews = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.REVIEWS,
        [
          Query.equal('workerId', workerId),
          Query.equal('isPublic', true),
          Query.limit(1000) // Get all reviews for accurate stats
        ]
      );

      if (reviews.documents.length === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        };
      }

      const totalRating = reviews.documents.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.documents.length;

      const ratingDistribution = {
        5: reviews.documents.filter(r => r.rating === 5).length,
        4: reviews.documents.filter(r => r.rating === 4).length,
        3: reviews.documents.filter(r => r.rating === 3).length,
        2: reviews.documents.filter(r => r.rating === 2).length,
        1: reviews.documents.filter(r => r.rating === 1).length,
      };

      return {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalReviews: reviews.documents.length,
        ratingDistribution
      };
    } catch (error) {
      console.error('Error fetching worker review stats:', error);
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }
  }

  /**
   * Update worker rating statistics in the WORKERS collection
   */
  private static async updateWorkerRatingStats(workerId: string): Promise<void> {
    try {
      const stats = await this.getWorkerReviewStats(workerId);

      // Find the worker document
      const workers = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.WORKERS,
        [Query.equal('userId', workerId), Query.limit(1)]
      );

      if (workers.documents.length > 0) {
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          COLLECTIONS.WORKERS,
          workers.documents[0].$id,
          {
            ratingAverage: stats.averageRating,
            totalReviews: stats.totalReviews,
            updatedAt: new Date().toISOString(),
          }
        );
      }
    } catch (error) {
      console.error('Error updating worker rating stats:', error);
    }
  }

  /**
   * Add a response to a review (worker responding to client review)
   */
  static async addReviewResponse(
    reviewId: string,
    response: string
  ): Promise<void> {
    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.REVIEWS,
        reviewId,
        {
          response: {
            comment: response,
            createdAt: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error('Error adding review response:', error);
      throw error;
    }
  }

  /**
   * Get reviews by a specific client
   */
  static async getClientReviews(
    clientId: string,
    limit: number = 50
  ): Promise<ReviewWithDetails[]> {
    try {
      const reviews = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.REVIEWS,
        [
          Query.equal('clientId', clientId),
          Query.orderDesc('$createdAt'),
          Query.limit(limit)
        ]
      );

      // Enrich reviews with worker and booking details
      const enrichedReviews = await Promise.all(
        reviews.documents.map(async (review) => {
          try {
            // Get worker details
            const worker = await databases.getDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              COLLECTIONS.WORKERS,
              review.workerId
            );

            // Get booking details
            const booking = await databases.getDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              COLLECTIONS.BOOKINGS,
              review.bookingId
            );

            return {
              ...review,
              workerName: worker.displayName || worker.name,
              workerAvatar: worker.profileImage,
              jobTitle: booking.title || 'Service Request',
              category: booking.category,
            } as ReviewWithDetails;
          } catch (error) {
            console.warn('Error enriching client review:', error);
            return {
              ...review,
              workerName: 'Worker',
              jobTitle: 'Service Request',
            } as ReviewWithDetails;
          }
        })
      );

      return enrichedReviews;
    } catch (error) {
      console.error('Error fetching client reviews:', error);
      return [];
    }
  }

  /**
   * Check if a client has already reviewed a specific booking
   */
  static async hasClientReviewedBooking(
    bookingId: string,
    clientId: string
  ): Promise<boolean> {
    try {
      const reviews = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        COLLECTIONS.REVIEWS,
        [
          Query.equal('bookingId', bookingId),
          Query.equal('clientId', clientId),
          Query.limit(1)
        ]
      );

      return reviews.documents.length > 0;
    } catch (error) {
      console.error('Error checking if client has reviewed booking:', error);
      return false;
    }
  }
}

