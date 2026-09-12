import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

const VPS_API_BASE =
  process.env.INTERNAL_VPS_BASE_URL ||
  (process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') ?? 'http://72.62.179.203:3004');

/**
 * Server-side Paystack proxy for wallet operations.
 *
 * Maps action parameter to the correct VPS Paystack endpoint.
 * The VPS holds the Paystack secret key — it never touches the Next.js process.
 */

const ACTION_MAP: Record<string, { path: string; method: string }> = {
  initialize: { path: '/api/paystack/initialize', method: 'POST' },
  getBanks: { path: '/api/paystack/banks', method: 'GET' },
  verifyBankAccount: { path: '/api/paystack/verify-account', method: 'POST' },
  createCustomer: { path: '/api/paystack/create-customer', method: 'POST' },
  createRecipient: { path: '/api/paystack/create-recipient', method: 'POST' },
  initiateTransfer: { path: '/api/paystack/transfer', method: 'POST' },
};

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

    const route = ACTION_MAP[body.action];
    if (!route) {
      return NextResponse.json(
        { success: false, message: `Unknown action: ${body.action}` },
        { status: 400 }
      );
    }

    const { action, ...params } = body;

    // Map parameters for each action
    let vpsBody: Record<string, any> = params;

    if (action === 'initialize') {
      // VPS expects userId at top level, not just in metadata
      vpsBody = {
        amountInNaira: params.amountInNaira,
        email: params.email,
        userId: params.metadata?.userId || params.userId,
        metadata: {
          ...params.metadata,
          reference: params.reference,
          callbackUrl: params.callbackUrl,
        },
      };
    }

    const fetchOptions: RequestInit = {
      method: route.method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (route.method === 'POST') {
      fetchOptions.body = JSON.stringify(vpsBody);
    }

    const vpsRes = await fetch(`${VPS_API_BASE}${route.path}`, fetchOptions);

    const data = await vpsRes.json();

    // Wrap VPS response in the expected format
    if (vpsRes.ok) {
      return NextResponse.json({ success: true, data }, { status: 200 });
    }
    return NextResponse.json(
      { success: false, message: data.error || 'Paystack request failed' },
      { status: vpsRes.status }
    );
  } catch (error: any) {
    console.error('Paystack proxy error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Paystack request failed' },
      { status: 500 }
    );
  }
}
