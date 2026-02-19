import { NextRequest, NextResponse } from 'next/server';
import { COLLECTIONS } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { AUTO_RELEASE_HOURS } from '@/lib/constants';
import { BookingCompletionService } from '@/lib/booking-completion.service';
import { TermiiSMSService } from '@/lib/termii-sms.service';

// Use server SDK for cron jobs (no user session available)
const { serverDatabases } = require('@/lib/appwrite-server');

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

/**
 * GET /api/cron/auto-release
 *
 * Auto-releases escrow payment to workers when client hasn't confirmed
 * or disputed within AUTO_RELEASE_HOURS (24h) of worker marking complete.
 *
 * Uses server SDK (API key) since cron jobs run without user sessions.
 *
 * Vercel Cron configuration (add to vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/auto-release",
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

    console.log('🔄 Running auto-release cron job...');

    // Calculate the cutoff time (24 hours ago)
    const cutoffTime = new Date(Date.now() - AUTO_RELEASE_HOURS * 60 * 60 * 1000).toISOString();

    // Find all bookings with status 'worker_completed' where completedAt is older than 24h
    // Using server SDK to bypass client-side permission constraints
    const bookings = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.BOOKINGS,
      [
        Query.equal('status', 'worker_completed'),
        Query.lessThan('completedAt', cutoffTime),
        Query.limit(50)
      ]
    );

    console.log(`Found ${bookings.documents.length} bookings eligible for auto-release`);

    let releasedCount = 0;
    let failedCount = 0;

    for (const booking of bookings.documents) {
      try {
        const amount = booking.totalAmount || booking.budgetAmount;

        if (!amount || amount <= 0) {
          console.error(`Skipping booking ${booking.$id}: no valid amount`);
          failedCount++;
          continue;
        }

        // Use BookingCompletionService directly (server SDK, no HTTP roundtrip)
        const result = await BookingCompletionService.completeBooking({
          bookingId: booking.$id,
          clientId: booking.clientId,
          workerId: booking.workerId,
          amount
        });

        if (!result.success) {
          console.error(`Failed to auto-release booking ${booking.$id}:`, result.message);
          failedCount++;
          continue;
        }

        // Update booking with auto-release metadata (server SDK)
        try {
          await serverDatabases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.BOOKINGS,
            booking.$id,
            {
              clientConfirmedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          );
        } catch (updateError) {
          // Non-critical: completeBooking already set status to 'completed'
          console.error(`Failed to set clientConfirmedAt for booking ${booking.$id}:`, updateError);
        }

        // Notify both parties
        try {
          const [worker, client] = await Promise.all([
            serverDatabases.getDocument(DATABASE_ID, COLLECTIONS.USERS, booking.workerId),
            serverDatabases.getDocument(DATABASE_ID, COLLECTIONS.USERS, booking.clientId)
          ]);

          // In-app notifications (uses client SDK internally, non-critical if fails)
          const { notificationService } = await import('@/lib/notification-service');

          await notificationService.createNotification({
            userId: booking.clientId,
            title: 'Payment Auto-Released',
            message: `Payment of ₦${amount?.toLocaleString()} for "${booking.title}" was automatically released to ${worker.name} after 24 hours.`,
            type: 'info',
            bookingId: booking.$id,
            idempotencyKey: `auto_release_client_${booking.$id}`
          });

          await notificationService.createNotification({
            userId: booking.workerId,
            title: 'Payment Received',
            message: `Payment of ₦${amount?.toLocaleString()} for "${booking.title}" has been auto-released to your wallet.`,
            type: 'success',
            bookingId: booking.$id,
            idempotencyKey: `auto_release_worker_${booking.$id}`
          });

          // SMS notifications
          if (client.phone) {
            await TermiiSMSService.sendSMS({
              to: client.phone,
              message: `ErandWork: Payment of ₦${amount?.toLocaleString()} for "${booking.title}" was auto-released after 24h. Contact support if you have concerns.`
            });
          }

          if (worker.phone) {
            await TermiiSMSService.sendSMS({
              to: worker.phone,
              message: `ErandWork: Payment of ₦${amount?.toLocaleString()} for "${booking.title}" has been released to your wallet.`
            });
          }
        } catch (notifError) {
          console.error(`Failed to send auto-release notifications for booking ${booking.$id}:`, notifError);
          // Don't fail the release if notification fails
        }

        releasedCount++;
        console.log(`✅ Auto-released payment for booking ${booking.$id}`);
      } catch (error) {
        console.error(`Failed to auto-release booking ${booking.$id}:`, error);
        failedCount++;
      }
    }

    console.log(`✅ Auto-released ${releasedCount} bookings, ${failedCount} failed`);

    return NextResponse.json(
      {
        success: true,
        message: `Auto-released ${releasedCount} bookings`,
        releasedCount,
        failedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error in auto-release cron:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to auto-release bookings',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
