/**
 * Add Slug Attribute to Jobs Collection
 *
 * This script:
 * 1. Adds a "slug" string attribute to the JOBS collection (if not exists)
 * 2. Generates slugs for all existing jobs that don't have one
 *
 * Run with: node scripts/add-slug-to-jobs.js
 */

require('dotenv').config();
const { Client, Databases, Query } = require('node-appwrite');

// Configuration
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const JOBS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_JOBS_COLLECTION_ID;

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

/**
 * Generate a URL-safe slug from a string
 */
function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60)
    .replace(/-+$/, '');
}

/**
 * Generate a unique slug by appending job ID
 */
function generateUniqueSlug(title, jobId) {
  const baseSlug = generateSlug(title);
  const shortId = jobId.slice(-8);
  return `${baseSlug}-${shortId}`;
}

/**
 * Step 1: Add slug attribute to JOBS collection
 */
async function addSlugAttribute() {
  try {
    console.log('📝 Adding slug attribute to JOBS collection...');

    await databases.createStringAttribute(
      DATABASE_ID,
      JOBS_COLLECTION_ID,
      'slug',
      200, // Max length
      false, // Not required (for backwards compatibility)
      null, // No default
      false // Not array
    );

    console.log('✅ Slug attribute added successfully!');
    console.log('⏳ Waiting 5 seconds for attribute to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  } catch (error) {
    if (error.code === 409) {
      console.log('✅ Slug attribute already exists, skipping creation');
    } else {
      console.error('❌ Error adding slug attribute:', error.message);
      throw error;
    }
  }
}

/**
 * Step 2: Generate slugs for existing jobs
 */
async function generateSlugsForExistingJobs() {
  try {
    console.log('\n📋 Fetching all jobs...');

    const jobs = await databases.listDocuments(
      DATABASE_ID,
      JOBS_COLLECTION_ID,
      [Query.limit(500)] // Adjust if you have more than 500 jobs
    );

    console.log(`Found ${jobs.documents.length} jobs`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const job of jobs.documents) {
      // Skip if job already has a slug
      if (job.slug) {
        skipped++;
        continue;
      }

      try {
        const slug = generateUniqueSlug(job.title, job.$id);

        console.log(`Updating job "${job.title}" (${job.$id})`);
        console.log(`  → Slug: ${slug}`);

        await databases.updateDocument(
          DATABASE_ID,
          JOBS_COLLECTION_ID,
          job.$id,
          { slug }
        );

        updated++;
      } catch (updateError) {
        console.error(`❌ Failed to update job ${job.$id}:`, updateError.message);
        failed++;
      }
    }

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║             SUMMARY                    ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`✅ Updated: ${updated} jobs`);
    console.log(`⏭️  Skipped: ${skipped} jobs (already have slug)`);
    console.log(`❌ Failed: ${failed} jobs`);
    console.log(`📊 Total: ${jobs.documents.length} jobs`);

  } catch (error) {
    console.error('❌ Error generating slugs:', error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║    ADD SLUG TO JOBS COLLECTION         ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`Endpoint: ${APPWRITE_ENDPOINT}`);
  console.log(`Project: ${APPWRITE_PROJECT_ID}`);
  console.log(`Database: ${DATABASE_ID}`);
  console.log(`Collection: ${JOBS_COLLECTION_ID}\n`);

  // Validate configuration
  if (!APPWRITE_API_KEY) {
    console.error('❌ FATAL ERROR: APPWRITE_API_KEY not found in environment');
    process.exit(1);
  }

  try {
    // Step 1: Add slug attribute
    await addSlugAttribute();

    // Step 2: Generate slugs for existing jobs
    await generateSlugsForExistingJobs();

    console.log('\n✨ All done! Jobs now have SEO-friendly slugs.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error);
    process.exit(1);
  }
}

// Run the script
main();
