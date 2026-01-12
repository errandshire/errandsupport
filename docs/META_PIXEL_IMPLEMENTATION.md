# Meta Pixel Implementation Guide

## Overview
Meta Pixel (Facebook Pixel) has been successfully implemented across the ErandWork platform to track user behavior, conversions, and optimize ad campaigns.

**Pixel ID:** `460428012440077`

## Installation Summary

### ✅ Completed Implementation

1. **Environment Configuration**
   - Added `NEXT_PUBLIC_META_PIXEL_ID=460428012440077` to `.env.local`

2. **Base Pixel Code**
   - Created `components/analytics/meta-pixel.tsx` with Meta Pixel base code
   - Integrated with Next.js App Router using `next/script`
   - Added to root layout (`app/layout.tsx`) in `<head>` section
   - Automatic PageView tracking on route changes

3. **Event Tracking Utilities**
   - Created `lib/meta-pixel-events.ts` with type-safe tracking functions
   - Standard Events: PageView, Lead, Purchase, CompleteRegistration, InitiateCheckout, ViewContent, Search, etc.
   - Custom Events: JobApplication, WorkerVerification, ReviewSubmitted, WithdrawalRequested, WalletTopUp

4. **Key Conversion Events Implemented**

   | Event | Location | Description |
   |-------|----------|-------------|
   | **CompleteRegistration** | `app/(auth)/register/page.tsx:80` | Tracks successful worker/client registration |
   | **Lead (Job Post)** | `components/client/job-posting-modal.tsx:218` | Tracks when client posts a new job |
   | **InitiateCheckout** | `app/workers/page.tsx:163` | Tracks when client initiates booking/payment |
   | **Purchase** | `app/workers/page.tsx:182` | Tracks successful payment completion |

## Testing & Verification

### Next Steps to Verify Installation

1. **Open Meta Events Manager**
   - Go to: https://business.facebook.com/events_manager2
   - Select your Pixel ID: `460428012440077`

2. **Check Pixel Status**
   - Status should show "Active" within 20 minutes of first page load
   - If still "No Activity Yet" after 30 minutes, check browser console for errors

3. **Use Test Events Tool**
   - Navigate to Test Events in Events Manager
   - Enter your website URL
   - Click "Open Website" and perform test actions:
     - Visit homepage (PageView)
     - Register a new account (CompleteRegistration)
     - Post a job (Lead)
     - Initiate a booking (InitiateCheckout)
     - Complete payment (Purchase)

4. **Install Meta Pixel Helper (Chrome Extension)**
   - Download: https://chrome.google.com/webstore/detail/meta-pixel-helper/
   - Open your website with extension active
   - Icon will show pixel status and events fired

### Expected Events in Events Manager

Once testing is complete, you should see:

- **PageView** - Every page navigation
- **CompleteRegistration** - User signups
- **Lead** - Job postings
- **InitiateCheckout** - Booking initiations
- **Purchase** - Completed payments

## Implementation Details

### File Changes

#### 1. Environment Variables
**File:** `.env.local`
```env
NEXT_PUBLIC_META_PIXEL_ID=460428012440077
```

#### 2. Meta Pixel Component
**File:** `components/analytics/meta-pixel.tsx`
- Loads Meta Pixel script with `next/script` for optimal performance
- Strategy: `afterInteractive` (loads after page is interactive)
- Tracks PageView automatically on route changes using Next.js router events
- Includes noscript fallback for users with JavaScript disabled

#### 3. Root Layout Integration
**File:** `app/layout.tsx`
```tsx
import { MetaPixel } from "@/components/analytics/meta-pixel";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <MetaPixel />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

#### 4. Event Tracking Utilities
**File:** `lib/meta-pixel-events.ts`

**Core Functions:**
- `trackMetaEvent(eventName, params)` - Track standard events
- `trackCustomEvent(eventName, params)` - Track custom events
- `isMetaPixelLoaded()` - Check if pixel is ready

**Specialized Functions for ErandWork:**
- `trackRegistration(userType)` - Worker/client signup
- `trackJobPost(jobId, title, budget)` - Job posting
- `trackBookingInitiated(bookingId, serviceName, amount)` - Booking start
- `trackPurchase(transactionId, amount, serviceName)` - Payment completion
- `trackJobApplication(jobId, jobTitle)` - Worker applies to job
- `trackWorkerView(workerId, workerName, category)` - Worker profile view
- `trackSearch(query, category)` - Search actions
- And more...

#### 5. Registration Tracking
**File:** `app/(auth)/register/page.tsx:80`
```tsx
import { trackRegistration } from "@/lib/meta-pixel-events";

const onSubmit = async (data: RegisterFormData) => {
  const result = await registerUser(data);

  if (result.success) {
    // Track successful registration
    trackRegistration(data.role); // 'worker' or 'client'
    router.push("/onboarding");
  }
};
```

#### 6. Job Posting Tracking
**File:** `components/client/job-posting-modal.tsx:218`
```tsx
import { trackJobPost } from "@/lib/meta-pixel-events";

const handleSubmit = async () => {
  const job = await JobPostingService.createJob(clientId, formData);

  // Track job posting event
  const budget = formData.budgetType === 'fixed'
    ? formData.budgetMax
    : (formData.budgetMax + formData.budgetMin) / 2;
  trackJobPost(job.$id, formData.title, budget);

  await JobNotificationService.notifyNewJobPosted(job);
  toast.success('Job posted successfully!');
};
```

#### 7. Booking & Payment Tracking
**File:** `app/workers/page.tsx:163-182`
```tsx
import { trackBookingInitiated, trackPurchase } from "@/lib/meta-pixel-events";

