import { NextRequest, NextResponse } from 'next/server';
import { AutoReleaseService } from '@/lib/auto-release-service';

/**
 * Auto-Release Cron Job API Route
 * 
 * This endpoint should be called by external cron services to trigger auto-releases.
 * 
 * Setup Instructions:
 * 1. Use Vercel Cron: Add to vercel.json
 * 2. Use external service like cron-job.org
 * 3. Call this endpoint every 15-30 minutes
 * 
 * Security: Add authentication in production
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Basic security check - validate cron token in production
    const cronToken = request.headers.get('x-cron-token');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (expectedToken && cronToken !== expectedToken) {
      console.warn('🚫 Unauthorized cron job attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚀 Auto-release cron job started');

    // Initialize default rules if this is the first run
    await AutoReleaseService.initializeDefaultRules();

    // Process auto-releases
    const logs = await AutoReleaseService.processAutoReleases();

    const duration = Date.now() - startTime;
    const stats = {
      duration: `${duration}ms`,
      processedCount: logs.length,
      successCount: logs.filter(log => log.action === 'released').length,
      failureCount: logs.filter(log => log.action === 'failed').length,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Auto-release cron job completed:', stats);

    return NextResponse.json({
      success: true,
      message: 'Auto-release processing completed',
      stats,
      logs: logs.map(log => ({
        bookingId: log.bookingId,
        action: log.action,
        reason: log.reason,
        ruleId: log.ruleId,
        error: log.error
      }))
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('❌ Auto-release cron job failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Allow POST method for flexibility with different cron services
  return GET(request);
}

// Optional: Manual trigger for testing/admin use
export async function PUT(request: NextRequest) {
  try {
    const { bookingId, ruleId } = await request.json();

    if (!bookingId || !ruleId) {
      return NextResponse.json({ 
        error: 'bookingId and ruleId are required' 
      }, { status: 400 });
    }

    const log = await AutoReleaseService.triggerManualAutoRelease(bookingId, ruleId);

    return NextResponse.json({
      success: true,
      message: 'Manual auto-release triggered',
      log
    });

  } catch (error) {
    console.error('❌ Manual auto-release failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 