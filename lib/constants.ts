// Application Constants
export const APP_NAME = 'Errand Support Platform';
export const APP_DESCRIPTION = 'Premium web-based marketplace connecting clients with local errand-support workers';
export const APP_VERSION = '1.0.0';

// API Constants
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
export const API_VERSION = 'v1';

// Pagination Constants
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE = 1;

// File Upload Constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

// User Roles
export const USER_ROLES = {
  CLIENT: 'client',
  WORKER: 'worker',
  ADMIN: 'admin',
} as const;

// User Status
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const;

// Booking Status
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
} as const;

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

// Verification Status
export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  PAYMENT_RECEIVED: 'payment_received',
  REVIEW_RECEIVED: 'review_received',
  VERIFICATION_APPROVED: 'verification_approved',
  VERIFICATION_REJECTED: 'verification_rejected',
  SYSTEM_ANNOUNCEMENT: 'system_announcement',
  NEW_MESSAGE: 'new_message',
  FILE_SHARED: 'file_shared',
  JOB_POSTED: 'job_posted',
  JOB_ACCEPTED: 'job_accepted',
  JOB_FILLED: 'job_filled',
  JOB_EXPIRED: 'job_expired',
} as const;

// Service Categories
export const SERVICE_CATEGORIES = [
  {
    id: 'cleaning',
    name: 'Cleaning Services',
    icon: '🧹',
    color: '#22c55e',
    description: 'Home and office cleaning services',
  },
  {
    id: 'delivery',
    name: 'Delivery & Pickup',
    icon: '🚚',
    color: '#3b82f6',
    description: 'Package delivery and pickup services',
  },
  {
    id: 'grocery',
    name: 'Grocery Shopping',
    icon: '🛒',
    color: '#f59e0b',
    description: 'Grocery shopping and delivery',
  },
  {
    id: 'pet_care',
    name: 'Pet Care',
    icon: '🐕',
    color: '#8b5cf6',
    description: 'Pet walking, feeding, and care services',
  },
  {
    id: 'home_maintenance',
    name: 'Home Maintenance',
    icon: '🔧',
    color: '#ef4444',
    description: 'Basic home repairs and maintenance',
  },
  {
    id: 'gardening',
    name: 'Gardening',
    icon: '🌱',
    color: '#10b981',
    description: 'Garden care and landscaping services',
  },
  {
    id: 'moving',
    name: 'Moving & Storage',
    icon: '📦',
    color: '#6366f1',
    description: 'Moving assistance and storage services',
  },
  {
    id: 'elderly_care',
    name: 'Elderly Care',
    icon: '👴',
    color: '#ec4899',
    description: 'Companion and care services for elderly',
  },
  {
    id: 'personal_assistant',
    name: 'Personal Assistant',
    icon: '📋',
    color: '#14b8a6',
    description: 'Personal assistance and administrative tasks',
  },
  {
    id: 'other',
    name: 'Other Services',
    icon: '⚡',
    color: '#6b7280',
    description: 'Other miscellaneous services',
  },
] as const;

// Time Slots
export const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00',
] as const;

// Rating Options
export const RATING_OPTIONS = [
  { value: 1, label: 'Poor', color: '#ef4444' },
  { value: 2, label: 'Fair', color: '#f97316' },
  { value: 3, label: 'Good', color: '#eab308' },
  { value: 4, label: 'Very Good', color: '#84cc16' },
  { value: 5, label: 'Excellent', color: '#22c55e' },
] as const;

// Commission Rates
export const COMMISSION_RATE = 0.15; // 15%
export const PAYMENT_PROCESSING_FEE = 0.029; // 2.9%

// Partner Program
export const PARTNER_COMMISSION_RATE = 0.05; // 5% (sub-split of platform's 15%)
export const PARTNER_COMMISSION_WINDOW_DAYS = 90;
export const PARTNER_CODE_PREFIX = 'EW';

export const PARTNER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  REMOVED: 'removed',
} as const;

export const REFERRAL_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  FRAUD: 'fraud',
} as const;

export const COMMISSION_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  CANCELLED: 'cancelled',
} as const;

