// Core marketplace types for Phase 3

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  parentId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  profileImage?: string;
  coverImage?: string;
  
  // Flattened location
  address: string;
  city: string;
  state: string;
  locationLat?: number;
  locationLng?: number;
  
  // Arrays (supported by Appwrite)
  categories: string[]; // Category IDs
  skills: string[];
  languages: string[];
  workingDays: string[]; // ['monday', 'tuesday', etc.]
  
  // Flattened experience
  experienceYears: number;
  experienceDescription: string;
  
  // Flattened pricing
  hourlyRate: number;
  minimumHours: number;
  currency: string;
  
  // Flattened availability
  workingHoursStart: string; // '09:00'
  workingHoursEnd: string; // '17:00'
  timezone: string;
  
  // Flattened verification
  isVerified: boolean;
  idVerified: boolean;
  backgroundCheckVerified: boolean;
  verifiedAt?: string;
  
  // Flattened rating
  ratingAverage: number;
  totalReviews: number;
  
  // Flattened stats
  completedJobs: number;
  responseTimeMinutes: number;
  rehireRatePercent: number;
  
  // Flattened preferences
  maxRadiusKm: number;
  acceptsLastMinute: boolean;
  acceptsWeekends: boolean;
  
  // Status
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BookingRequest {
  id: string;
  clientId: string;
  workerId: string;
  categoryId: string;
  title: string;
  description: string;
  location: {
    address: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  scheduledDate: string;
  estimatedDuration: number; // in hours
  budget: {
    amount: number;
    currency: string;
    isHourly: boolean;
  };
  urgency: 'low' | 'medium' | 'high';
  status: 'pending' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  requirements?: string[];
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  requestId: string;
  clientId: string;
  workerId: string;
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  payment: {
    amount: number;
    currency: string;
    escrowId?: string;
    paystackReference?: string;
    commissionRate: number;
    status: 'pending' | 'escrowed' | 'released' | 'refunded';
  };
  timeline: {
    confirmedAt?: string;
    startedAt?: string;
    completedAt?: string;
    cancelledAt?: string;
  };
  rating?: {
    clientRating: number;
    workerRating: number;
    clientReview?: string;
    workerReview?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  reviewerType: 'client' | 'worker';
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
  isPublic: boolean;
  isVerified: boolean;
  response?: {
    comment: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  bookingId: string;
  senderId: string;
  recipientId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  attachments?: {
    url: string;
    name: string;
    type: string;
    size: number;
  }[];
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchFilters {
  category?: string;
  location?: {
    city?: string;
    radius?: number; // in kilometers
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: {
    min: number;
  };
  availability?: {
    date?: string;
    time?: string;
  };
  verified?: boolean;
  sortBy?: 'rating' | 'price' | 'distance' | 'reviews' | 'response_time';
  sortOrder?: 'asc' | 'desc';
}

export interface WorkerListResponse {
  workers: WorkerProfile[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  filters: SearchFilters;
}

// UI State Types
export interface BookingModalState {
  isOpen: boolean;
  step: 'details' | 'scheduling' | 'payment' | 'confirmation';
  worker?: WorkerProfile;
  formData?: Partial<BookingRequest>;
}

export interface FilterState {
  isOpen: boolean;
  activeFilters: SearchFilters;
  tempFilters: SearchFilters;
} 