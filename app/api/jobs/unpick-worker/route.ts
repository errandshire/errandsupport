import { NextRequest, NextResponse } from 'next/server';
import { WorkerUnpickService } from '@/lib/worker-unpick.service';
import { trackCustomEvent } from '@/lib/meta-pixel-events';

/**
 * POST /api/jobs/unpick-worker
 * Client unpicks a selected worker (within 1-hour window)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, clientId, reason } = body;

    // Validate required fields
    if (!jobId || !clientId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: jobId, clientId' },
        { status: 400 }
      );
    }

    // Execute unpick
    const result = await WorkerUnpickService.unpickWorker(jobId, clientId, reason);

    // Track unpick event if successful
    if (result.success) {
      try {
        trackCustomEvent('WorkerUnpicked', {
          content_name: 'Client Unpicked Worker',
          content_ids: [jobId],
          content_type: 'job_unpick',
          value: result.refundedAmount,
          currency: 'NGN'
        });
      } catch (trackError) {
        console.error('Meta Pixel tracking error:', trackError);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in unpick worker API:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to unpick worker'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/unpick-worker?jobId=xxx&clientId=yyy
 * Get unpick status for a job
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');
    const clientId = searchParams.get('clientId');

    if (!jobId || !clientId) {
      return NextResponse.json(
        { success: false, message: 'Missing jobId or clientId parameter' },
        { status: 400 }
      );
    }

    const status = await WorkerUnpickService.getUnpickStatus(jobId, clientId);

    return NextResponse.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting unpick status:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get unpick status'
      },
      { status: 500 }
    );
  }
}
