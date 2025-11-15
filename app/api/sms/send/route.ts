/**
 * Server-side API route for sending SMS
 *
 * This keeps the Termii API key secure on the server
 * and prevents exposing it to the client
 */

import { NextRequest, NextResponse } from 'next/server';
import { TermiiSMSService } from '@/lib/termii-sms.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message } = body;

    // Validate input
    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, message' },
        { status: 400 }
      );
    }

    // Send SMS using server-side environment variables
    const result = await TermiiSMSService.sendSMS({ to, message });

    if (result.success) {
      return NextResponse.json(result);
    } else {
      console.error('❌ SMS failed:', result.error);
      return NextResponse.json(result, { status: 500 });
    }

  } catch (error) {
    console.error('❌ SMS API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS'
      },
      { status: 500 }
    );
  }
}
