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

async function findUserIdMismatches() {
  console.log('🔍 Investigating userId mismatches between USERS and WORKERS collections...\n');

  // Fetch all workers with role="worker" from USERS collection
  let allUsers = [];
  let offset = 0;
  const limit = 100;

  console.log('📥 Fetching all users with role="worker"...');
  while (true) {
    const response = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.USERS,
      [
        Query.equal('role', 'worker'),
        Query.limit(limit),
        Query.offset(offset)
      ]
    );

    allUsers = allUsers.concat(response.documents);

    if (response.documents.length < limit) break;
    offset += limit;
  }

  console.log(`✅ Found ${allUsers.length} users with role="worker"\n`);

  // Fetch all worker profiles
  let allWorkerProfiles = [];
  offset = 0;

  console.log('📥 Fetching all worker profiles...');
  while (true) {
    const response = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.WORKERS,
      [
        Query.limit(limit),
        Query.offset(offset)
      ]
    );

    allWorkerProfiles = allWorkerProfiles.concat(response.documents);

    if (response.documents.length < limit) break;
    offset += limit;
  }

  console.log(`✅ Found ${allWorkerProfiles.length} worker profiles\n`);

  // Find mismatches
  const mismatches = [];
  const matchedWorkerIds = new Set();
  const unmatchedUsers = [];
  let correctMatches = 0;

  console.log('🔍 Analyzing matches...\n');

  for (const user of allUsers) {
    // Try to find worker by userId (correct way)
    const workerByUserId = allWorkerProfiles.find(w => w.userId === user.$id);

    if (workerByUserId) {
      matchedWorkerIds.add(workerByUserId.$id);
      correctMatches++;
      continue;
    }

    // If not found by userId, try to find by name/email/phone
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
    const userEmail = user.email?.toLowerCase();
    const userPhone = user.phoneNumber;

    let foundMatch = false;

    for (const worker of allWorkerProfiles) {
      if (matchedWorkerIds.has(worker.$id)) continue;

      const workerName = `${worker.firstName || ''} ${worker.lastName || ''}`.trim().toLowerCase();
      const workerEmail = worker.email?.toLowerCase();
      const workerPhone = worker.phoneNumber;

      // Check if this is the same person
      const nameMatch = userName && workerName && userName === workerName;
      const emailMatch = userEmail && workerEmail && userEmail === workerEmail;
      const phoneMatch = userPhone && workerPhone && userPhone === workerPhone;

      if (nameMatch || emailMatch || phoneMatch) {
        const matchTypes = [];
        if (nameMatch) matchTypes.push('name');
        if (emailMatch) matchTypes.push('email');
        if (phoneMatch) matchTypes.push('phone');

        mismatches.push({
          userRecord: {
            id: user.$id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            email: user.email,
            phone: user.phoneNumber
          },
          workerRecord: {
            id: worker.$id,
            currentUserId: worker.userId,
            name: `${worker.firstName || ''} ${worker.lastName || ''}`.trim(),
            email: worker.email,
            phone: worker.phoneNumber,
            hasDocuments: !!(worker.idDocument || worker.selfieWithId || worker.additionalDocuments)
          },
          matchTypes: matchTypes,
          confidence: matchTypes.length >= 2 ? 'HIGH' : 'MEDIUM'
        });
        matchedWorkerIds.add(worker.$id);
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      unmatchedUsers.push({
        id: user.$id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        phone: user.phoneNumber
      });
    }
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                      ANALYSIS RESULTS                          ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`✅ Correct matches (userId linked properly):  ${correctMatches}`);
  console.log(`⚠️  Mismatched userIds (fixable):             ${mismatches.length}`);
  console.log(`❌ No worker profile found:                   ${unmatchedUsers.length}`);
  console.log(`📊 Total users analyzed:                      ${allUsers.length}\n`);

  if (mismatches.length > 0) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                   MISMATCHED USERIDS FOUND                     ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    mismatches.forEach((mismatch, index) => {
      console.log(`${index + 1}. ${mismatch.userRecord.name || 'Unknown'} [${mismatch.confidence} confidence]`);
      console.log(`   ├─ Matched by: ${mismatch.matchTypes.join(', ')}`);
      console.log(`   ├─ USERS userId:         ${mismatch.userRecord.id}`);
      console.log(`   ├─ WORKERS current:      ${mismatch.workerRecord.currentUserId}`);
      console.log(`   ├─ Worker Doc ID:        ${mismatch.workerRecord.id}`);
      console.log(`   ├─ Has Documents:        ${mismatch.workerRecord.hasDocuments ? '✅ YES' : '❌ NO'}`);
      console.log(`   └─ Email/Phone:          ${mismatch.userRecord.email || mismatch.userRecord.phone || 'N/A'}\n`);
    });
  }

  if (unmatchedUsers.length > 0) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('             USERS WITHOUT WORKER PROFILES                      ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    unmatchedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'Unknown'}`);
      console.log(`   ├─ User ID: ${user.id}`);
      console.log(`   └─ Email:   ${user.email || 'N/A'}\n`);
    });
  }

  return { mismatches, unmatchedUsers, correctMatches };
}

async function fixUserIdMismatches(mismatches, dryRun = true) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`      ${dryRun ? '🔍 DRY RUN MODE - No changes will be made' : '🔧 FIXING USERID MISMATCHES'}      `);
  console.log('═══════════════════════════════════════════════════════════════\n');

  let successCount = 0;
  let errorCount = 0;

  for (const mismatch of mismatches) {
    const correctUserId = mismatch.userRecord.id;
    const workerDocId = mismatch.workerRecord.id;
    const currentUserId = mismatch.workerRecord.currentUserId;

    console.log(`${dryRun ? '📝 Would update' : '🔧 Updating'} worker: ${mismatch.userRecord.name}`);
    console.log(`   Worker Doc ID: ${workerDocId}`);
    console.log(`   From userId:   ${currentUserId}`);
    console.log(`   To userId:     ${correctUserId}`);

    if (!dryRun) {
      try {
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
          COLLECTIONS.WORKERS,
          workerDocId,
          { userId: correctUserId }
        );
        console.log('   ✅ Updated successfully\n');
        successCount++;
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        errorCount++;
      }
    } else {
      console.log('');
    }
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  if (dryRun) {
    console.log('⚠️  THIS WAS A DRY RUN - No changes were made to the database.\n');
    console.log(`📊 ${mismatches.length} mismatched userId(s) found and ready to fix.\n`);
    console.log('To apply fixes, run:\n');
    console.log('   node scripts/fix-userid-mismatch.js --fix\n');
  } else {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                       FIX COMPLETE                             ');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`✅ Successfully fixed: ${successCount}`);
    console.log(`❌ Failed to fix:      ${errorCount}`);
    console.log(`📊 Total processed:    ${mismatches.length}\n`);
  }
}

async function main() {
  try {
    const { mismatches, unmatchedUsers, correctMatches } = await findUserIdMismatches();

    if (mismatches.length === 0 && unmatchedUsers.length === 0) {
      console.log('✅ Perfect! All userIds are correctly linked.\n');
      console.log(`   ${correctMatches} workers have matching userId fields.\n`);
      return;
    }

    if (mismatches.length > 0) {
      const shouldFix = process.argv.includes('--fix');
      await fixUserIdMismatches(mismatches, !shouldFix);
    }

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

main();
