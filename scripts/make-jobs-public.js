/**
 * Make All Jobs Publicly Readable
 *
 * This script updates permissions on all jobs to allow public read access
 * This enables:
 * - SEO crawling by search engines
 * - Social media preview generation
 * - Sharing links with non-registered users
 * - Public job browsing without login
 *
 * Run with: node scripts/make-jobs-public.js
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
 * Update a single job to have public read permissions
 */
async function makeJobPublic(job) {
  try {
    const { Permission, Role } = require('node-appwrite');

    // Get current permissions
    const currentPermissions = job.$permissions || [];

    // Check if already has public read
    const hasPublicRead = currentPermissions.some(p =>
      p === 'read("any")' || p.includes('read("any")')
    );

    if (hasPublicRead) {
      console.log(`  ⏭️  Already public: "${job.title}"`);
      return { skipped: true };
    }

    // Build new permissions array
    const newPermissions = [
      // Keep owner permissions
      Permission.read(Role.user(job.clientId)),
      Permission.update(Role.user(job.clientId)),
      Permission.delete(Role.user(job.clientId)),
      // Add public read
      Permission.read(Role.any()),
      // Keep authenticated users update (for applicant count)
      Permission.update(Role.users()),
    ];

    console.log(`  📝 Updating: "${job.title}" (${job.$id})`);

    // Update the job document with new permissions
    await databases.updateDocument(
      DATABASE_ID,
      JOBS_COLLECTION_ID,
      job.$id,
      {}, // No data changes, just permissions
      newPermissions
    );

    console.log(`  ✅ Now public!`);
    return { updated: true };

  } catch (error) {
    console.error(`  ❌ Failed: ${error.message}`);
    return { failed: true, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║    MAKE ALL JOBS PUBLICLY READABLE         ║');
  console.log('╚════════════════════════════════════════════╝\n');

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
    console.log('📋 Fetching all jobs...\n');

    const jobs = await databases.listDocuments(
      DATABASE_ID,
      JOBS_COLLECTION_ID,
      [Query.limit(500)] // Adjust if you have more than 500 jobs
    );

    console.log(`Found ${jobs.documents.length} jobs\n`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const job of jobs.documents) {
      const result = await makeJobPublic(job);

      if (result.updated) updated++;
      if (result.skipped) skipped++;
      if (result.failed) failed++;

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║                 SUMMARY                    ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`✅ Updated: ${updated} jobs`);
    console.log(`⏭️  Skipped: ${skipped} jobs (already public)`);
    console.log(`❌ Failed: ${failed} jobs`);
    console.log(`📊 Total: ${jobs.documents.length} jobs`);

    console.log('\n✨ Jobs are now publicly accessible!\n');
    console.log('Benefits:');
    console.log('  ✅ Search engines can crawl jobs (SEO)');
    console.log('  ✅ Social media previews work');
    console.log('  ✅ Share links work without login');
    console.log('  ✅ Public job browsing enabled\n');

    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error);
    process.exit(1);
  }
}

// Run the script
main();
