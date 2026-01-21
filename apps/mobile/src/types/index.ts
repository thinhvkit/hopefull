// User types
export interface User {
  id: string;
  email: string;
  phone?: string;
  role: 'USER' | 'THERAPIST' | 'ADMIN';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  timezone?: string;
  preferredLanguage?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

// Therapist types
export interface Therapist {
  id: string;
  userId: string;
  professionalTitle: string;
  yearsOfExperience: number;
  bio?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  isOnline: boolean;
  hourlyRate: number;
  perMinuteRate: number;
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl'>;
  languages: TherapistLanguage[];
  specializations: TherapistSpecialization[];
}

export interface TherapistLanguage {
  id: string;
  language: string;
  proficiency: 'NATIVE' | 'FLUENT' | 'CONVERSATIONAL';
}

export interface TherapistSpecialization {
  specialization: {
    id: string;
    name: string;
    icon?: string;
  };
}

export interface TherapistAvailability {
  date: string;
  slots: TimeSlot[];
  bookedSlots: TimeSlot[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

// Appointment types
export interface Appointment {
  id: string;
  userId: string;
  therapistId: string;
  scheduledAt: string;
  duration: number;
  timezone: string;
  type: 'SCHEDULED' | 'INSTANT';
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  amount: number;
  bookingNotes?: string;
  sessionNotes?: string;
  cancellationReason?: string;
  sessionRoomId?: string;
  sessionStartedAt?: string;
  sessionEndedAt?: string;
  createdAt: string;
  therapist?: Therapist;
  user?: User;
  review?: Review;
  payment?: Payment;
}

// Review types
export interface Review {
  id: string;
  userId: string;
  therapistId: string;
  appointmentId: string;
  rating: number;
  feedback?: string;
  tags?: string[];
  isAnonymous: boolean;
  createdAt: string;
  user?: Pick<User, 'firstName' | 'lastName' | 'avatarUrl'>;
}

// Payment types
export interface PaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  type: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  appointmentId: string;
  amount: number;
  platformFee: number;
  therapistAmount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  paidAt?: string;
  createdAt: string;
  appointment?: Appointment;
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// Filter types
export interface TherapistFilters {
  page?: number;
  limit?: number;
  search?: string;
  specialization?: string;
  language?: string;
  minRating?: number;
  maxPrice?: number;
  isOnline?: boolean;
}

export interface AppointmentFilters {
  status?: 'upcoming' | 'past';
}

// Specialization categories
export const SPECIALIZATIONS = [
  'Anxiety',
  'Depression',
  'Relationship',
  'PTSD',
  'Addiction',
  'Family',
  'Career',
  'Grief',
  'Stress',
  'Self-esteem',
] as const;

export type Specialization = typeof SPECIALIZATIONS[number];

// Review tags
export const REVIEW_TAGS = [
  'Professional',
  'Helpful',
  'Good listener',
  'Patient',
  'Insightful',
] as const;

export type ReviewTag = typeof REVIEW_TAGS[number];

// Therapist Dashboard types
export interface TherapistStats {
  todayAppointments: number;
  weekEarnings: number;
  pendingRequests: number;
  averageRating: number;
  totalSessions: number;
  totalEarnings: number;
}

export interface TherapistSchedule {
  id: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string;
  isActive: boolean;
}

export interface TherapistAutoOffline {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string;
}

export interface TherapistAppointmentFilters {
  status?: 'upcoming' | 'past' | 'cancelled';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
