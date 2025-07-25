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
  commission: number;
  workerEarnings: number;
  paymentStatus: PaymentStatus;
  paymentIntentId?: string;
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

export type PaymentStatus = 
  | 'pending'
  | 'paid'
  | 'refunded'
  | 'failed'
  | 'cancelled';

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

// Payment Types
export interface Payment extends Models.Document {
  bookingId: string;
  clientId: string;
  workerId: string;
  amount: number;
  commission: number;
  workerEarnings: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  paymentIntentId: string;
  transactionId?: string;
  refundId?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
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

// Phase 1: Escrow System Types
export interface EscrowTransaction extends Models.Document {
  bookingId: string;
  clientId: string;
  workerId: string;
  amount: number;
  platformFee: number;
  workerAmount: number; // amount - platformFee
  status: 'pending' | 'held' | 'released' | 'refunded';
  paystackReference: string;
  createdAt: string;
  releasedAt?: string;
  metadata: {
    serviceName?: string;
    workerName?: string;
    clientName?: string;
    paymentMethod?: string;
    [key: string]: any;
  };
}

export interface UserBalance extends Models.Document {
  userId: string;
  availableBalance: number;
  pendingBalance: number; // money in escrow
  totalEarnings: number;
  totalWithdrawn: number;
  currency: 'NGN';
  updatedAt: string;
}

export interface Transaction extends Models.Document {
  userId: string;
  type: 'escrow_hold' | 'escrow_release' | 'withdrawal' | 'refund';
  amount: number;
  description: string;
  reference: string;
  bookingId?: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
} 