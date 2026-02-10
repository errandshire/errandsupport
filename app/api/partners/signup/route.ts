import { NextRequest, NextResponse } from 'next/server';
import { PartnerService } from '@/lib/partner.service';
const { serverDatabases } = require('@/lib/appwrite-server');

/**
 * POST /api/partners/signup
 *
 * Public endpoint for partner signup.
 * Uses server SDK (API key) since no user session exists.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, experience } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: 'Name and email are required' },
        { status: 400 }
      );
    }

    const partner = await PartnerService.createPartner({
      name,
      email,
      phone,
      experience,
    }, serverDatabases);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://errandwork.com';
    const referralLink = `${baseUrl}/register?ref=${partner.partnerCode}`;

    return NextResponse.json({
      success: true,
      partnerCode: partner.partnerCode,
      referralLink,
      partnerId: partner.$id,
    });
  } catch (error) {
    console.error('Partner signup error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create partner account' },
      { status: 500 }
    );
  }
}
