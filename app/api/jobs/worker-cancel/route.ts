import { NextRequest, NextResponse } from 'next/server';
import { WorkerCancellationService } from '@/lib/worker-cancellation.service';
const { serverDatabases } = require('@/lib/appwrite-server');

/**
 * DELETE /api/jobs/worker-cancel
 *
 * Worker cancels an assigned job (with 24-hour policy)
 * - Validates 24-hour policy (cannot cancel within 24 hours of assignment)
 * - Refunds client's escrow
 * - Reopens job for public applications
 * - Notifies client via in-app, email, SMS
 *
 * Query parameters:
 * - jobId: string
 *
 * Request body:
 * - workerId: string (ID in WORKERS collection)
 * - workerUserId: string (ID in USERS collection - for notifications)
 * - reason: string (optional)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, message: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.json().catch(() => ({}));
    const { workerId, workerUserId, reason } = body;

    // TODO: Get authenticated user from session
    if (!workerId || !workerUserId) {
      return NextResponse.json(
        { success: false, message: 'Worker ID and Worker User ID are required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Worker ${workerId} attempting to cancel job ${jobId}`);

    // First check eligibility (provides better error messages)
    const eligibility = await WorkerCancellationService.canCancelJob(
      jobId,
      workerId,
      serverDatabases
    );

    if (!eligibility.canCancel) {
      console.log(`❌ Cancellation denied: ${eligibility.reason}`);

      // Provide specific error status codes based on reason
      if (eligibility.reason?.includes('wait') && eligibility.hoursRemaining) {
        // Within 24-hour window
        return NextResponse.json(
          {
            success: false,
            message: eligibility.reason,
            hoursElapsed: eligibility.hoursElapsed,
            hoursRemaining: eligibility.hoursRemaining,
            canCancelAt: new Date(Date.now() + eligibility.hoursRemaining * 60 * 60 * 1000).toISOString()
          },
          { status: 403 } // Forbidden - policy violation
        );
      }

      if (eligibility.reason?.includes('not assigned')) {
        return NextResponse.json(
          { success: false, message: eligibility.reason },
          { status: 403 } // Forbidden - not authorized
        );
      }

      // Other reasons (job already cancelled, completed, etc.)
      return NextResponse.json(
        { success: false, message: eligibility.reason },
        { status: 400 } // Bad request
      );
    }

    console.log(`✅ Eligibility check passed (${eligibility.hoursElapsed}h elapsed)`);

    // Execute cancellation with server-side database client
    const result = await WorkerCancellationService.cancelJobAsWorker({
      jobId,
      workerId,
      workerUserId,
      reason,
      dbClient: serverDatabases
    });

    if (!result.success) {
      console.error('❌ Cancellation failed:', result.message);
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      );
    }

    console.log(`✅ Worker cancellation successful for job ${jobId}`);

    return NextResponse.json({
      success: true,
      message: result.message
    });

  } catch (error: any) {
    console.error('Error in worker cancellation endpoint:', error);

    // Handle specific errors
    if (error.message.includes('Unauthorized') || error.message.includes('not assigned')) {
      return NextResponse.json(
        { success: false, message: 'You are not authorized to cancel this job' },
        { status: 403 }
      );
    }

    if (error.message.includes('24 hours') || error.message.includes('wait')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 403 }
      );
    }

    if (error.message.includes('already')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to cancel job. Please try again.' },
      { status: 500 }
    );
  }
}
