import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth-guard';
import { PaystackService } from '@/lib/paystack.service';

/**
 * Server-side Paystack proxy for wallet operations.
 *
 * The Paystack secret key must never be exposed to the browser.
 * Client wallet pages call this route; the secret is read server-side only.
 */

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAuth(request);
    if (error) return error;

    const body = await request.json();
    const { action, ...params } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Missing action' },
        { status: 400 }
      );
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        { success: false, message: 'Paystack is not configured on the server' },
        { status: 503 }
      );
    }

    let result;

    switch (action) {
      case 'initialize':
        if (!params.amountInNaira || !params.email || !params.reference) {
          return NextResponse.json(
            { success: false, message: 'Missing amount, email or reference' },
            { status: 400 }
          );
        }
        result = await PaystackService.initializePayment({
          amountInNaira: Number(params.amountInNaira),
          email: params.email,
          reference: params.reference,
          callbackUrl: params.callbackUrl || `${process.env.NEXT_PUBLIC_BASE_URL || ''}/client/wallet`,
          metadata: params.metadata || {}
        });
        break;

      case 'verifyBankAccount':
        if (!params.accountNumber || !params.bankCode) {
          return NextResponse.json(
            { success: false, message: 'Missing accountNumber or bankCode' },
            { status: 400 }
          );
        }
        result = await PaystackService.verifyBankAccount({
          accountNumber: params.accountNumber,
          bankCode: params.bankCode
        });
        break;

      case 'createRecipient':
        if (!params.accountNumber || !params.bankCode || !params.accountName) {
          return NextResponse.json(
            { success: false, message: 'Missing accountNumber, bankCode or accountName' },
            { status: 400 }
          );
        }
        result = await PaystackService.createRecipient({
          accountNumber: params.accountNumber,
          bankCode: params.bankCode,
          accountName: params.accountName
        });
        break;

      case 'initiateTransfer':
        if (!params.amountInNaira || !params.recipientCode || !params.reference) {
          return NextResponse.json(
            { success: false, message: 'Missing amount, recipientCode or reference' },
            { status: 400 }
          );
        }
        result = await PaystackService.initiateTransfer({
          amountInNaira: Number(params.amountInNaira),
          recipientCode: params.recipientCode,
          reference: params.reference,
          reason: params.reason || 'Withdrawal'
        });
        break;

      case 'getBanks':
        result = await PaystackService.getBanks();
        break;

      default:
        return NextResponse.json(
          { success: false, message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Paystack proxy error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Paystack request failed' },
      { status: 500 }
    );
  }
}
