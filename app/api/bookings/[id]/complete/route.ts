import { NextRequest, NextResponse } from 'next/server';
import { BookingCompletionService } from '@/lib/booking-completion-service';
import type { BookingCompletionRequest } from '@/lib/booking-completion-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body = await request.json();

    const completionRequest: BookingCompletionRequest = {
      bookingId,
      completedBy: body.completedBy,
      userId: body.userId,
      completionNote: body.completionNote,
      clientConfirmation: body.clientConfirmation,
      workerConfirmation: body.workerConfirmation,
      rating: body.rating
    };

    // Validate required fields
    if (!completionRequest.completedBy || !completionRequest.userId) {
      return NextResponse.json({
        error: 'completedBy and userId are required'
      }, { status: 400 });
    }

    // Process booking completion
    const result = await BookingCompletionService.completeBooking(completionRequest);

    if (!result.success) {
      return NextResponse.json({
        error: result.message
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error completing booking:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to complete booking'
    }, { status: 500 });
  }
} 