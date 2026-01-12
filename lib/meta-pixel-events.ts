/**
 * Meta Pixel Event Tracking Utilities
 * Provides type-safe wrapper functions for Meta Pixel events
 */

// Standard Event Types
export type MetaStandardEvent =
  | 'PageView'
  | 'ViewContent'
  | 'Search'
  | 'AddToCart'
  | 'AddToWishlist'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'Lead'
  | 'CompleteRegistration'
  | 'Contact'
  | 'CustomizeProduct'
  | 'Donate'
  | 'FindLocation'
  | 'Schedule'
  | 'StartTrial'
  | 'SubmitApplication'
  | 'Subscribe';

// Event Parameters Interface
export interface MetaEventParams {
  // E-commerce parameters
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  contents?: Array<{
    id: string;
    quantity?: number;
    item_price?: number;
  }>;
  num_items?: number;

  // User parameters
  predicted_ltv?: number;
  status?: string;

  // Search parameters
  search_string?: string;

  // Custom parameters
  [key: string]: any;
}

/**
 * Check if Meta Pixel is loaded
 */
export function isMetaPixelLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.fbq !== 'undefined';
}

/**
 * Track a standard Meta Pixel event
 */
export function trackMetaEvent(
  eventName: MetaStandardEvent,
  params?: MetaEventParams
): void {
  if (!isMetaPixelLoaded()) {
    console.warn(`Meta Pixel not loaded. Event "${eventName}" not tracked.`);
    return;
  }

  try {
    if (params) {
      window.fbq('track', eventName, params);
    } else {
      window.fbq('track', eventName);
    }
    console.log(`Meta Pixel: "${eventName}" event tracked`, params || '');
  } catch (error) {
    console.error(`Error tracking Meta Pixel event "${eventName}":`, error);
  }
}

/**
 * Track a custom Meta Pixel event
 */
export function trackCustomEvent(
  eventName: string,
  params?: MetaEventParams
): void {
  if (!isMetaPixelLoaded()) {
    console.warn(`Meta Pixel not loaded. Custom event "${eventName}" not tracked.`);
    return;
  }

  try {
    if (params) {
      window.fbq('trackCustom', eventName, params);
    } else {
      window.fbq('trackCustom', eventName);
    }
    console.log(`Meta Pixel: Custom event "${eventName}" tracked`, params || '');
  } catch (error) {
    console.error(`Error tracking custom Meta Pixel event "${eventName}":`, error);
  }
}

// ============================================
// SPECIALIZED EVENT FUNCTIONS FOR ERRANDWORK
// ============================================

/**
 * Track user registration (worker or client)
 */
export function trackRegistration(userType: 'worker' | 'client'): void {
  trackMetaEvent('CompleteRegistration', {
    content_name: `${userType} Registration`,
    status: 'completed',
  });
}

/**
 * Track worker profile view
 */
export function trackWorkerView(workerId: string, workerName: string, category?: string): void {
  trackMetaEvent('ViewContent', {
    content_type: 'worker_profile',
    content_ids: [workerId],
    content_name: workerName,
    content_category: category || 'general',
  });
}

/**
 * Track service/job search
 */
export function trackSearch(searchQuery: string, category?: string): void {
  trackMetaEvent('Search', {
    search_string: searchQuery,
    content_category: category,
  });
}

/**
 * Track job posting creation
 */
export function trackJobPost(jobId: string, jobTitle: string, budget: number): void {
  trackMetaEvent('Lead', {
    content_name: jobTitle,
    content_ids: [jobId],
    value: budget,
    currency: 'NGN',
    content_type: 'job_post',
  });
}

/**
 * Track job application by worker
 */
export function trackJobApplication(jobId: string, jobTitle: string): void {
  trackCustomEvent('JobApplication', {
    content_name: jobTitle,
    content_ids: [jobId],
    content_type: 'job',
  });
}

/**
 * Track booking creation (checkout initiated)
 */
export function trackBookingInitiated(
  bookingId: string,
  serviceName: string,
  amount: number
): void {
  trackMetaEvent('InitiateCheckout', {
    content_name: serviceName,
    content_ids: [bookingId],
    content_type: 'booking',
    value: amount,
    currency: 'NGN',
    num_items: 1,
  });
}

/**
 * Track payment information added
 */
export function trackPaymentInfo(bookingId: string, amount: number): void {
  trackMetaEvent('AddPaymentInfo', {
    content_ids: [bookingId],
    value: amount,
    currency: 'NGN',
  });
}

/**
 * Track completed payment/purchase
 */
export function trackPurchase(
  transactionId: string,
  amount: number,
  serviceName?: string
): void {
  trackMetaEvent('Purchase', {
    content_name: serviceName || 'Service Purchase',
    content_ids: [transactionId],
    content_type: 'transaction',
    value: amount,
    currency: 'NGN',
  });
}

/**
 * Track worker verification submission
 */
export function trackWorkerVerification(workerId: string): void {
  trackCustomEvent('WorkerVerificationSubmitted', {
    content_ids: [workerId],
    content_type: 'verification',
  });
}

/**
 * Track worker profile completion
 */
export function trackProfileCompletion(workerId: string, completionPercentage: number): void {
  trackCustomEvent('ProfileCompleted', {
    content_ids: [workerId],
    value: completionPercentage,
  });
}

/**
 * Track contact/message sent
 */
export function trackContact(recipientType: 'worker' | 'client' | 'admin'): void {
  trackMetaEvent('Contact', {
    content_category: recipientType,
  });
}

/**
 * Track service scheduling
 */
export function trackSchedule(bookingId: string, serviceName: string): void {
  trackMetaEvent('Schedule', {
    content_name: serviceName,
    content_ids: [bookingId],
    content_type: 'booking',
  });
}

/**
 * Track review submission
 */
export function trackReviewSubmission(bookingId: string, rating: number): void {
  trackCustomEvent('ReviewSubmitted', {
    content_ids: [bookingId],
    value: rating,
    content_type: 'review',
  });
}

/**
 * Track withdrawal request
 */
export function trackWithdrawalRequest(amount: number, workerId: string): void {
  trackCustomEvent('WithdrawalRequested', {
    content_ids: [workerId],
    value: amount,
    currency: 'NGN',
  });
}

/**
 * Track wallet top-up
 */
export function trackWalletTopUp(amount: number, userId: string): void {
  trackCustomEvent('WalletTopUp', {
    content_ids: [userId],
    value: amount,
    currency: 'NGN',
  });
}
