"use client";

import { useEffect, Suspense } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';

// Facebook Pixel ID - hardcoded as per setup instructions
const FACEBOOK_PIXEL_ID = "578239610519722";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

function MetaPixelTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page views on route change
  useEffect(() => {
    if (typeof window.fbq === 'undefined') return;

    // Track PageView event
    window.fbq('track', 'PageView');

    console.log('Facebook Pixel: PageView tracked for', pathname);
  }, [pathname, searchParams]);

  return null;
}

export function MetaPixel() {
  return (
    <>
      {/* Facebook Pixel Base Code */}
      <Script
        id="facebook-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${FACEBOOK_PIXEL_ID}');
            fbq('track', 'PageView');
          `,
        }}
      />

      {/* Page view tracking with Suspense */}
      <Suspense fallback={null}>
        <MetaPixelTracking />
      </Suspense>

      {/* Noscript fallback */}
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

// Facebook Pixel Event Tracking Utilities
export const fbPixelEvent = {
  // Standard Events
  pageView: () => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "PageView");
    }
  },

  viewContent: (data?: { content_name?: string; content_category?: string; value?: number; currency?: string }) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "ViewContent", data);
    }
  },

  search: (data?: { search_string?: string; content_category?: string }) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Search", data);
    }
  },

  addToCart: (data?: { content_name?: string; content_ids?: string[]; value?: number; currency?: string }) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "AddToCart", data);
    }
  },

  initiateCheckout: (data?: { content_category?: string; num_items?: number; value?: number; currency?: string }) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "InitiateCheckout", data);
    }
  },

  addPaymentInfo: (data?: { content_category?: string; value?: number; currency?: string }) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "AddPaymentInfo", data);
    }
  },

  purchase: (data: { value: number; currency: string; content_ids?: string[]; content_type?: string; num_items?: number }) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Purchase", data);
    }
  },

  lead: (data?: { content_name?: string; content_category?: string; value?: number; currency?: string }) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Lead", data);
    }
  },

  completeRegistration: (data?: { content_name?: string; status?: boolean; value?: number; currency?: string }) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "CompleteRegistration", data);
    }
  },

  contact: (data?: { content_name?: string; content_category?: string }) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Contact", data);
    }
  },

  // Custom Events for ErrandWork
  jobPosted: (data?: { job_category?: string; budget?: number; currency?: string }) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("trackCustom", "JobPosted", data);
    }
  },

  jobApplied: (data?: { job_id?: string; job_category?: string }) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("trackCustom", "JobApplied", data);
    }
  },

  jobAccepted: (data?: { job_id?: string; value?: number; currency?: string }) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("trackCustom", "JobAccepted", data);
    }
  },

  jobCompleted: (data?: { job_id?: string; value?: number; currency?: string; worker_id?: string }) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("trackCustom", "JobCompleted", data);
    }
  },

  workerRegistered: (data?: { worker_category?: string }) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("trackCustom", "WorkerRegistered", data);
    }
  },

  paymentMade: (data: { value: number; currency: string; payment_method?: string }) => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("trackCustom", "PaymentMade", data);
    }
  },
};
