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
