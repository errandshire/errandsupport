This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 📧 Email Service Integration

This application uses [Resend](https://resend.com/) for professional transactional email delivery.

### Setup

1. **Create a Resend account** at [resend.com](https://resend.com/)
2. **Generate an API key** in your Resend dashboard
3. **Add environment variables** to your `.env.local`:

```bash
RESEND_API_KEY=your_resend_api_key_here
FROM_EMAIL=notifications@yourdomain.com
REPLY_TO_EMAIL=support@yourdomain.com
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### Email Types

The email service automatically sends notifications for:

- **Messages**: New chat message notifications
- **Booking Acceptance**: When a worker accepts a booking
- **Booking Confirmation**: When payment is confirmed
- **Service Completion**: When worker marks job as done
- **Payment Release**: When payment is released to worker
- **Booking Cancellation**: When bookings are cancelled

### Professional Features

- ✅ **Beautiful HTML templates** with consistent branding
- ✅ **Responsive email design** for all devices
- ✅ **Automatic email validation** before sending
- ✅ **Batch sending** with rate limiting
- ✅ **Error handling** that doesn't break core functionality
- ✅ **Webhook support** for delivery tracking
- ✅ **Security** - API keys never exposed to frontend

### Usage Example

```typescript
import { emailService } from '@/lib/email-service';

// Send booking acceptance email
await emailService.sendBookingAcceptedEmail({
  client: { id: '123', name: 'John Doe', email: 'john@example.com' },
  worker: { id: '456', name: 'Jane Smith', email: 'jane@example.com' },
  booking: {
    id: 'booking_123',
    title: 'House Cleaning',
    description: 'Deep cleaning service',
    scheduledDate: '2024-01-15',
    budgetAmount: 15000,
    budgetCurrency: 'NGN',
    locationAddress: 'Lagos, Nigeria'
  },
  bookingUrl: 'https://app.com/bookings/123'
});
```

### Webhook Integration

Configure your Resend webhook URL to: `https://yourdomain.com/api/webhooks/resend`

This enables tracking of:
- Email delivery status
- Bounce handling
- Spam complaints
- Click tracking
- Open tracking

### Customization

To customize email templates, edit the `EmailTemplateBuilder` class in `/lib/email-service.ts`.

---
