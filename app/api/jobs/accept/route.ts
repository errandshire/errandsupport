import { NextRequest, NextResponse } from 'next/server';
import { JobAcceptanceService } from '@/lib/job-acceptance.service';
import { JobNotificationService } from '@/lib/job-notification.service';
import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { Client, Databases } from 'node-appwrite';

// Create admin client for job updates (uses API key)
function getAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return new Databases(client);
}

/**
 * POST /api/jobs/accept
 *
 * Accept a job posting
 * This endpoint handles the complete job acceptance flow:
 * 1. Verify job is still open
 * 2. Check worker eligibility
 * 3. Create booking
 * 4. Hold payment in escrow
 * 5. Update job status
 * 6. Send notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { success: false, message: 'Job ID is required' },
        { status: 400 }
      );
    }

    // TODO: Get authenticated user from session
    // For now, assuming user is passed in request or from auth middleware
    // In production, you'd use: const session = await getServerSession();
    // const workerId = session.user.id;

    // Temporary: Get worker from request body (replace with session auth)
    const { workerId: tempWorkerId } = body;
    if (!tempWorkerId) {
      return NextResponse.json(
        { success: false, message: 'Worker ID is required. Please log in.' },
        { status: 401 }
      );
    }

    // Fetch worker data
    const workers = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.WORKERS,
      [Query.equal('userId', tempWorkerId)]
    );

    if (workers.documents.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Worker profile not found' },
        { status: 404 }
      );
    }

    const worker = workers.documents[0];

    // Fetch user data for worker name/email
    const user = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.USERS,
      tempWorkerId
    );

    // Check eligibility
    const eligibility = await JobAcceptanceService.checkJobEligibility(jobId, tempWorkerId, {
      isVerified: worker.isVerified || false,
      isActive: worker.isActive !== false,
      categories: worker.categories || [],
      locationLat: worker.locationLat,
      locationLng: worker.locationLng,
      serviceRadius: worker.serviceRadius,
    });

    if (!eligibility.eligible) {
      return NextResponse.json(
        { success: false, message: eligibility.reason || 'Not eligible to accept this job' },
        { status: 403 }
      );
    }

    // Get admin client for job updates (requires API key permissions)
    const adminDb = getAdminClient();

    // Accept the job (handles race conditions, escrow, booking creation)
    const result = await JobAcceptanceService.acceptJob(
      jobId,
      tempWorkerId,
      {
        name: user.name,
        email: user.email,
        isVerified: worker.isVerified || false,
        isActive: worker.isActive !== false,
        categories: worker.categories || [],
      },
      adminDb // Pass admin client for job updates
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

    // Get updated job
    const job = await databases.getDocument(DATABASE_ID, COLLECTIONS.JOBS, jobId);

    // Send notifications
    try {
      await JobNotificationService.notifyJobAccepted(job as any, {
        id: tempWorkerId,
        name: user.name,
        email: user.email,
      });

      await JobNotificationService.notifyJobFilled(job as any, tempWorkerId);
    } catch (notifError) {
      console.error('Failed to send notifications:', notifError);
      // Don't fail the request if notifications fail
    }

    console.log(`✅ Job ${jobId} accepted by worker ${tempWorkerId}, booking ${result.bookingId}`);

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        bookingId: result.bookingId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error in job acceptance API:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to accept job',
      },
      { status: 500 }
    );
  }
}
