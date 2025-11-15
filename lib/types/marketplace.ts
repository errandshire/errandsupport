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
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  role: 'worker';
  profileImage: string | null;
  isVerified: boolean;
  isActive: boolean;
  address: string;
  city: string;
  state: string;
  longitude: number | null;
  latitude: number | null;
  name: string;
  userId: string | null;
  postalCode: string;
  country: string;
  bio: string;
  categories: string[];
  experience: number;
  hourlyRate: number;
  serviceRadius: number;
  idType: string | null;
  verificationDocuments: string[];
  verificationStatus: string | null;
  submittedAt: string | null;
  idNumber: string | null;
  isOnboarded: boolean;
  documentId: string | null;
  lauguages: string[];
  skills?: string[]; // Optional since it's not in your data
  displayName?: string; // Optional computed field
  completedJobs?: number; // Optional since it's not in your data
  responseTimeMinutes?: number; // Optional since it's not in your data
  ratingAverage?: number; // Optional since it's not in your data
  totalReviews?: number; // Optional since it's not in your data
  workingHoursStart?: string; // Optional availability field
  workingHoursEnd?: string; // Optional availability field
  acceptsLastMinute?: boolean; // Optional availability field
  acceptsWeekends?: boolean; // Optional availability field
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
  conversationId: string; // For grouping messages between two users
  senderId: string;
  recipientId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  // Flat structure for attachments (Appwrite requirement)
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number;
  thumbnailUrl?: string;
  // Message status and delivery
  isRead: boolean;
  isDelivered: boolean;
  deliveredAt?: string;
  readAt?: string;
  // Typing and real-time features
  isTyping?: boolean;
  lastTypingAt?: string;
  // Conversation management
  isConversationMuted?: boolean;
  mutedBy?: string;
  mutedAt?: string;
  // Optional booking reference
  relatedBookingId?: string;
  // Metadata
  replyToMessageId?: string;
  editedAt?: string;
  deletedAt?: string;
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