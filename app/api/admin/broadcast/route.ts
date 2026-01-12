import { NextRequest, NextResponse } from 'next/server';
import { BroadcastService } from '@/lib/broadcast-service';

/**
 * Admin Broadcast API
 *
 * POST /api/admin/broadcast - Send broadcast message
 * GET /api/admin/broadcast?action=history - Get broadcast history
 * GET /api/admin/broadcast?action=templates - Get templates
 * GET /api/admin/broadcast?action=preview - Generate preview
 * GET /api/admin/broadcast?action=cost&count=X - Calculate cost
 */

/**
 * POST - Send broadcast message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminId, message, channels, filters } = body;

    // TODO: Verify admin authentication from session
    // For now, check if adminId is provided
    if (!adminId) {
      return NextResponse.json(
        { success: false, message: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!message || !message.title || !message.content) {
      return NextResponse.json(
        { success: false, message: 'Message title and content are required' },
        { status: 400 }
      );
    }

    if (!channels || (!channels.email && !channels.sms && !channels.inApp)) {
      return NextResponse.json(
        { success: false, message: 'At least one channel must be selected' },
        { status: 400 }
      );
    }

    if (!filters || !filters.role) {
      return NextResponse.json(
        { success: false, message: 'Target role is required' },
        { status: 400 }
      );
    }

    // Get targeted users
    console.log('🎯 Filtering users with criteria:', filters);
    const users = await BroadcastService.getTargetedUsers(filters);

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No users match the selected filters' },
        { status: 400 }
      );
    }

    // Send broadcast
    console.log(`📢 Sending broadcast to ${users.length} users via channels:`, channels);
    const result = await BroadcastService.sendBroadcast({
      adminId,
      message,
      channels,
      filters,
      users,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        broadcastId: result.broadcastId,
        stats: result.stats,
        estimatedCost: result.estimatedCost,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message, stats: result.stats },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error in broadcast API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to send broadcast' },
      { status: 500 }
    );
  }
}

/**
 * GET - Retrieve data (history, templates, preview, cost)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const adminId = searchParams.get('adminId');

    // TODO: Verify admin authentication from session

    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Action parameter required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'history':
        if (!adminId) {
          return NextResponse.json(
            { success: false, message: 'Admin ID required' },
            { status: 400 }
          );
        }
        const history = await BroadcastService.getBroadcastHistory(adminId);
        return NextResponse.json({ success: true, history });

      case 'templates':
        if (!adminId) {
          return NextResponse.json(
            { success: false, message: 'Admin ID required' },
            { status: 400 }
          );
        }
        const templates = await BroadcastService.getTemplates(adminId);
        return NextResponse.json({ success: true, templates });

      case 'cost':
        const count = parseInt(searchParams.get('count') || '0');
        if (count <= 0) {
          return NextResponse.json(
            { success: false, message: 'Valid count required' },
            { status: 400 }
          );
        }
        const cost = BroadcastService.calculateSMSCost(count);
        return NextResponse.json({ success: true, cost, perMessage: 8 });

      case 'users':
        // Get user count for given filters
        const filtersJson = searchParams.get('filters');
        if (!filtersJson) {
          return NextResponse.json(
            { success: false, message: 'Filters required' },
            { status: 400 }
          );
        }
        const filters = JSON.parse(filtersJson);
        const users = await BroadcastService.getTargetedUsers(filters);
        return NextResponse.json({
          success: true,
          count: users.length,
          users: users.map(u => ({ id: u.$id, email: u.email, role: u.role }))
        });

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Error in broadcast GET API:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to retrieve data' },
      { status: 500 }
    );
  }
}
