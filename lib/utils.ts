import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency amount consistently across the application
 * @param amount - Amount in NGN (not kobo)
 * @param options - Optional formatting options
 * @returns Formatted currency string with ₦ symbol
 */
export function formatCurrency(
  amount: number, 
  options?: { 
    showDecimals?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const { 
    showDecimals, 
    minimumFractionDigits, 
    maximumFractionDigits = 2 
  } = options || {};
  
  // Determine if we should show decimals
  const hasDecimals = amount % 1 !== 0;
  const shouldShowDecimals = showDecimals !== undefined ? showDecimals : hasDecimals;
  
  return `₦${amount.toLocaleString('en-NG', { 
    minimumFractionDigits: minimumFractionDigits ?? (shouldShowDecimals ? 2 : 0), 
    maximumFractionDigits 
  })}`;
}

/**
 * Parse comma-separated document URLs from Appwrite storage
 * @param documentsString - Comma-separated string of document URLs
 * @returns Array of document URLs
 */
export function parseDocumentUrls(documentsString?: string): string[] {
  if (!documentsString || documentsString.trim() === '') {
    return [];
  }
  return documentsString.split(',').map(url => url.trim()).filter(url => url.length > 0);
}

/**
 * Join document URLs into comma-separated string for Appwrite storage
 * @param documents - Array of document URLs
 * @returns Comma-separated string
 */
export function joinDocumentUrls(documents: string[]): string {
  return documents.filter(url => url.trim().length > 0).join(',');
}

/**
 * Coerce a backend value that may be a string, JSON string, or array into a string array.
 * Useful for Appwrite/SQLite fields that store arrays as comma-separated or JSON strings.
 */
export function toStringArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(v => String(v));
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    // Try JSON parse first, fall back to comma-separated
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(v => String(v));
      return [];
    } catch {
      return trimmed.split(',').map(v => v.trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * Get the current user's $id from the persisted auth store.
 * Safe to call from client-side service code.
 */
export function getCurrentUserId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed?.state?.user?.$id || '';
    }
  } catch {
    // ignore parse errors
  }
  return '';
}
