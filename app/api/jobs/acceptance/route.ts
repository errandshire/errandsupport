import { NextRequest, NextResponse } from 'next/server';
import { BookingActionService } from '@/lib/booking-action-service';
import { databases, COLLECTIONS } from '@/lib/appwrite';
import { trackMetaEvent } from '@/lib/meta-pixel-events';

/**
 * POST /api/jobs/acceptance
 * Worker accepts or declines a job selection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, workerId, action, reason } = body;

    // Validate required fields
    if (!applicationId || !workerId || !action) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: applicationId, workerId, action' },
        { status: 400 }
      );
    }

    // Validate action
    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Must be "accept" or "decline"' },
        { status: 400 }
      );
    }

    // Get application to find linked bookingId
    const application = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.JOB_APPLICATIONS,
      applicationId
    );

    if (!application.bookingId) {
      return NextResponse.json(
        { success: false, message: 'No booking found for this application' },
        { status: 404 }
      );
    }

    // Handle acceptance
    if (action === 'accept') {
      const result = await BookingActionService.acceptBooking({
        bookingId: application.bookingId,
        userId: workerId,
        userRole: 'worker',
        action: 'accept'
      });

      if (result.success) {
        // Track acceptance event
        try {
          trackMetaEvent('Lead', {
            content_name: 'Worker Job Acceptance',
            content_ids: [applicationId],
            content_type: 'job_acceptance'
          });
        } catch (trackError) {
          console.error('Meta Pixel tracking error:', trackError);
        }
      }

      return NextResponse.json(result);
    }

    // Handle decline
    if (action === 'decline') {
      const result = await BookingActionService.declineJobApplication({
        bookingId: application.bookingId,
        userId: workerId,
        userRole: 'worker',
        action: 'decline',
        reason
      });

      if (result.success) {
        // Track decline event
        try {
          trackMetaEvent('CustomEvent', {
            content_name: 'Worker Job Decline',
            content_ids: [applicationId],
            content_type: 'job_decline'
          });
        } catch (trackError) {
          console.error('Meta Pixel tracking error:', trackError);
        }
      }

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, message: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in job acceptance API:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process job acceptance'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/acceptance?applicationId=xxx
 * Get acceptance status for an application
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json(
        { success: false, message: 'Missing applicationId parameter' },
        { status: 400 }
      );
    }

    // Get application with acceptance timestamps
    const application = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.JOB_APPLICATIONS,
      applicationId
    );

    // Determine acceptance status
    let status = 'pending';
    if (application.acceptedAt) {
      status = 'accepted';
    } else if (application.declinedAt) {
      status = 'declined';
    } else if (application.unpickedAt) {
      status = 'unpicked';
    } else if (application.selectedAt) {
      // Check if 1-hour window expired
      const canAccept = BookingActionService.canAcceptJobApplication(application.selectedAt);
      status = canAccept ? 'awaiting_response' : 'expired';
    }

    return NextResponse.json({
      success: true,
      status,
      selectedAt: application.selectedAt,
      acceptedAt: application.acceptedAt,
      declinedAt: application.declinedAt,
      unpickedAt: application.unpickedAt
    });
  } catch (error) {
    console.error('Error getting acceptance status:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get acceptance status'
      },
      { status: 500 }
    );
  }
}
