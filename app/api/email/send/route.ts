import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend client on server-side
const resend = new Resend(process.env.RESEND_API_KEY || 'dummy-key-for-build');

// Email configuration
const EMAIL_CONFIG = {
  from: process.env.FROM_EMAIL || 'notifications@erandwork.com',
  replyTo: process.env.REPLY_TO_EMAIL || 'support@erandwork.com',
  company: 'ErandWork',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://www.erandwork.com'
};

export async function POST(request: NextRequest) {
  try {
    
    const body = await request.json();
    const { to, subject, html, type, data } = body;


    // Validate required fields
    if (!to || !subject || !html) {
      console.error('❌ Missing required fields:', { to, subject, hasHtml: !!html });
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.error('❌ Invalid email format:', to);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'dummy-key-for-build') {
      console.error('❌ Resend API key not configured');
      return NextResponse.json(
        { error: 'Email service not configured - RESEND_API_KEY missing' },
        { status: 503 }
      );
    }


    // Send email via Resend
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to,
      subject,
      html,
      replyTo: EMAIL_CONFIG.replyTo
    });

    

    return NextResponse.json({
      success: true,
      messageId: result.data?.id,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    
    // Handle specific Resend errors
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Email service authentication failed' },
          { status: 401 }
        );
      }
      if (error.message.includes('domain')) {
        return NextResponse.json(
          { error: 'Email domain not verified' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
} 