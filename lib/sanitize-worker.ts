/**
 * Whitelist of fields safe for public display.
 * Sensitive fields (email, phone, address, idNumber, idType, idDocument,
 * selfieWithId, additionalDocuments, verificationDocuments, verificationStatus,
 * rejectionReason, submittedAt, firstName, lastName, postalCode, $permissions,
 * $databaseId, $collectionId, $sequence) are intentionally excluded.
 */
const PUBLIC_WORKER_FIELDS = [
  '$id',
  '$createdAt',
  'name',
  'displayName',
  'profileImage',
  'bio',
  'categories',
  'skills',
  'city',
  'state',
  'country',
  'hourlyRate',
  'minimumHours',
  'currency',
  'ratingAverage',
  'totalReviews',
  'completedJobs',
  'responseTimeMinutes',
  'rehireRatePercent',
  'isActive',
  'isVerified',
  'idVerified',
  'backgroundCheckVerified',
  'experienceYears',
  'experienceDescription',
  'maxRadiusKm',
  'lauguages',
  'languages',
  'acceptsLastMinute',
  'acceptsWeekends',
  'workingHoursStart',
  'workingHoursEnd',
  'workingDays',
  'timezone',
  'userId',
] as const;

export interface PublicWorkerProfile {
  $id: string;
  $createdAt: string;
  name?: string;
  displayName?: string;
  profileImage?: string | null;
  bio?: string;
  categories: string[];
  skills?: string[];
  city?: string | null;
  state?: string | null;
  country?: string | null;
  hourlyRate: number;
  minimumHours?: number;
  currency?: string;
  ratingAverage?: number;
  totalReviews?: number;
  completedJobs?: number;
  responseTimeMinutes?: number;
  rehireRatePercent?: number;
  isActive: boolean;
  isVerified: boolean;
  idVerified?: boolean;
  backgroundCheckVerified?: boolean;
  experienceYears?: number;
  experienceDescription?: string;
  maxRadiusKm?: number;
  lauguages?: string[] | null;
  languages?: string[] | null;
  acceptsLastMinute?: boolean;
  acceptsWeekends?: boolean;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: string[];
  timezone?: string;
  userId: string | null;
}

export function toPublicWorkerProfile(doc: Record<string, unknown>): PublicWorkerProfile {
  const safe: Record<string, unknown> = {};
  for (const key of PUBLIC_WORKER_FIELDS) {
    if (key in doc) safe[key] = doc[key];
  }
  return safe as PublicWorkerProfile;
}

export function sanitizeWorkerList(docs: Record<string, unknown>[]): PublicWorkerProfile[] {
  return docs.map(toPublicWorkerProfile);
}
