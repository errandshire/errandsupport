import { NextRequest, NextResponse } from 'next/server';
import { PartnerService } from '@/lib/partner.service';
const { serverDatabases } = require('@/lib/appwrite-server');

/**
 * POST /api/partners/referral
 *
 * Creates a referral record linking a partner to a newly registered client.
 * Uses server SDK since the client may not have a session yet during registration.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { partnerCode, clientId, clientEmail } = body;

    if (!partnerCode || !clientId || !clientEmail) {
      return NextResponse.json(
        { success: false, message: 'partnerCode, clientId, and clientEmail are required' },
        { status: 400 }
      );
    }

    // Validate the partner code first
    const validation = await PartnerService.validatePartnerCode(partnerCode, serverDatabases);
    if (!validation.valid || !validation.partnerId) {
      return NextResponse.json(
        { success: false, message: 'Invalid or inactive partner code' },
        { status: 400 }
      );
    }

    const referral = await PartnerService.createReferral({
      partnerCode,
      partnerId: validation.partnerId,
      clientId,
      clientEmail,
    }, serverDatabases);

    return NextResponse.json({
      success: !!referral,
      referralId: referral?.$id || null,
    });
  } catch (error) {
    console.error('Referral creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create referral' },
      { status: 500 }
    );
  }
}
