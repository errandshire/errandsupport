# SMS Notification Setup (Termii)

## Overview

ErrandSupport now supports SMS notifications using **Termii**, a Nigerian SMS gateway. Users will receive SMS for important events like:
- New bookings
- Disputes raised
- Payment notifications
- Booking confirmations

## Setup Instructions

### 1. Create Termii Account

1. Visit [Termii.com](https://termii.com/)
2. Sign up for an account
3. Verify your account via email

### 2. Get API Credentials

1. Login to your Termii dashboard
2. Navigate to **API Settings**
3. Copy your **API Key**
4. (Optional) Register a **Sender ID** for branded SMS
   - Go to **Sender ID** section
   - Request a sender ID (e.g., "ErrandSupp")
   - Wait for approval (usually 24-48 hours)

### 3. Add Environment Variables

Add these to your `.env.local` file:

```bash
# Termii SMS Configuration
TERMII_API_KEY=your_api_key_here
TERMII_SENDER_ID=ErrandSupp
```

**Notes:**
- `TERMII_API_KEY`: Your Termii API key (required)
- `TERMII_SENDER_ID`: Your registered sender ID (optional, defaults to "ErrandSupp")
  - Max 11 characters
  - Must be approved by Termii before use
  - If not approved, messages will use "Termii" as sender

### 4. Test SMS (Optional)

Create a test file to verify SMS sending:

```typescript
import { SMSService } from '@/lib/sms.service';

async function testSMS() {
  const result = await SMSService.sendSMS({
    to: '08012345678', // Your test number
    message: 'Test SMS from ErrandSupport!'
  });

  console.log(result);
}

testSMS();
```

## Usage

### Send SMS with Notification

The notification service now supports SMS:

```typescript
import { notificationService } from '@/lib/notification-service';

// Send in-app notification + SMS
await notificationService.createNotificationWithSMS({
  userId: 'user123',
  title: 'Booking Confirmed',
  message: 'Your booking has been confirmed!',
  type: 'success',
  phoneNumber: '08012345678', // User's phone
  sendSMS: true, // Enable SMS
});
```

### Direct SMS (Without In-App Notification)

```typescript
import { SMSService } from '@/lib/sms.service';

// Send booking notification
await SMSService.sendBookingNotification('08012345678', {
  service: 'Plumbing',
  date: 'Dec 10, 2024',
  status: 'accepted',
  workerName: 'John Doe'
});

// Send payment notification
await SMSService.sendPaymentNotification('08012345678', {
  amount: 5000,
  type: 'received',
  reference: 'REF123'
});

// Send OTP
await SMSService.sendOTP('08012345678', '123456');
```

## Phone Number Format

The service automatically formats Nigerian phone numbers:

- **Input**: `08012345678` (local format)
- **Output**: `2348012345678` (international format)

Supported formats:
- ✅ `08012345678` (11 digits starting with 0)
- ✅ `2348012345678` (13 digits starting with 234)
- ❌ `8012345678` (invalid)

Validate before sending:
```typescript
if (SMSService.isValidNigerianPhone(phoneNumber)) {
  // Send SMS
}
```

## SMS Cost & Limits

### Termii Pricing (Nigeria)
- **Local SMS**: ~₦2.50 - ₦4.00 per SMS
- **International SMS**: Higher rates apply
- **Minimum top-up**: ₦1,000

### Message Limits
- **Single SMS**: 160 characters
- **Longer messages**: Auto-split (charged per segment)
- Service automatically truncates to 160 chars

### Best Practices
1. **Keep messages short** - under 160 characters
2. **Use abbreviations** where appropriate
3. **Include brand name** at the start
4. **Add actionable info** (booking ID, date, etc.)

Example:
```
ErrandSupport: Booking confirmed for Plumbing on Dec 10. Worker: John. Check app for details.
```

## Features

### 1. Automatic Retry
- Failed SMS are logged but don't block the app
- In-app notifications always work even if SMS fails

### 2. Duplicate Prevention
- Same notification service duplicate prevention applies
- Prevents sending duplicate SMS

### 3. Phone Validation
- Automatic validation before sending
- Invalid numbers are rejected early

### 4. Bulk SMS
```typescript
import { SMSService } from '@/lib/sms.service';

const phoneNumbers = ['08012345678', '08087654321'];
const results = await SMSService.sendBulkSMS(
  phoneNumbers,
  'Important update from ErrandSupport!'
);
```

## Integration Points

SMS is automatically sent for:

1. **Disputes**
   - ✅ Worker notified when client raises dispute
   - ✅ Client notified when dispute is resolved

2. **Bookings** (Ready to integrate)
   - New booking requests
   - Booking acceptances
   - Booking completions
   - Booking cancellations

3. **Payments** (Ready to integrate)
   - Payment received
   - Payment sent
   - Refunds processed
   - Withdrawal confirmations

## Customization

### Custom Sender ID
Change the sender ID in your `.env.local`:
```bash
TERMII_SENDER_ID=YourBrand
```

### Custom Messages
Edit message templates in `/lib/sms.service.ts`:
```typescript
static async sendBookingNotification(...) {
  let message = '';
  if (status === 'pending') {
    message = `Custom message here`; // Customize
  }
  // ...
}
```

## Troubleshooting

### SMS not sending?

1. **Check API key**
   ```bash
   echo $TERMII_API_KEY
   ```

2. **Check Termii balance**
   - Login to Termii dashboard
   - Check wallet balance
   - Top up if needed

3. **Check phone number format**
   ```typescript
   console.log(SMSService.isValidNigerianPhone('08012345678'));
   // Should return true
   ```

4. **Check error logs**
   - Browser console for client-side errors
   - Server logs for API errors

### Sender ID not showing?

- Sender IDs must be approved by Termii
- Check approval status in dashboard
- Unapproved IDs will show "Termii" as sender
- Approval takes 24-48 hours

### Messages too long?

```typescript
// Check message length
const message = 'Your very long message here...';
if (message.length > 160) {
  console.warn('Message will be split into multiple SMS');
}
```

## Security Notes

1. **Never expose API key** in client-side code
2. **Store API key** in environment variables only
3. **Validate phone numbers** before sending
4. **Rate limit** SMS sending to prevent abuse
5. **Monitor usage** in Termii dashboard

## Support

- **Termii Support**: support@termii.com
- **Termii Docs**: https://developers.termii.com/
- **Termii Dashboard**: https://accounts.termii.com/

## Cost Estimation

Example monthly costs for 1000 users:

| Event | SMS/User/Month | Total SMS | Cost (₦) |
|-------|----------------|-----------|----------|
| Bookings | 2 | 2,000 | 6,000 |
| Disputes | 0.5 | 500 | 1,500 |
| Payments | 1 | 1,000 | 3,000 |
| **Total** | **3.5** | **3,500** | **~₦10,500** |

**Note**: Costs are estimates. Actual rates depend on your Termii plan.
