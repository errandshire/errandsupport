import { NextRequest, NextResponse } from 'next/server';
import { BookingCompletionService } from '@/lib/booking-completion.service';
import { ClientCancellationService } from '@/lib/client-cancellation.service';
import { databases, COLLECTIONS } from '@/lib/appwrite';

/**
 * Complete a booking and release payment to worker
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body = await request.json();
    const { clientId, workerId } = body;

    if (!clientId || !workerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get booking details
    const booking = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.BOOKINGS,
      bookingId
    );

    // Complete booking and release funds
    const result = await BookingCompletionService.completeBooking({
      bookingId,
      clientId,
      workerId,
      amount: booking.budgetAmount
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error completing booking:', error);
    return NextResponse.json(
      { error: 'Failed to complete booking' },
      { status: 500 }
    );
  }
}

/**
 * Cancel booking and refund to client
 * Uses ClientCancellationService for unified cancellation logic
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body = await request.json();
    const { clientId, reason } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'Missing clientId' },
        { status: 400 }
      );
    }

    const result = await ClientCancellationService.cancelBooking({
      bookingId,
      clientId,
      reason
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}
