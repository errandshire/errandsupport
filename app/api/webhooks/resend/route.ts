import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('resend-signature');
    const body = await req.text();

    // Verify webhook signature (implement based on Resend's documentation)
    if (!signature) {
      console.error('Missing Resend signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Parse webhook payload
    const event = JSON.parse(body);
    
    console.log('📧 Resend webhook event:', {
      type: event.type,
      messageId: event.data?.message_id,
      email: event.data?.email,
      timestamp: event.created_at
    });

    // Handle different event types
    switch (event.type) {
      case 'email.sent':
        console.log('✅ Email sent successfully:', event.data);
        break;
        
      case 'email.delivered':
        console.log('📬 Email delivered:', event.data);
        break;
        
      case 'email.bounced':
        console.log('❌ Email bounced:', event.data);
        // Could implement user notification or email address cleanup
        break;
        
      case 'email.complained':
        console.log('⚠️ Spam complaint:', event.data);
        // Could implement automatic unsubscribe
        break;
        
      case 'email.clicked':
        console.log('🔗 Email link clicked:', event.data);
        break;
        
      case 'email.opened':
        console.log('👀 Email opened:', event.data);
        break;
        
      default:
        console.log('🔍 Unknown email event:', event.type);
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('❌ Error processing Resend webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 