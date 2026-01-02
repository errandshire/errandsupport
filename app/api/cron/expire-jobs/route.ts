import { NextRequest, NextResponse } from 'next/server';
import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { JOB_STATUS } from '@/lib/constants';
import { JobNotificationService } from '@/lib/job-notification.service';

/**
 * GET /api/cron/expire-jobs
 *
 * Cron job to expire old jobs that haven't been accepted
 * Should be configured in vercel.json to run hourly
 *
 * Vercel Cron configuration (add to vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/expire-jobs",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Running job expiry cron job...');

    // Find all open jobs that have expired
    const now = new Date().toISOString();
    const jobs = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.JOBS,
      [
        Query.equal('status', JOB_STATUS.OPEN),
        Query.lessThan('expiresAt', now),
        Query.limit(100)
      ]
    );

    console.log(`Found ${jobs.documents.length} expired jobs`);

    let expiredCount = 0;
    let failedCount = 0;

    // Update each expired job
    for (const job of jobs.documents) {
      try {
        // Update job status to expired
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.JOBS,
          job.$id,
          {
            status: JOB_STATUS.EXPIRED,
            updatedAt: new Date().toISOString(),
          }
        );

        // Notify client
        try {
          await JobNotificationService.notifyJobExpired(job as any);
        } catch (notifError) {
          console.error(`Failed to send expiry notification for job ${job.$id}:`, notifError);
          // Don't fail the job expiry if notification fails
        }

        expiredCount++;
        console.log(`✅ Expired job ${job.$id}`);
      } catch (error) {
        console.error(`Failed to expire job ${job.$id}:`, error);
        failedCount++;
      }
    }

    console.log(`✅ Expired ${expiredCount} jobs, ${failedCount} failed`);

    return NextResponse.json(
      {
        success: true,
        message: `Expired ${expiredCount} jobs`,
        expiredCount,
        failedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error in job expiry cron:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to expire jobs',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
