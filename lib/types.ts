import { Models } from 'appwrite';

// User Types
export interface User extends Models.Document {
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'client' | 'worker' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  profile?: ClientProfile | WorkerProfile;
}

export interface ClientProfile {
  userId: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  preferences?: Record<string, any>;
  completedBookings: number;
  totalSpent: number;
  rating: number;
  reviewCount: number;
}

export interface WorkerProfile {
  userId: string;
  bio?: string;
  skills: string[];
  experience: number;
  hourlyRate: number;
  availability: WorkerAvailability;
  location: WorkerLocation;
  verification: WorkerVerification;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  totalEarned: number;
  responseTime: number; // in minutes
  acceptanceRate: number; // percentage
  isAvailable: boolean;
  categories: string[];
}

export interface WorkerAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface WorkerLocation {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  serviceRadius: number; // in kilometers
}

export interface WorkerVerification {
  status: 'pending' | 'verified' | 'rejected';
  documentsUploaded: boolean;
  documentIds?: string[];
  verifiedAt?: string;
  rejectionReason?: string;
}

// Service Types
export interface Service extends Models.Document {
  name: string;
  description: string;
  categoryId: string;
  basePrice: number;
  duration: number; // in minutes
  requirements?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category extends Models.Document {
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

// Booking Types
export interface Booking extends Models.Document {
  clientId: string;
  workerId: string;
  serviceId: string;
  categoryId: string;
  status: BookingStatus;
  scheduledDate: string;
  scheduledTime: string;
  duration: number; // in minutes
  location: BookingLocation;
  notes?: string;
  totalAmount: number;
  paymentStatus: 'unpaid' | 'held' | 'released' | 'refunded'; // Simple payment states
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  cancellationFee?: number;
  clientConfirmed?: boolean;
  workerConfirmed?: boolean;
  completionNote?: string;
  clientRating?: number;
  clientReview?: string;
  workerRating?: number;
  workerReview?: string;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface BookingLocation {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  instructions?: string;
}

// Job Posting Types
export interface Job extends Models.Document {
  clientId: string;
  title: string;
  description: string;
  categoryId: string;
  budgetType: 'fixed' | 'range';
  budgetMin: number;
  budgetMax: number;
  locationAddress: string;
  locationLat?: number;
  locationLng?: number;
  scheduledDate: string;
  scheduledTime: string;
  duration: number; // in hours
  skillsRequired?: string[];
  attachments?: string[]; // URLs to photos in Appwrite Storage
  status: JobStatus;
  assignedWorkerId?: string;
  assignedAt?: string;
  bookingId?: string; // Links to created booking after acceptance
  expiresAt: string;
  viewCount: number;
  requiresFunding?: boolean; // Whether client needs to fund wallet to view applicants
  applicantCount?: number; // Cached count of interested workers
  createdAt: string;
  updatedAt: string;
}

export type JobStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';

export interface JobFormData {
  title: string;
  description: string;
  categoryId: string;
  budgetType: 'fixed' | 'range';
  budgetMin: number;
  budgetMax: number;
  locationAddress: string;
  locationLat?: number;
  locationLng?: number;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  skillsRequired?: string[];
  attachments?: File[]; // Files to upload
}

export interface JobWithDetails extends Job {
  clientName: string;
  clientEmail: string;
  clientRating: number;
  categoryName: string;
  distanceFromWorker?: number; // in kilometers
}

// Job Application Types
export interface JobApplication extends Models.Document {
  jobId: string;
  workerId: string;
  clientId: string;
  status: JobApplicationStatus;
  message?: string; // Worker's pitch/message to client
  appliedAt: string;
  selectedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type JobApplicationStatus =
  | 'pending'    // Waiting for client to review
  | 'selected'   // Client chose this worker
  | 'rejected'   // Client chose another worker
  | 'withdrawn'; // Worker withdrew application

export interface JobApplicationWithDetails extends JobApplication {
  workerName: string;
  workerEmail: string;
  workerRating: number;
  workerProfileImage?: string;
  workerBio?: string;
  workerExperienceYears?: number;
  workerCategories?: string[];
}

// Review Types
export interface Review extends Models.Document {
  bookingId: string;
  clientId: string;
  workerId: string;
  rating: number; // 1-5
  comment?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'client' | 'worker';
  phone?: string;
}

export interface OnboardingFormData {
  step: number;
  personalInfo?: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
  };
  workerInfo?: {
    bio: string;
    skills: string[];
    experience: number;
    hourlyRate: number;
    categories: string[];
  };
  verification?: {
    idType: string;
    idNumber: string;
    documents: File[];
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Search & Filter Types
export interface WorkerSearchFilters {
  category?: string;
  location?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: number;
  availability?: string;
  sortBy?: 'price' | 'rating' | 'distance' | 'reviews';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResults {
  workers: WorkerProfile[];
  total: number;
  filters: WorkerSearchFilters;
}

// Notification Types
export interface Notification extends Models.Document {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'payment_received'
  | 'review_received'
  | 'verification_approved'
  | 'verification_rejected'
  | 'system_announcement'
  | 'new_message'
  | 'file_shared';

// State Management Types
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionToken: string | null;
}

export interface BookingState {
  bookings: Booking[];
  currentBooking: Booking | null;
  isLoading: boolean;
  filters: WorkerSearchFilters;
}

export interface WorkerState {
  workers: WorkerProfile[];
  currentWorker: WorkerProfile | null;
  isLoading: boolean;
  searchResults: SearchResults | null;
}

// SIMPLE WALLET SYSTEM
export interface Wallet extends Models.Document {
  userId: string;
  balance: number;        // Available to spend or withdraw (in Naira)
  escrow: number;         // Money held for active bookings (in Naira)
  totalEarned: number;    // Lifetime earnings (for workers)
  totalSpend: number;     // Lifetime spending (for clients) - matches DB field name
  updatedAt: string;
}

export interface WalletTransaction extends Models.Document {
  userId: string;
  type: 'topup' | 'booking_hold' | 'booking_release' | 'booking_refund' | 'withdraw' | 'rollback' | 'rollback_hold';
  amount: number;         // Always in Naira (negative for rollbacks)
  bookingId?: string;     // If related to a booking
  reference: string;      // Paystack reference or unique ID
  status: 'completed' | 'pending' | 'failed';
  description: string;
  createdAt: string;
}

export interface BankAccount extends Models.Document {
  userId: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  paystackRecipientCode?: string; // For withdrawals
  isDefault: boolean;
  createdAt: string;
}

export interface Withdrawal extends Models.Document {
  userId: string;
  amount: number;         // In Naira
  bankAccountId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reference: string;      // Paystack transfer reference
  paystackTransferCode?: string;
  failureReason?: string;
  createdAt: string;
  completedAt?: string;
} 