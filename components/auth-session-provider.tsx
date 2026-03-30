"use client";

import { useEffect } from "react";

/**
 * Patches window.fetch so that every same-origin /api/* request
 * automatically includes the Appwrite session token from localStorage.
 *
 * The Appwrite client SDK stores the session in localStorage under
 * the key "cookieFallback" (format: "a_session_<projectId>=<secret>").
 * Our Next.js API routes read this from the X-Appwrite-Session header
 * in auth-guard.ts.
 *
 * Mount this once near the root of the app (e.g., inside <Providers>).
 */
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = function patchedFetch(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

      // Only inject on same-origin /api/ calls (skip external requests)
      if (url.startsWith("/api/")) {
        try {
          const fallback = localStorage.getItem("cookieFallback");
          if (fallback) {
            const match = fallback.match(/a_session_[^=]+=([^;]+)/);
            if (match?.[1]) {
              const headers = new Headers(init?.headers);
              if (!headers.has("x-appwrite-session")) {
                headers.set("x-appwrite-session", match[1]);
              }
              init = { ...init, headers };
            }
          }
        } catch {
          // localStorage unavailable
        }
      }

      return originalFetch.call(this, input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return <>{children}</>;
}
