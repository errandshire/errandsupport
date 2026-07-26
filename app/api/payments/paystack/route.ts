import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

const VPS_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || '';

/**
 * Server-side Paystack proxy for wallet operations.
 *
 * Forwards to the VPS backend which holds the Paystack secret key.
 * The secret never touches the Next.js process.
 */

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();

    if (!body.action) {
      return NextResponse.json(
        { success: false, message: 'Missing action' },
        { status: 400 }
      );
    }

    const vpsRes = await fetch(`${VPS_API_BASE}/api/payments/paystack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await vpsRes.json();

    return NextResponse.json(data, { status: vpsRes.status });
  } catch (error: any) {
    console.error('Paystack proxy error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Paystack request failed' },
      { status: 500 }
    );
  }
}
