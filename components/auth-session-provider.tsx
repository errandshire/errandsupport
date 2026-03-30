"use client";

import { useEffect } from "react";

/**
 * Patches window.fetch so that every same-origin /api/* request
 * automatically includes the Appwrite session token from localStorage.
 *
 * The Appwrite client SDK stores the session in localStorage under
 * the key "cookieFallback" as a JSON object:
 *   { "a_session_<projectId>": "<sessionSecret>" }
 *
 * Our Next.js API routes read the secret from the X-Appwrite-Session
 * header in auth-guard.ts.
 *
 * Mount this once near the root of the app (inside <Providers>).
 */
function getSessionSecret(): string | null {
  try {
    const raw = localStorage.getItem("cookieFallback");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    // Find the a_session_<projectId> key
    const key = Object.keys(parsed).find((k) => k.startsWith("a_session_"));
    return key ? parsed[key] || null : null;
  } catch {
    return null;
  }
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = function patchedFetch(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

      if (url.startsWith("/api/")) {
        const secret = getSessionSecret();
        if (secret) {
          const headers = new Headers(init?.headers);
          if (!headers.has("x-appwrite-session")) {
            headers.set("x-appwrite-session", secret);
          }
          init = { ...init, headers };
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
