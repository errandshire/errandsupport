import { z } from 'zod';

// Authentication Schemas
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
  role: z.enum(['client', 'worker']),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Profile Schemas
export const clientProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export const workerProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  bio: z.string().min(50, 'Bio must be at least 50 characters').max(1000, 'Bio must be less than 1000 characters'),
  skills: z.array(z.string()).min(1, 'Please select at least one skill'),
  experience: z.number().min(0, 'Experience cannot be negative').max(50, 'Experience cannot be more than 50 years'),
  hourlyRate: z.number().min(5, 'Hourly rate must be at least ₦5').max(5000, 'Hourly rate cannot exceed ₦5000'),
  categories: z.array(z.string()).min(1, 'Please select at least one category'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  state: z.string().min(2, 'State must be at least 2 characters'),
  postalCode: z.string().min(5, 'Postal code must be at least 5 characters'),
  country: z.string().min(2, 'Country must be at least 2 characters'),
  serviceRadius: z.number().min(1, 'Service radius must be at least 1 km').max(100, 'Service radius cannot exceed 100 km'),
});

// Onboarding-specific schemas (simpler validation for step-by-step flow)
export const onboardingWorkerProfileSchema = z.object({
  bio: z.string().min(50, 'Bio must be at least 50 characters').max(1000, 'Bio must be less than 1000 characters'),
  experience: z.number().min(0, 'Experience cannot be negative').max(50, 'Experience cannot be more than 50 years'),
  hourlyRate: z.number().min(5, 'Hourly rate must be at least ₦5').max(5000, 'Hourly rate cannot exceed ₦5000'),
  serviceRadius: z.number().min(1, 'Service radius must be at least 1 km').max(100, 'Service radius cannot exceed 100 km'),
});

// Verification Schema
export const verificationSchema = z.object({
  idType: z.enum(['drivers_license', 'passport', 'national_id', 'state_id']),
  idNumber: z.string().min(5, 'ID number must be at least 5 characters'),
  documents: z.array(z.any()).min(1, 'Please upload at least one document'),
});

// Onboarding verification schema (simpler for step-by-step flow)
export const onboardingVerificationSchema = z.object({
  idType: z.enum(['drivers_license', 'passport', 'national_id', 'state_id']).optional(),
  idNumber: z.string().min(5, 'ID number must be at least 5 characters').optional(),
});

// Booking Schemas
export const bookingSchema = z.object({
  workerId: z.string().min(1, 'Worker is required'),
  serviceId: z.string().min(1, 'Service is required'),
  scheduledDate: z.string().min(1, 'Date is required'),
  scheduledTime: z.string().min(1, 'Time is required'),
  duration: z.number().min(30, 'Duration must be at least 30 minutes'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(5, 'Postal code is required'),
  notes: z.string().optional(),
});

export const bookingUpdateSchema = z.object({
  status: z.enum(['confirmed', 'in_progress', 'completed', 'cancelled']),
  notes: z.string().optional(),
  cancellationReason: z.string().optional(),
});

// Review Schema
export const reviewSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().min(10, 'Comment must be at least 10 characters').max(500, 'Comment cannot exceed 500 characters').optional(),
  isPublic: z.boolean().default(true),
});

// Service Schema
export const serviceSchema = z.object({
  name: z.string().min(2, 'Service name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  basePrice: z.number().min(5, 'Base price must be at least $5'),
  duration: z.number().min(15, 'Duration must be at least 15 minutes'),
  requirements: z.array(z.string()).optional(),
});

// Category Schema
export const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  icon: z.string().min(1, 'Icon is required'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color'),
  parentId: z.string().optional(),
});

// Search Schema
export const searchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  priceRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
  }).optional(),
  rating: z.number().min(1).max(5).optional(),
  availability: z.string().optional(),
  sortBy: z.enum(['price', 'rating', 'distance', 'reviews']).default('rating'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
});

// Availability Schema
export const availabilitySchema = z.object({
  monday: z.array(z.object({
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  })),
  tuesday: z.array(z.object({
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  })),
  wednesday: z.array(z.object({
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  })),
  thursday: z.array(z.object({
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  })),
  friday: z.array(z.object({
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  })),
  saturday: z.array(z.object({
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  })),
  sunday: z.array(z.object({
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  })),
});

// Payment Schema
export const paymentSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  paymentMethod: z.enum(['card', 'paystack', 'bank_transfer']),
  amount: z.number().min(5, 'Amount must be at least $5'),
});

// Export type inference helpers
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ClientProfileFormData = z.infer<typeof clientProfileSchema>;
export type WorkerProfileFormData = z.infer<typeof workerProfileSchema>;
export type OnboardingWorkerProfileFormData = z.infer<typeof onboardingWorkerProfileSchema>;
export type VerificationFormData = z.infer<typeof verificationSchema>;
export type OnboardingVerificationFormData = z.infer<typeof onboardingVerificationSchema>;
export type BookingFormData = z.infer<typeof bookingSchema>;
export type BookingUpdateFormData = z.infer<typeof bookingUpdateSchema>;
export type ReviewFormData = z.infer<typeof reviewSchema>;
export type ServiceFormData = z.infer<typeof serviceSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type SearchFormData = z.infer<typeof searchSchema>;
export type AvailabilityFormData = z.infer<typeof availabilitySchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>; 