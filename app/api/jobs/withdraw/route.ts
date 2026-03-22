import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
const { serverDatabases, COLLECTIONS, DATABASE_ID } = require('@/lib/appwrite-server');

/**
 * POST /api/jobs/withdraw
 *
 * Worker withdraws a pending job application
 * Uses server SDK with elevated permissions to:
 * - Update application status to 'withdrawn'
 * - Decrement job applicant count
 */
export async function POST(request: NextRequest) {
  try {
    const { auth, error } = await requireAuth(request);
    if (error) return error;

    const workerId = auth!.user.$id;

    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json(
        { success: false, message: 'Application ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Worker ${workerId} attempting to withdraw application ${applicationId}`);

    // Get application using server SDK (elevated permissions)
    const application = await serverDatabases.getDocument(
      DATABASE_ID,
      COLLECTIONS.JOB_APPLICATIONS,
      applicationId
    );

    // Verify ownership
    if (application.workerId !== workerId) {
      console.log(`❌ Unauthorized: Application belongs to ${application.workerId}, not ${workerId}`);
      return NextResponse.json(
        { success: false, message: 'You can only withdraw your own applications' },
        { status: 403 }
      );
    }

    // Check if application can be withdrawn
    if (application.status !== 'pending') {
      console.log(`❌ Cannot withdraw: Application status is ${application.status}`);
      return NextResponse.json(
        { success: false, message: `Cannot withdraw ${application.status} application` },
        { status: 400 }
      );
    }

    // Update application status using server SDK
    await serverDatabases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.JOB_APPLICATIONS,
      applicationId,
      {
        status: 'withdrawn',
        withdrawnAt: new Date().toISOString()
      }
    );

    console.log(`✅ Application ${applicationId} withdrawn successfully`);

    // Decrement applicant count on job
    try {
      const job = await serverDatabases.getDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        application.jobId
      );

      await serverDatabases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.JOBS,
        application.jobId,
        {
          applicantCount: Math.max(0, (job.applicantCount || 1) - 1)
        }
      );

      console.log(`✅ Job ${application.jobId} applicant count decremented`);
    } catch (jobError) {
      console.error('Failed to update job applicant count:', jobError);
      // Don't fail the withdrawal if job update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Application withdrawn successfully'
    });

  } catch (error: any) {
    console.error('Error withdrawing application:', error);

    // Handle specific errors
    if (error.code === 404) {
      return NextResponse.json(
        { success: false, message: 'Application not found' },
        { status: 404 }
      );
    }

    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to withdraw this application' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message || 'Failed to withdraw application. Please try again.' },
      { status: 500 }
    );
  }
}
