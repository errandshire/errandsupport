import { NextRequest, NextResponse } from 'next/server';
import { JobPostingService } from '@/lib/job-posting.service';
const { serverDatabases } = require('@/lib/appwrite-server');

/**
 * DELETE /api/jobs/cancel
 *
 * Client cancels a job
 * - Cancels the job
 * - Rejects all pending applications
 * - Notifies all applicants
 * - Refunds escrow if job was already assigned
 *
 * Query parameters:
 * - jobId: string
 *
 * Request body:
 * - clientId: string (temporary - should use session)
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

    // Get request body for clientId and reason
    const body = await request.json().catch(() => ({}));
    const { clientId: tempClientId, reason } = body;

    // TODO: Get authenticated user from session
    if (!tempClientId) {
      return NextResponse.json(
        { success: false, message: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Cancel job with server-side database client
    await JobPostingService.cancelJob(
      jobId,
      tempClientId,
      reason,
      serverDatabases
    );

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully. All applicants have been notified.'
    });
  } catch (error: any) {
    console.error('Error cancelling job:', error);

    // Handle specific errors
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, message: 'You are not authorized to cancel this job' },
        { status: 403 }
      );
    }

    if (error.message.includes('already cancelled')) {
      return NextResponse.json(
        { success: false, message: 'This job is already cancelled' },
        { status: 400 }
      );
    }

    if (error.message.includes('Cannot cancel a completed')) {
      return NextResponse.json(
        { success: false, message: 'Cannot cancel a completed job' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to cancel job. Please try again.' },
      { status: 500 }
    );
  }
}
