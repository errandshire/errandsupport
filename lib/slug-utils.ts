/**
 * Slug Utilities
 *
 * Generate SEO-friendly URL slugs from job titles
 */

/**
 * Generate a URL-safe slug from a string
 *
 * Examples:
 * "House Cleaning in Lagos" -> "house-cleaning-in-lagos"
 * "Need a Plumber ASAP!" -> "need-a-plumber-asap"
 * "Car Wash & Detailing Service" -> "car-wash-and-detailing-service"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace special characters with spaces
    .replace(/[^\w\s-]/g, ' ')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Replace spaces with hyphens
    .replace(/\s/g, '-')
    // Remove multiple consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit to 60 characters for SEO best practices
    .substring(0, 60)
    // Remove trailing hyphen if substring cut mid-word
    .replace(/-+$/, '');
}

/**
 * Generate a unique slug by appending job ID
 * Format: {title-slug}-{jobId}
 *
 * Example:
 * "House Cleaning" + "abc123" -> "house-cleaning-abc123"
 *
 * This ensures uniqueness even if multiple jobs have the same title
 */
export function generateUniqueSlug(title: string, jobId: string): string {
  const baseSlug = generateSlug(title);

  // Take last 8 characters of job ID for brevity
  const shortId = jobId.slice(-8);

  return `${baseSlug}-${shortId}`;
}

/**
 * Extract job ID from a slug
 *
 * Example:
 * "house-cleaning-abc123" -> "abc123"
 * "house-cleaning-in-lagos-6954fd94" -> "6954fd94"
 */
export function extractJobIdFromSlug(slug: string): string | null {
  // Job IDs are the last segment after the final hyphen
  const parts = slug.split('-');
  if (parts.length < 2) return null;

  // The last part should be the job ID (8 characters from original ID)
  const possibleId = parts[parts.length - 1];

  // Validate it looks like an Appwrite ID (alphanumeric, typically 20 chars but we use last 8)
  if (possibleId && /^[a-z0-9]{8,20}$/i.test(possibleId)) {
    return possibleId;
  }

  return null;
}

/**
 * Find job by slug
 *
 * This queries the database for a job with the matching slug field
 */
export async function findJobBySlug(slug: string, databases: any, databaseId: string, jobsCollectionId: string) {
  // Search for jobs with this exact slug
  const { Query } = await import('appwrite');

  const jobs = await databases.listDocuments(
    databaseId,
    jobsCollectionId,
    [
      Query.equal('slug', slug),
      Query.limit(1)
    ]
  );

  if (jobs.documents.length === 0) {
    // Fallback: Try to extract ID from slug and find by ID ending
    const shortId = extractJobIdFromSlug(slug);

    if (!shortId) {
      throw new Error('Invalid job slug format');
    }

    // Query more jobs and search for matching ID
    const allJobs = await databases.listDocuments(
      databaseId,
      jobsCollectionId,
      [Query.limit(100)]
    );

    const job = allJobs.documents.find((j: any) => j.$id.endsWith(shortId));

    if (!job) {
      throw new Error('Job not found');
    }

    return job;
  }

  return jobs.documents[0];
}

/**
 * Validate if a slug matches a job ID
 * Used to check if the slug in the URL matches the actual job
 */
export function validateSlug(slug: string, actualJobId: string, actualTitle: string): boolean {
  const expectedSlug = generateUniqueSlug(actualTitle, actualJobId);
  return slug === expectedSlug;
}
