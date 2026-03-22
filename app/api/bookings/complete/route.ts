import { NextRequest, NextResponse } from 'next/server';
import { BookingCompletionService } from '@/lib/booking-completion.service';
import { requireAuth } from '@/lib/auth-guard';

/**
 * POST /api/bookings/complete
 *
 * Client confirms job completion and releases payment to worker
 * This endpoint uses server SDK for proper permissions
 */
export async function POST(request: NextRequest) {
  try {
    const { auth, error } = await requireAuth(request);
    if (error) return error;

    const clientId = auth!.user.$id;

    const body = await request.json();
    const { bookingId, workerId, amount, rating, review } = body;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, message: 'Booking ID is required' },
        { status: 400 }
      );
    }

    if (!workerId) {
      return NextResponse.json(
        { success: false, message: 'Worker ID is required' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // Complete booking and release payment (uses server SDK)
    const result = await BookingCompletionService.completeBooking({
      bookingId,
      clientId,
      workerId,
      amount,
      rating,
      review
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message || 'Payment released successfully'
    });

  } catch (error: any) {
    console.error('Error completing booking:', error);

    // Handle specific Appwrite errors
    if (error.code === 401) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Please log in again.' },
        { status: 401 }
      );
    }

    if (error.code === 404) {
      return NextResponse.json(
        { success: false, message: 'Booking not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message || 'Failed to complete booking' },
      { status: 500 }
    );
  }
}
