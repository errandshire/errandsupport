require('dotenv').config({ path: '.env' });
const { Client, Databases, Query } = require('node-appwrite');

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
 * Safely delete duplicate accounts that don't have WORKERS profiles
 * Strategy:
 * 1. For each duplicate phone number
 * 2. Keep account WITH workers profile
 * 3. Delete accounts WITHOUT workers profile
 * 4. If BOTH have workers OR NONE have workers - SKIP (manual review needed)
 */
async function cleanupAllDuplicates(dryRun = true) {
  console.log(`${dryRun ? '🔍 DRY RUN' : '🗑️  CLEANUP MODE'}: Cleaning up duplicate accounts...\n`);

  // Fetch all users
  let allUsers = [];
  let offset = 0;
  const limit = 100;

  console.log('📥 Fetching all users...');
  while (true) {
    const response = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.USERS,
      [Query.limit(limit), Query.offset(offset)]
    );

    allUsers = allUsers.concat(response.documents);
    if (response.documents.length < limit) break;
    offset += limit;
  }

  console.log(`✅ Found ${allUsers.length} total users\n`);

  // Find duplicates by phone
  const phoneMap = {};
  allUsers.forEach(user => {
    const phone = user.phone || user.phoneNumber;
    if (phone) {
      if (!phoneMap[phone]) phoneMap[phone] = [];
      phoneMap[phone].push(user);
    }
  });

  const phoneDuplicates = Object.entries(phoneMap).filter(([phone, users]) => users.length > 1);

  console.log(`Found ${phoneDuplicates.length} phone numbers with duplicates\n`);

  let deletedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const deletionLog = [];
  const skipLog = [];

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`        ${dryRun ? 'ANALYZING DUPLICATES' : 'DELETING DUPLICATES'}        `);
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const [phone, users] of phoneDuplicates) {
    console.log(`📱 Processing phone: ${phone} (${users.length} accounts)`);

    // Check which accounts have WORKERS profiles
    const accountsWithStatus = [];
    for (const user of users) {
      const workerProfiles = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        COLLECTIONS.WORKERS,
        [Query.equal('userId', user.$id), Query.limit(1)]
      );
      const hasWorker = workerProfiles.documents.length > 0;
      accountsWithStatus.push({ user, hasWorker });
    }

    const withWorkers = accountsWithStatus.filter(a => a.hasWorker);
    const withoutWorkers = accountsWithStatus.filter(a => !a.hasWorker);

    // Decision logic
    if (withWorkers.length === 1 && withoutWorkers.length > 0) {
      // Perfect case: ONE with workers, others without
      console.log(`   ✅ Clear case: 1 with workers, ${withoutWorkers.length} without`);
      console.log(`   👉 KEEP: ${withWorkers[0].user.email} (${withWorkers[0].user.$id})`);

      for (const { user } of withoutWorkers) {
        console.log(`   ${dryRun ? '🔍 Would delete' : '🗑️  Deleting'}: ${user.email} (${user.$id})`);

        if (!dryRun) {
          try {
            await databases.deleteDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
              COLLECTIONS.USERS,
              user.$id
            );
            deletionLog.push({
              phone,
              deleted: user.email,
              deletedId: user.$id,
              kept: withWorkers[0].user.email,
              keptId: withWorkers[0].user.$id
            });
            deletedCount++;
            console.log(`   ✅ Deleted successfully`);
          } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            errorCount++;
          }
        } else {
          deletedCount++;
        }
      }
    } else if (withWorkers.length > 1) {
      // Both have workers - SKIP
      console.log(`   ⚠️  SKIP: Multiple accounts (${withWorkers.length}) have WORKERS profiles`);
      console.log(`   👉 Manual review needed!`);
      withWorkers.forEach(({ user }, index) => {
        console.log(`      ${index + 1}. ${user.email} (${user.$id})`);
      });
      skipLog.push({
        phone,
        reason: 'Multiple accounts with WORKERS profiles',
        count: withWorkers.length
      });
      skippedCount++;
    } else if (withWorkers.length === 0) {
      // None have workers - SKIP
      console.log(`   ⚠️  SKIP: NO accounts have WORKERS profiles`);
      console.log(`   👉 All are incomplete registrations - keep for manual review`);
      skipLog.push({
        phone,
        reason: 'No accounts have WORKERS profiles',
        count: users.length
      });
      skippedCount++;
    }

    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         SUMMARY                               ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`${dryRun ? '📊 Would have deleted' : '✅ Successfully deleted'}:  ${deletedCount} duplicate accounts`);
  console.log(`⏭️  Skipped:                    ${skippedCount} phone numbers`);
  console.log(`❌ Errors:                      ${errorCount}`);
  console.log('');

  if (skipLog.length > 0) {
    console.log('⚠️  SKIPPED ITEMS (require manual review):\n');
    skipLog.forEach(({ phone, reason, count }, index) => {
      console.log(`${index + 1}. Phone: ${phone}`);
      console.log(`   Reason: ${reason}`);
      console.log(`   Accounts: ${count}`);
      console.log('');
    });
  }

  if (!dryRun && deletionLog.length > 0) {
    console.log('✅ DELETED ACCOUNTS:\n');
    deletionLog.forEach(({ phone, deleted, kept }, index) => {
      console.log(`${index + 1}. Phone: ${phone}`);
      console.log(`   Deleted: ${deleted}`);
      console.log(`   Kept: ${kept}`);
      console.log('');
    });
  }

  if (dryRun) {
    console.log('\n⚠️  THIS WAS A DRY RUN - No changes were made to the database.\n');
    console.log('To apply changes, run:\n');
    console.log('   node scripts/cleanup-all-duplicates.js --execute\n');
  }
}

async function main() {
  const shouldExecute = process.argv.includes('--execute');

  if (shouldExecute) {
    console.log('⚠️  EXECUTING CLEANUP IN 5 SECONDS...\n');
    console.log('   This will DELETE duplicate accounts from the database!\n');
    console.log('   Press Ctrl+C to cancel\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  await cleanupAllDuplicates(!shouldExecute);
}

main();