const handleBookingSubmit = async (bookingData) => {
  // Track booking initiation
  trackBookingInitiated(bookingId, bookingData.title, amount);

  // Hold funds in escrow
  const paymentResult = await WalletService.holdFundsForBooking({
    clientId: user.$id,
    bookingId,
    amountInNaira: amount
  });

  if (!paymentResult.success) {
    toast.error(paymentResult.message);
    return;
  }

  // Track successful purchase
  trackPurchase(bookingId, amount, bookingData.title);

  // Create booking and notify worker
  await databases.createDocument(/* ... */);
};
```

## Additional Events You Can Implement

The tracking utilities include many more functions ready to use:

### Job Application Flow
```tsx
import { trackJobApplication } from "@/lib/meta-pixel-events";

// In worker job application handler
trackJobApplication(jobId, jobTitle);
```

### Worker Profile Views
```tsx
import { trackWorkerView } from "@/lib/meta-pixel-events";

// When client views worker profile
trackWorkerView(workerId, workerName, category);
```

### Search Tracking
```tsx
import { trackSearch } from "@/lib/meta-pixel-events";

// When user searches for services/workers
trackSearch(searchQuery, category);
```

### Worker Verification
```tsx
import { trackWorkerVerification } from "@/lib/meta-pixel-events";

// When worker submits verification documents
trackWorkerVerification(workerId);
```

### Withdrawal Requests
```tsx
import { trackWithdrawalRequest } from "@/lib/meta-pixel-events";

// When worker requests withdrawal
trackWithdrawalRequest(amount, workerId);
```

### Wallet Top-Up
```tsx
import { trackWalletTopUp } from "@/lib/meta-pixel-events";

// When client adds funds to wallet
trackWalletTopUp(amount, userId);
```

### Review Submission
```tsx
import { trackReviewSubmission } from "@/lib/meta-pixel-events";

// When user submits a review
trackReviewSubmission(bookingId, rating);
```

### Contact/Messaging
```tsx
import { trackContact } from "@/lib/meta-pixel-events";

// When user sends a message
trackContact('worker'); // or 'client' or 'admin'
```

## Event Parameters

All events include relevant parameters for better targeting:

```typescript
{
  value: number;              // Amount in NGN
  currency: 'NGN';            // Nigerian Naira
  content_name: string;       // Job title, service name, etc.
  content_ids: string[];      // Job ID, booking ID, worker ID
  content_type: string;       // 'job', 'booking', 'worker_profile', etc.
  content_category: string;   // Service category
  num_items: number;          // Number of items
  status: string;             // 'completed', 'active', etc.
}
```

## Best Practices

1. **Event Naming**
   - Use Meta's standard events when possible (Purchase, Lead, CompleteRegistration)
   - Custom events should be descriptive and consistent

2. **Value Tracking**
   - Always include `value` and `currency` for monetary events
   - Use actual transaction amounts, not estimates

3. **Content IDs**
   - Use database IDs for tracking specific items
   - Helps with catalog matching and dynamic ads

4. **Error Handling**
   - Events fail gracefully if Pixel isn't loaded
   - Console warnings help debugging
   - Production code continues executing if tracking fails

5. **Privacy Compliance**
   - Meta Pixel complies with GDPR/CCPA when properly configured
   - Consider adding cookie consent banner for EU users
   - Use Advanced Matching only with user consent

## Troubleshooting

### Pixel Not Loading
- Check browser console for script errors
- Verify `NEXT_PUBLIC_META_PIXEL_ID` is set correctly
- Ensure ad blockers are disabled for testing

### Events Not Firing
- Check console for tracking logs: `Meta Pixel: "<event>" event tracked`
- Verify function is called after async operations complete
- Use Meta Pixel Helper extension to debug

### Wrong Event Values
- Check parameter types (number vs string)
- Verify currency is set to 'NGN'
- Ensure amounts are in Naira, not kobo

### Hydration Errors
- Meta Pixel component uses `"use client"` directive
- Script loads `afterInteractive` to avoid SSR issues
- PageView tracking uses client-side router events

## Conversion Optimization

Once Meta Pixel is active, you can:

1. **Create Custom Audiences**
   - Users who viewed worker profiles
   - Users who initiated checkout but didn't complete
   - Users who registered as workers vs clients

2. **Set Up Conversion Events**
   - Optimize ads for:
     - Worker registrations
     - Job postings
     - Completed bookings
     - Wallet top-ups

3. **Track ROI**
   - Measure cost per registration
   - Track customer lifetime value
   - Analyze conversion funnels

4. **Retargeting Campaigns**
   - Show ads to users who abandoned checkout
   - Promote to users who viewed workers but didn't book
   - Re-engage inactive users

## Support Resources

- **Meta Events Manager:** https://business.facebook.com/events_manager2
- **Meta Pixel Documentation:** https://developers.facebook.com/docs/meta-pixel
- **Test Events Tool:** https://www.facebook.com/business/help/952192354843755
- **Pixel Helper Extension:** https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc

## Next Steps

1. ✅ Install Meta Pixel base code
2. ✅ Add key conversion events (Registration, Job Post, Purchase)
3. ✅ Create tracking utility functions
4. ⏳ **Test installation in Meta Events Manager**
5. ⏳ **Verify events are firing correctly**
6. ⏳ Create custom audiences in Ads Manager
7. ⏳ Set up conversion campaigns
8. ⏳ Monitor performance and optimize

---

**Implementation Date:** January 12, 2026
**Developer:** Claude Code
**Status:** ✅ Complete - Ready for Testing
