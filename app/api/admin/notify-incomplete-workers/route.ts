import { NextRequest, NextResponse } from 'next/server';
import { WorkerNotificationService } from '@/lib/worker-notification.service';

/**
 * POST /api/admin/notify-incomplete-workers
 *
 * Sends email, SMS, and in-app notifications to all workers who:
 * - Haven't uploaded their verification documents
 * - Were rejected and need to re-upload documents
 *
 * This is an admin-only endpoint for bulk notification sending.
 *
 * Returns statistics about the notifications sent.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Starting bulk worker notification process...');

    // TODO: Add admin authentication check here
    // For now, allowing all requests for testing purposes
    // In production, verify the user has admin role

    // Send notifications to all incomplete workers
    const stats = await WorkerNotificationService.notifyIncompleteWorkers();

    console.log('✅ Bulk notification process completed:', stats);

    return NextResponse.json({
      success: true,
      message: 'Worker notifications sent successfully',
      stats: {
        totalWorkers: stats.totalWorkers,
        email: {
          sent: stats.emailsSent,
          failed: stats.emailsFailed
        },
        sms: {
          sent: stats.smsSent,
          failed: stats.smsFailed
        },
        inApp: {
          sent: stats.inAppSent,
          failed: stats.inAppFailed
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error in bulk worker notification:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send worker notifications',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/notify-incomplete-workers
 *
 * Preview endpoint to see how many workers would be notified
 * without actually sending the notifications.
 *
 * Useful for admins to check before triggering bulk send.
 */
export async function GET(request: NextRequest) {
  try {
    // Import here to avoid circular dependencies
    const { databases } = await import('@/lib/appwrite');
    const { Query } = await import('appwrite');
    const { COLLECTIONS } = await import('@/lib/appwrite');

    // Get all workers
    const response = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.WORKERS,
      [Query.orderDesc('$createdAt'), Query.limit(1000)]
    );

    const workers = response.documents as any[];

    // Filter workers with incomplete documents
    const incompleteWorkers = workers.filter(worker => {
      const isRejected = worker.verificationStatus === 'rejected';
      const neverUploaded = !worker.idDocument || !worker.selfieWithId;
      return (isRejected || neverUploaded) && worker.verificationStatus !== 'verified';
    });

    // Count workers by status
    const neverUploadedCount = incompleteWorkers.filter(w => !w.idDocument || !w.selfieWithId).length;
    const rejectedCount = incompleteWorkers.filter(w => w.verificationStatus === 'rejected').length;

    return NextResponse.json({
      success: true,
      preview: {
        totalWorkersToNotify: incompleteWorkers.length,
        breakdown: {
          neverUploaded: neverUploadedCount,
          rejected: rejectedCount
        },
        workers: incompleteWorkers.map(w => ({
          id: w.$id,
          name: w.displayName || w.name,
          email: w.email,
          phone: w.phone,
          status: w.verificationStatus,
          hasIdDocument: !!w.idDocument,
          hasSelfie: !!w.selfieWithId
        }))
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error getting worker preview:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get worker preview',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
