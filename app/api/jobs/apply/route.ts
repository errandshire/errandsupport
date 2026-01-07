import { NextRequest, NextResponse } from 'next/server';
import { JobApplicationService } from '@/lib/job-application.service';
import { JobNotificationService } from '@/lib/job-notification.service';
const { serverDatabases, COLLECTIONS, DATABASE_ID } = require('@/lib/appwrite-server');
import { Query } from 'appwrite';

/**
 * POST /api/jobs/apply
 *
 * Worker applies to a job (shows interest)
 * This endpoint handles:
 * 1. Verify worker hasn't already applied
 * 2. Validate job is still open
 * 3. Check worker eligibility (verified, active)
 * 4. Create application record
 * 5. Increment applicant count on job
 * 6. Send notification to client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, message } = body;

    if (!jobId) {
      return NextResponse.json(
        { success: false, message: 'Job ID is required' },
        { status: 400 }
      );
    }

    // TODO: Get authenticated user from session
    // For now, assuming user is passed in request body
    // In production, replace with: const session = await getServerSession();
    const { workerId: tempWorkerId } = body;
    if (!tempWorkerId) {
      return NextResponse.json(
        { success: false, message: 'Worker ID is required' },
        { status: 400 }
      );
    }

    // Apply to job (use server databases for elevated permissions)
    const application = await JobApplicationService.applyToJob(
      jobId,
      tempWorkerId,
      message,
      serverDatabases
    );

    // Get job and worker details for notification
    const [job, worker] = await Promise.all([
      serverDatabases.getDocument(DATABASE_ID, COLLECTIONS.JOBS, jobId),
      serverDatabases.getDocument(DATABASE_ID, COLLECTIONS.WORKERS, tempWorkerId)
    ]);

    // Send notification to client about new applicant
    try {
      await JobNotificationService.notifyWorkerApplied(
        job as any,
        worker as any
      );
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
      // Don't fail the application if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        applicationId: application.$id,
        jobId: application.jobId,
        status: application.status,
        appliedAt: application.appliedAt
      }
    });
  } catch (error: any) {
    console.error('Error applying to job:', error);

    // Handle specific errors
    if (error.message.includes('already applied')) {
      return NextResponse.json(
        { success: false, message: 'You have already applied to this job' },
        { status: 400 }
      );
    }

    if (error.message.includes('no longer accepting')) {
      return NextResponse.json(
        { success: false, message: 'This job is no longer accepting applications' },
        { status: 400 }
      );
    }

    if (error.message.includes('must be verified')) {
      return NextResponse.json(
        { success: false, message: 'You must be verified to apply to jobs' },
        { status: 403 }
      );
    }

    if (error.message.includes('must be active')) {
      return NextResponse.json(
        { success: false, message: 'Your account must be active to apply to jobs' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to apply to job. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/jobs/apply
 *
 * Worker withdraws their application
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json(
        { success: false, message: 'Application ID is required' },
        { status: 400 }
      );
    }

    // TODO: Get authenticated user from session
    const body = await request.json();
    const { workerId: tempWorkerId } = body;
    if (!tempWorkerId) {
      return NextResponse.json(
        { success: false, message: 'Worker ID is required' },
        { status: 400 }
      );
    }

    // Withdraw application
    await JobApplicationService.withdrawApplication(
      applicationId,
      tempWorkerId
    );

    return NextResponse.json({
      success: true,
      message: 'Application withdrawn successfully'
    });
  } catch (error: any) {
    console.error('Error withdrawing application:', error);

    if (error.message.includes('only withdraw your own')) {
      return NextResponse.json(
        { success: false, message: 'You can only withdraw your own applications' },
        { status: 403 }
      );
    }

    if (error.message.includes('only withdraw pending')) {
      return NextResponse.json(
        { success: false, message: 'You can only withdraw pending applications' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to withdraw application. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/apply
 *
 * Get applications for a job (for clients to view applicants)
 * Requires client to have funded wallet >= job budget
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { success: false, message: 'Job ID is required' },
        { status: 400 }
      );
    }

    // TODO: Get authenticated client from session and verify ownership
    const clientId = searchParams.get('clientId'); // Temporary
    if (!clientId) {
      return NextResponse.json(
        { success: false, message: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Verify job belongs to client
    const job = await serverDatabases.getDocument(DATABASE_ID, COLLECTIONS.JOBS, jobId);
    if (job.clientId !== clientId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to view applications for this job' },
        { status: 403 }
      );
    }

    // Check if client needs to fund wallet
    if (job.requiresFunding) {
      // Get client's wallet balance
      const wallets = await serverDatabases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.VIRTUAL_WALLETS,
        [Query.equal('userId', clientId)]
      );

      if (wallets.documents.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'Please fund your wallet to view applicants',
            requiresFunding: true,
            requiredAmount: job.budgetMax,
            currentBalance: 0
          },
          { status: 402 } // Payment Required
        );
      }

      const wallet = wallets.documents[0];
      const availableBalance = (wallet.balance || 0) - (wallet.escrow || 0);

      if (availableBalance < job.budgetMax) {
        return NextResponse.json(
          {
            success: false,
            message: 'Insufficient funds. Please add funds to view applicants',
            requiresFunding: true,
            requiredAmount: job.budgetMax,
            currentBalance: availableBalance,
            amountNeeded: job.budgetMax - availableBalance
          },
          { status: 402 } // Payment Required
        );
      }
    }

    // Client has sufficient funds - fetch applications with worker details
    const applications = await JobApplicationService.getApplicationsForJob(
      jobId,
      true // Include worker details
    );

    return NextResponse.json({
      success: true,
      data: {
        applications,
        count: applications.length
      }
    });
  } catch (error: any) {
    console.error('Error getting applications:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch applications. Please try again.' },
      { status: 500 }
    );
  }
}
