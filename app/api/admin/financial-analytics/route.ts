import { NextRequest, NextResponse } from 'next/server';
import { financialAnalyticsService } from '@/lib/financial-analytics-service';
import { requireAdmin } from '@/lib/auth-guard';

/**
 * GET /api/admin/financial-analytics
 *
 * Returns comprehensive financial analytics for the admin dashboard:
 * - Revenue and commission data
 * - Money in/out flows
 * - Withdrawal statistics
 * - Monthly trends
 */
export async function GET(request: NextRequest) {
  try {
    const { auth, error } = await requireAdmin(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';

    const analytics = await financialAnalyticsService.getAnalytics();

    // Filter by period if requested
    let filteredAnalytics = analytics;
    if (period !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      switch (period) {
        case 'month':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case 'year':
          cutoffDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          cutoffDate = new Date(0);
      }

      const cutoffMonthKey = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;
      filteredAnalytics = {
        ...analytics,
        monthlyRevenue: analytics.monthlyRevenue.filter(m => {
          const monthKey = `${m.year}-${String(m.monthNumber).padStart(2, '0')}`;
          return monthKey >= cutoffMonthKey;
        })
      };
    }

    return NextResponse.json({
      success: true,
      analytics: filteredAnalytics
    });

  } catch (error: any) {
    console.error('Error in financial analytics API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to load financial analytics' },
      { status: 500 }
    );
  }
}
