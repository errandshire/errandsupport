import { NextRequest, NextResponse } from 'next/server';
import { PartnerService } from '@/lib/partner.service';
const { serverDatabases } = require('@/lib/appwrite-server');

/**
 * GET /api/partners/validate?code=EW-XXX
 *
 * Validates a partner referral code.
 * Uses server SDK since caller may not be authenticated.
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { valid: false, message: 'Code parameter is required' },
        { status: 400 }
      );
    }

    const result = await PartnerService.validatePartnerCode(code, serverDatabases);

    return NextResponse.json({
      valid: result.valid,
      partnerName: result.partnerName || null,
    });
  } catch (error) {
    console.error('Partner validation error:', error);
    return NextResponse.json(
      { valid: false, message: 'Validation failed' },
      { status: 500 }
    );
  }
}
