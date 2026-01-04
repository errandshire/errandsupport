require('dotenv').config({ path: '.env' });
const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const COLLECTIONS = {
  WORKERS: process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID
};

/**
 * Migrates verificationStatus values in WORKERS collection from old schema to new schema
 *
 * OLD SCHEMA (WORKERS):      NEW SCHEMA (Standardized):
 * - verified       →         - approved
 * - rejected       →         - denied
 * - pending        →         - pending (unchanged)
 *
 * This standardizes both USERS and WORKERS to use: pending | approved | denied
 */
async function migrateVerificationStatus() {
  console.log('🔄 Migrating verificationStatus values in WORKERS collection...\n');
  console.log('OLD → NEW:');
  console.log('  verified → approved');
  console.log('  rejected → denied');
  console.log('  pending  → pending (unchanged)\n');

  // Fetch all worker profiles
  let allWorkers = [];
  let offset = 0;
  const limit = 100;

  console.log('📥 Fetching all worker profiles...');
  while (true) {
    const response = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.WORKERS,
      [Query.limit(limit), Query.offset(offset)]
    );

    allWorkers = allWorkers.concat(response.documents);
    if (response.documents.length < limit) break;
    offset += limit;
  }

  console.log(`✅ Found ${allWorkers.length} worker profiles\n`);

  // Find workers with old status values
  const needsMigration = allWorkers.filter(w =>
    w.verificationStatus === 'verified' || w.verificationStatus === 'rejected'
  );

  console.log(`📊 Workers needing migration: ${needsMigration.length}`);
  console.log(`   - verified: ${allWorkers.filter(w => w.verificationStatus === 'verified').length}`);
  console.log(`   - rejected: ${allWorkers.filter(w => w.verificationStatus === 'rejected').length}`);
  console.log(`   - pending (no change): ${allWorkers.filter(w => w.verificationStatus === 'pending').length}`);
  console.log(`   - null/other: ${allWorkers.filter(w => !w.verificationStatus || (w.verificationStatus !== 'verified' && w.verificationStatus !== 'rejected' && w.verificationStatus !== 'pending')).length}\n`);

  if (needsMigration.length === 0) {
    console.log('✅ No workers need migration! All statuses are already standardized.\n');
    return { migrated: 0, errors: 0 };
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                   MIGRATING STATUS VALUES                     ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let migrated = 0;
  let errors = 0;

  for (const worker of needsMigration) {
    const workerName = worker.displayName || worker.firstName || 'Unknown';
    const oldStatus = worker.verificationStatus;
    const newStatus = oldStatus === 'verified' ? 'approved' : 'denied';

    try {
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        COLLECTIONS.WORKERS,
        worker.$id,
        { verificationStatus: newStatus }
      );

      console.log(`✅ ${workerName}: ${oldStatus} → ${newStatus}`);
      migrated++;

    } catch (error) {
      console.log(`❌ ${workerName}: Failed - ${error.message}`);
      errors++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                   MIGRATION COMPLETE                          ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`✅ Successfully migrated: ${migrated}`);
  console.log(`❌ Errors:                ${errors}`);
  console.log(`📊 Total processed:       ${needsMigration.length}\n`);

  return { migrated, errors };
}

async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');

  let allWorkers = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.WORKERS,
      [Query.limit(limit), Query.offset(offset)]
    );

    allWorkers = allWorkers.concat(response.documents);
    if (response.documents.length < limit) break;
    offset += limit;
  }

  const hasOldValues = allWorkers.some(w =>
    w.verificationStatus === 'verified' || w.verificationStatus === 'rejected'
  );

  if (hasOldValues) {
    console.log('⚠️  WARNING: Some workers still have old status values!');
    console.log('    Run the migration again or check for errors.\n');
    return false;
  } else {
    console.log('✅ Verification passed! All workers use new status schema.');
    console.log('   Status distribution:');
    console.log(`   - approved: ${allWorkers.filter(w => w.verificationStatus === 'approved').length}`);
    console.log(`   - denied:   ${allWorkers.filter(w => w.verificationStatus === 'denied').length}`);
    console.log(`   - pending:  ${allWorkers.filter(w => w.verificationStatus === 'pending').length}`);
    console.log(`   - other:    ${allWorkers.filter(w => !w.verificationStatus || (w.verificationStatus !== 'approved' && w.verificationStatus !== 'denied' && w.verificationStatus !== 'pending')).length}\n`);
    return true;
  }
}

async function main() {
  try {
    const { migrated, errors } = await migrateVerificationStatus();

    if (migrated > 0) {
      await verifyMigration();
    }

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

main();
