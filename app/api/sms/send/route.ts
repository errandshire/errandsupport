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

    // Log environment check (without exposing actual keys)
    console.log('📱 SMS API Route - Environment check:', {
      hasApiKey: !!process.env.TERMII_API_KEY,
      hasSenderId: !!process.env.TERMII_SENDER_ID,
      environment: process.env.NODE_ENV,
      to: to?.substring(0, 5) + '***' // Log partial phone for debugging
    });

    // Validate input
    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, message' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.TERMII_API_KEY) {
      console.error('❌ TERMII_API_KEY not found in environment variables');
      return NextResponse.json(
        { success: false, error: 'SMS service not configured - API key missing' },
        { status: 500 }
      );
    }

    // Send SMS using server-side environment variables
    const result = await TermiiSMSService.sendSMS({ to, message });

    if (result.success) {
      console.log('✅ SMS sent successfully to:', to?.substring(0, 5) + '***');
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
