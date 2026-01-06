require('dotenv').config({ path: '.env' });
const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const COLLECTIONS = {
  USERS: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
  WORKERS: process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID
};

/**
 * Migrate additional fields from USERS to WORKERS
 * Fields to migrate:
 * - country (location data)
 * - postalCode (location data)
 * - Any other fields identified as worker-specific
 */
async function migrateAdditionalFields(dryRun = true) {
  console.log(`${dryRun ? '🔍 DRY RUN' : '💾 MIGRATION MODE'}: Migrating additional fields from USERS to WORKERS...\n`);

  const results = {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  try {
    // Fetch all worker users from USERS collection
    console.log('📥 Fetching all worker users from USERS collection...');
    let allWorkerUsers = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS,
        [Query.equal('role', 'worker'), Query.limit(limit), Query.offset(offset)]
      );

      allWorkerUsers = allWorkerUsers.concat(response.documents);
      if (response.documents.length < limit) break;
      offset += limit;
    }

    console.log(`✅ Found ${allWorkerUsers.length} worker users in USERS collection\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`        ${dryRun ? 'ANALYZING WORKERS' : 'MIGRATING WORKERS'}        `);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Process each worker user
    for (const user of allWorkerUsers) {
      results.total++;

      try {
        // Find corresponding WORKERS profile
        const existingWorkers = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.WORKERS,
          [Query.equal('userId', user.$id), Query.limit(1)]
        );

        if (existingWorkers.documents.length > 0) {
          const worker = existingWorkers.documents[0];
          const updates = {};

          // Check and copy country (location data)
          if (!worker.country && user.country) {
            updates.country = user.country;
          }

          // Check and copy postalCode (location data)
          if (!worker.postalCode && user.postalCode) {
            updates.postalCode = user.postalCode;
          }

          // Check and copy address (if missing)
          if (!worker.address && user.address) {
            updates.address = user.address;
          }

          // Check and copy city (if missing)
          if (!worker.city && user.city) {
            updates.city = user.city;
          }

          // Check and copy state (if missing)
          if (!worker.state && user.state) {
            updates.state = user.state;
          }

          // Map experience to experienceYears if missing
          if (user.experience && (!worker.experienceYears || worker.experienceYears === 0)) {
            updates.experienceYears = user.experience;
            updates.experienceDescription = `${user.experience} years of experience`;
          }

          // Map serviceRadius to maxRadiusKm if missing
          if (user.serviceRadius && (!worker.maxRadiusKm || worker.maxRadiusKm === 0)) {
            updates.maxRadiusKm = user.serviceRadius;
          }

          if (Object.keys(updates).length > 0) {
            console.log(`👤 User: ${user.email || user.name} (${user.$id})`);
            console.log(`   📝 ${dryRun ? 'Would update' : 'Updating'} WORKERS profile: ${worker.$id}`);
            console.log(`   ✏️  Fields to update: ${Object.keys(updates).join(', ')}`);

            if (!dryRun) {
              updates.updatedAt = new Date().toISOString();
              await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.WORKERS,
                worker.$id,
                updates
              );
              console.log(`   ✅ Updated successfully`);
            }

            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          console.log(`⏭️  User: ${user.email || user.name} - No WORKERS profile found (skipping)`);
          results.skipped++;
        }
      } catch (error) {
        console.error(`   ❌ Error processing user ${user.$id}:`, error.message);
        results.errors.push({
          userId: user.$id,
          email: user.email,
          error: error.message
        });
      }
    }

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                         SUMMARY                               ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`📊 Migration Results:`);
    console.log(`   Total workers processed: ${results.total}`);
    console.log(`   ${dryRun ? 'Would update' : 'Updated'}:           ${results.updated}`);
    console.log(`   Skipped (complete):      ${results.skipped}`);
    console.log(`   Errors:                  ${results.errors.length}\n`);

    if (results.errors.length > 0) {
      console.log('❌ ERRORS:\n');
      results.errors.forEach((err, index) => {
        console.log(`${index + 1}. User: ${err.email || err.userId}`);
        console.log(`   Error: ${err.error}\n`);
      });
    }

    if (dryRun && results.updated > 0) {
      console.log('⚠️  THIS WAS A DRY RUN - No changes were made to the database.\n');
      console.log('To apply changes, run:\n');
      console.log('   node scripts/migrate-additional-fields.js --execute\n');
    }

    if (!dryRun && results.updated > 0) {
      console.log('✅ MIGRATION COMPLETE!\n');
      console.log('Next steps:');
      console.log('   1. Verify changes in Appwrite Console');
      console.log('   2. Test worker profiles in admin dashboard\n');
    }

    return { results };

  } catch (error) {
    console.error('❌ Fatal error during migration:', error.message);
    console.error(error);
    throw error;
  }
}

async function main() {
  const shouldExecute = process.argv.includes('--execute');

  console.log('🔧 Additional Field Migration Script\n');
  console.log('This will copy missing location and profile fields from USERS to WORKERS:');
  console.log('   - country (Nigeria, etc.)');
  console.log('   - postalCode (if exists)');
  console.log('   - address, city, state (if missing)');
  console.log('   - experience → experienceYears (if missing)');
  console.log('   - serviceRadius → maxRadiusKm (if missing)\n');

  if (shouldExecute) {
    console.log('⚠️  EXECUTING MIGRATION IN 5 SECONDS...\n');
    console.log('   This will UPDATE WORKERS profiles in the database!\n');
    console.log('   Press Ctrl+C to cancel\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  await migrateAdditionalFields(!shouldExecute);
}

main();
