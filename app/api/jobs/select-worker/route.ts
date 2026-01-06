import { NextRequest, NextResponse } from 'next/server';
import { WorkerSelectionService } from '@/lib/worker-selection.service';

/**
 * POST /api/jobs/select-worker
 *
 * Client selects a worker from job applications
 *
 * Request body:
 * - jobId: string
 * - applicationId: string
 * - clientId: string (temporary - should use session)
 *
 * Response:
 * - success: boolean
 * - bookingId?: string
 * - message?: string
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { jobId, applicationId, clientId: tempClientId } = body;

    // 2. Validate input
    if (!jobId || !applicationId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: jobId and applicationId' },
        { status: 400 }
      );
    }

    // TODO: Get authenticated user from session
    // For now, using tempClientId from request body
    if (!tempClientId) {
      return NextResponse.json(
        { success: false, message: 'Client ID is required' },
        { status: 400 }
      );
    }

    // 3. Select worker
    const bookingId = await WorkerSelectionService.selectWorkerForJob(
      jobId,
      applicationId,
      tempClientId
    );

    return NextResponse.json({
      success: true,
      bookingId,
      message: 'Worker selected successfully! Payment is held in escrow.'
    });
  } catch (error: any) {
    console.error('Error selecting worker:', error);

    // Handle specific error messages
    const errorMessage = error.message || 'Failed to select worker';

    // Determine status code based on error message
    let statusCode = 500;
    if (errorMessage.includes('Unauthorized')) {
      statusCode = 403;
    } else if (errorMessage.includes('not found') || errorMessage.includes('no longer available')) {
      statusCode = 404;
    } else if (errorMessage.includes('Insufficient funds')) {
      statusCode = 402; // Payment Required
    }

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: statusCode }
    );
  }
}
