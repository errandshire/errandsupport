require('dotenv').config({ path: '.env' });
const { Client, Databases, Query, ID } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const COLLECTIONS = {
  USERS: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
  WORKERS: process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID
};

/**
 * Parse first name from full name
 */
function parseFirstName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  return parts[0] || '';
}

/**
 * Parse last name from full name
 */
function parseLastName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}

/**
 * Migrate worker data from USERS to WORKERS collection
 * Strategy:
 * 1. Copy registration data (email, phone, name) to WORKERS
 * 2. Copy verification documents if missing in WORKERS
 * 3. Ensure userId link exists
 * 4. Create WORKERS profile if missing
 */
async function migrateWorkerData(dryRun = true) {
  console.log(`${dryRun ? '🔍 DRY RUN' : '💾 MIGRATION MODE'}: Migrating worker data from USERS to WORKERS...\n`);

  const results = {
    total: 0,
    updated: 0,
    created: 0,
    skipped: 0,
    errors: []
  };

  const changes = [];

  try {
    // Fetch all worker users from USERS collection
    console.log('📥 Fetching all worker users from USERS collection...');
    let allWorkerUsers = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
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
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
          COLLECTIONS.WORKERS,
          [Query.equal('userId', user.$id), Query.limit(1)]
        );

        if (existingWorkers.documents.length > 0) {
          // WORKERS profile exists - update missing fields
          const worker = existingWorkers.documents[0];
          const updates = {};

          // Check and copy basic registration data
          if (!worker.email && user.email) {
            updates.email = user.email;
          }
          if (!worker.phone && user.phone) {
            updates.phone = user.phone;
          }
          if (!worker.name && user.name) {
            updates.name = user.name;
          }
          if (!worker.firstName && user.name) {
            updates.firstName = parseFirstName(user.name);
          }
          if (!worker.lastName && user.name) {
            updates.lastName = parseLastName(user.name);
          }
          if (!worker.displayName && user.name) {
            updates.displayName = user.name;
          }

          // Check and copy verification documents
          if (!worker.idType && user.idType) {
            updates.idType = user.idType;
          }
          if (!worker.idNumber && user.idNumber) {
            updates.idNumber = user.idNumber;
          }
          if (!worker.idDocument && user.idDocument) {
            updates.idDocument = user.idDocument;
          }
          if (!worker.selfieWithId && user.selfieWithId) {
            updates.selfieWithId = user.selfieWithId;
          }
          if (!worker.additionalDocuments && user.additionalDocuments) {
            updates.additionalDocuments = user.additionalDocuments;
          }
          if (!worker.verificationStatus && user.verificationStatus) {
            updates.verificationStatus = user.verificationStatus;
          }

          // Ensure userId is set
          if (!worker.userId) {
            updates.userId = user.$id;
          }

          if (Object.keys(updates).length > 0) {
            console.log(`👤 User: ${user.email || user.name} (${user.$id})`);
            console.log(`   📝 ${dryRun ? 'Would update' : 'Updating'} WORKERS profile: ${worker.$id}`);
            console.log(`   ✏️  Fields to update: ${Object.keys(updates).join(', ')}`);

            changes.push({
              userId: user.$id,
              userEmail: user.email,
              workerId: worker.$id,
              action: 'update',
              fields: Object.keys(updates)
            });

            if (!dryRun) {
              updates.updatedAt = new Date().toISOString();
              await databases.updateDocument(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
                COLLECTIONS.WORKERS,
                worker.$id,
                updates
              );
              console.log(`   ✅ Updated successfully`);
            }

            results.updated++;
          } else {
            console.log(`⏭️  User: ${user.email || user.name} - WORKERS profile already complete`);
            results.skipped++;
          }
        } else {
          // WORKERS profile doesn't exist - create it
          console.log(`👤 User: ${user.email || user.name} (${user.$id})`);
          console.log(`   ⚠️  NO WORKERS PROFILE FOUND`);
          console.log(`   ${dryRun ? '🔍 Would create' : '✨ Creating'} new WORKERS profile...`);

          const newWorkerData = {
            userId: user.$id,
            email: user.email || '',
            phone: user.phone || '',
            name: user.name || '',
            firstName: parseFirstName(user.name || ''),
            lastName: parseLastName(user.name || ''),
            displayName: user.name || '',

            // Copy verification documents if they exist
            idType: user.idType || null,
            idNumber: user.idNumber || null,
            idDocument: user.idDocument || null,
            selfieWithId: user.selfieWithId || null,
            additionalDocuments: user.additionalDocuments || null,
            verificationStatus: user.verificationStatus || 'pending',

            // Default values for required worker fields
            bio: '',
            categories: [],
            hourlyRate: 0,
            isVerified: false,
            isActive: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          changes.push({
            userId: user.$id,
            userEmail: user.email,
            action: 'create',
            data: newWorkerData
          });

          if (!dryRun) {
            const newWorker = await databases.createDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
              COLLECTIONS.WORKERS,
              ID.unique(),
              newWorkerData
            );
            console.log(`   ✅ Created WORKERS profile: ${newWorker.$id}`);
          }

          results.created++;
        }

        console.log('');

      } catch (error) {
        console.error(`   ❌ Error processing user ${user.$id}:`, error.message);
        results.errors.push({
          userId: user.$id,
          email: user.email,
          error: error.message
        });
        console.log('');
      }
    }

    // Print summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                         SUMMARY                               ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`📊 Migration Results:`);
    console.log(`   Total workers processed: ${results.total}`);
    console.log(`   ${dryRun ? 'Would update' : 'Updated'}:           ${results.updated}`);
    console.log(`   ${dryRun ? 'Would create' : 'Created'}:           ${results.created}`);
    console.log(`   Skipped (complete):      ${results.skipped}`);
    console.log(`   Errors:                  ${results.errors.length}\n`);

    if (results.errors.length > 0) {
      console.log('❌ ERRORS:\n');
      results.errors.forEach((err, index) => {
        console.log(`${index + 1}. User: ${err.email || err.userId}`);
        console.log(`   Error: ${err.error}\n`);
      });
    }

    if (dryRun && (results.updated > 0 || results.created > 0)) {
      console.log('⚠️  THIS WAS A DRY RUN - No changes were made to the database.\n');
      console.log('To apply changes, run:\n');
      console.log('   node scripts/migrate-worker-data.js --execute\n');
    }

    if (!dryRun) {
      console.log('✅ MIGRATION COMPLETE!\n');
      console.log('Next steps:');
      console.log('   1. Run verification: node scripts/verify-migration.js');
      console.log('   2. Test worker onboarding and profile updates');
      console.log('   3. Deploy code changes to remove dual-updates\n');
    }

    return { results, changes };

  } catch (error) {
    console.error('❌ Fatal error during migration:', error.message);
    console.error(error);
    throw error;
  }
}

async function main() {
  const shouldExecute = process.argv.includes('--execute');

  if (shouldExecute) {
    console.log('⚠️  EXECUTING MIGRATION IN 5 SECONDS...\n');
    console.log('   This will UPDATE/CREATE WORKERS profiles in the database!\n');
    console.log('   Press Ctrl+C to cancel\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  await migrateWorkerData(!shouldExecute);
}

main();