// Job Posting Constants
export const JOB_STATUS = {
  OPEN: 'open',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;

export const JOB_EXPIRY_HOURS = 72; // Jobs expire after 3 days if not accepted
export const MAX_JOB_ATTACHMENTS = 5; // Maximum number of photos per job
export const MAX_JOB_TITLE_LENGTH = 200;
export const MAX_JOB_DESCRIPTION_LENGTH = 2000;

export const JOB_BUDGET_TYPES = {
  FIXED: 'fixed',
  RANGE: 'range',
} as const;

export const JOB_DURATION_OPTIONS = [
  { value: 1, label: '1 hour' },
  { value: 2, label: '2 hours' },
  { value: 3, label: '3 hours' },
  { value: 4, label: '4 hours' },
  { value: 6, label: '6 hours' },
  { value: 8, label: '8 hours (Full day)' },
  { value: 12, label: '12 hours' },
  { value: 24, label: '24 hours' },
] as const;

// Search Sort Options
export const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price', label: 'Price: Low to High' },
  { value: 'distance', label: 'Distance' },
  { value: 'reviews', label: 'Most Reviews' },
] as const;

// Price Ranges
export const PRICE_RANGES = [
  { min: 0, max: 25, label: '₦0 - ₦25' },
  { min: 25, max: 50, label: '₦25 - ₦50' },
  { min: 50, max: 100, label: '₦50 - ₦100' },
  { min: 100, max: 200, label: '₦100 - ₦200' },
  { min: 200, max: 500, label: '₦200+' },
] as const;

// Service Durations
export const SERVICE_DURATIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours (Full day)' },
] as const;

// Experience Levels
export const EXPERIENCE_LEVELS = [
  { value: 0, label: 'Beginner (0-1 year)' },
  { value: 1, label: 'Intermediate (1-3 years)' },
  { value: 3, label: 'Experienced (3-5 years)' },
  { value: 5, label: 'Expert (5+ years)' },
] as const;

// ID Types for Verification
export const ID_TYPES = [
  { value: 'national_id', label: 'National ID' },
  { value: 'voter_card', label: 'Voter Card' },
  { value: 'international_passport', label: 'International Passport' },
  { value: 'drivers_license', label: "Driver's License" },
] as const;

// Payment Methods
export const PAYMENT_METHODS = [
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'paystack', label: 'Paystack' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
] as const;

// Days of the Week
export const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
] as const;

// Error Messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, and number',
  PASSWORDS_DONT_MATCH: "Passwords don't match",
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_TOO_LARGE: 'File size too large',
  NETWORK_ERROR: 'Network error. Please try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  USER_NOT_FOUND: 'User not found',
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_SUSPENDED: 'Your account has been suspended',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  WORKER_NOT_AVAILABLE: 'Worker is not available for this time slot',
  BOOKING_NOT_FOUND: 'Booking not found',
  PAYMENT_FAILED: 'Payment failed. Please try again.',
  INSUFFICIENT_FUNDS: 'Insufficient funds',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  ACCOUNT_CREATED: 'Account created successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  PROFILE_UPDATED: 'Profile updated successfully',
  BOOKING_CREATED: 'Booking created successfully',
  BOOKING_UPDATED: 'Booking updated successfully',
  BOOKING_CANCELLED: 'Booking cancelled successfully',
  PAYMENT_SUCCESS: 'Payment successful',
  REVIEW_SUBMITTED: 'Review submitted successfully',
  VERIFICATION_SUBMITTED: 'Verification documents submitted successfully',
  PASSWORD_RESET_SENT: 'Password reset link sent to your email',
  PASSWORD_RESET_SUCCESS: 'Password reset successful',
  EMAIL_VERIFIED: 'Email verified successfully',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  THEME: 'theme',
  LANGUAGE: 'language',
  SEARCH_FILTERS: 'search_filters',
  BOOKING_DRAFT: 'booking_draft',
} as const;

// Query Keys for React Query
export const QUERY_KEYS = {
  USER: 'user',
  WORKERS: 'workers',
  BOOKINGS: 'bookings',
  JOBS: 'jobs',
  CATEGORIES: 'categories',
  SERVICES: 'services',
  REVIEWS: 'reviews',
  NOTIFICATIONS: 'notifications',
  PAYMENTS: 'payments',
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_NOTIFICATIONS: true,
  ENABLE_DARK_MODE: true,
  ENABLE_MULTI_LANGUAGE: false,
  ENABLE_LIVE_CHAT: false,
  ENABLE_VIDEO_CALLS: false,
  ENABLE_GEOLOCATION: true,
  ENABLE_PUSH_NOTIFICATIONS: true,
} as const;

// Regex Patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  POSTAL_CODE: /^[0-9]{5}(-[0-9]{4})?$/,
  TIME: /^([01]\d|2[0-3]):([0-5]\d)$/,
  HEX_COLOR: /^#[0-9A-F]{6}$/i,
} as const; 