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
 * Verify migration data integrity
 * Checks:
 * 1. All workers in USERS have WORKERS profile
 * 2. All WORKERS have userId linking to USERS
 * 3. All WORKERS have basic registration data (email, phone, name)
 * 4. No orphaned WORKERS records
 */
async function verifyMigration() {
  console.log('🔍 MIGRATION VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const issues = [];
  let totalChecks = 0;
  let passedChecks = 0;

  try {
    // Fetch all worker users from USERS
    console.log('📥 Fetching worker users from USERS collection...');
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

    // Fetch all WORKERS
    console.log('📥 Fetching all WORKERS profiles...');
    let allWorkers = [];
    offset = 0;

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

    console.log(`✅ Found ${allWorkerUsers.length} workers in USERS`);
    console.log(`✅ Found ${allWorkers.length} profiles in WORKERS\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    INTEGRITY CHECKS                           ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // CHECK 1: All workers in USERS have WORKERS profile
    console.log('✓ CHECK 1: All workers in USERS have WORKERS profile');
    totalChecks++;

    const usersWithoutWorkers = [];
    for (const user of allWorkerUsers) {
      const workerProfile = allWorkers.find(w => w.userId === user.$id);
      if (!workerProfile) {
        usersWithoutWorkers.push({
          userId: user.$id,
          email: user.email,
          name: user.name
        });
      }
    }

    if (usersWithoutWorkers.length === 0) {
      console.log(`   ✅ PASSED: All ${allWorkerUsers.length} workers have WORKERS profile\n`);
      passedChecks++;
    } else {
      console.log(`   ❌ FAILED: ${usersWithoutWorkers.length} workers missing WORKERS profile:`);
      usersWithoutWorkers.slice(0, 5).forEach((user, index) => {
        console.log(`      ${index + 1}. ${user.email || user.name} (${user.userId})`);
      });
      if (usersWithoutWorkers.length > 5) {
        console.log(`      ... and ${usersWithoutWorkers.length - 5} more`);
      }
      console.log('');
      issues.push({
        check: 'Workers without WORKERS profile',
        count: usersWithoutWorkers.length,
        items: usersWithoutWorkers
      });
    }

    // CHECK 2: All WORKERS have userId
    console.log('✓ CHECK 2: All WORKERS have userId field');
    totalChecks++;

    const workersWithoutUserId = allWorkers.filter(w => !w.userId);

    if (workersWithoutUserId.length === 0) {
      console.log(`   ✅ PASSED: All ${allWorkers.length} workers have userId\n`);
      passedChecks++;
    } else {
      console.log(`   ❌ FAILED: ${workersWithoutUserId.length} workers missing userId:`);
      workersWithoutUserId.slice(0, 5).forEach((worker, index) => {
        console.log(`      ${index + 1}. ${worker.email || worker.name} (${worker.$id})`);
      });
      if (workersWithoutUserId.length > 5) {
        console.log(`      ... and ${workersWithoutUserId.length - 5} more`);
      }
      console.log('');
      issues.push({
        check: 'Workers without userId',
        count: workersWithoutUserId.length,
        items: workersWithoutUserId.map(w => ({ workerId: w.$id, email: w.email }))
      });
    }

    // CHECK 3: All WORKERS have valid userId (pointing to existing USERS)
    console.log('✓ CHECK 3: All WORKERS have valid userId (links to USERS)');
    totalChecks++;

    const workersWithInvalidUserId = [];
    for (const worker of allWorkers) {
      if (worker.userId) {
        const user = allWorkerUsers.find(u => u.$id === worker.userId);
        if (!user) {
          workersWithInvalidUserId.push({
            workerId: worker.$id,
            email: worker.email,
            userId: worker.userId
          });
        }
      }
    }

    if (workersWithInvalidUserId.length === 0) {
      console.log(`   ✅ PASSED: All WORKERS have valid userId links\n`);
      passedChecks++;
    } else {
      console.log(`   ❌ FAILED: ${workersWithInvalidUserId.length} workers have invalid userId (orphaned):`);
      workersWithInvalidUserId.slice(0, 5).forEach((worker, index) => {
        console.log(`      ${index + 1}. Worker ${worker.workerId} → User ${worker.userId} (not found)`);
      });
      if (workersWithInvalidUserId.length > 5) {
        console.log(`      ... and ${workersWithInvalidUserId.length - 5} more`);
      }
      console.log('');
      issues.push({
        check: 'Workers with invalid userId',
        count: workersWithInvalidUserId.length,
        items: workersWithInvalidUserId
      });
    }

    // CHECK 4: All WORKERS have email field
    console.log('✓ CHECK 4: All WORKERS have email field (registration data)');
    totalChecks++;

    const workersWithoutEmail = allWorkers.filter(w => !w.email);

    if (workersWithoutEmail.length === 0) {
      console.log(`   ✅ PASSED: All ${allWorkers.length} workers have email\n`);
      passedChecks++;
    } else {
      console.log(`   ⚠️  WARNING: ${workersWithoutEmail.length} workers missing email:`);
      workersWithoutEmail.slice(0, 5).forEach((worker, index) => {
        console.log(`      ${index + 1}. ${worker.$id} - ${worker.name || 'No name'}`);
      });
      if (workersWithoutEmail.length > 5) {
        console.log(`      ... and ${workersWithoutEmail.length - 5} more`);
      }
      console.log('');
      issues.push({
        check: 'Workers without email',
        count: workersWithoutEmail.length,
        severity: 'warning',
        items: workersWithoutEmail.map(w => ({ workerId: w.$id, name: w.name, userId: w.userId }))
      });
    }

    // CHECK 5: All WORKERS have phone field
    console.log('✓ CHECK 5: All WORKERS have phone field (registration data)');
    totalChecks++;

    const workersWithoutPhone = allWorkers.filter(w => !w.phone);

    if (workersWithoutPhone.length === 0) {
      console.log(`   ✅ PASSED: All ${allWorkers.length} workers have phone\n`);
      passedChecks++;
    } else {
      console.log(`   ⚠️  WARNING: ${workersWithoutPhone.length} workers missing phone:`);
      workersWithoutPhone.slice(0, 5).forEach((worker, index) => {
        console.log(`      ${index + 1}. ${worker.email || worker.name} (${worker.$id})`);
      });
      if (workersWithoutPhone.length > 5) {
        console.log(`      ... and ${workersWithoutPhone.length - 5} more`);
      }
      console.log('');
      issues.push({
        check: 'Workers without phone',
        count: workersWithoutPhone.length,
        severity: 'warning',
        items: workersWithoutPhone.map(w => ({ workerId: w.$id, email: w.email, userId: w.userId }))
      });
    }

    // CHECK 6: All WORKERS have name field
    console.log('✓ CHECK 6: All WORKERS have name field (registration data)');
    totalChecks++;

    const workersWithoutName = allWorkers.filter(w => !w.name);

    if (workersWithoutName.length === 0) {
      console.log(`   ✅ PASSED: All ${allWorkers.length} workers have name\n`);
      passedChecks++;
    } else {
      console.log(`   ⚠️  WARNING: ${workersWithoutName.length} workers missing name:`);
      workersWithoutName.slice(0, 5).forEach((worker, index) => {
        console.log(`      ${index + 1}. ${worker.email} (${worker.$id})`);
      });
      if (workersWithoutName.length > 5) {
        console.log(`      ... and ${workersWithoutName.length - 5} more`);
      }
      console.log('');
      issues.push({
        check: 'Workers without name',
        count: workersWithoutName.length,
        severity: 'warning',
        items: workersWithoutName.map(w => ({ workerId: w.$id, email: w.email, userId: w.userId }))
      });
    }

    // Summary statistics
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                      STATISTICS                               ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`📊 Data Counts:`);
    console.log(`   Workers in USERS:     ${allWorkerUsers.length}`);
    console.log(`   Profiles in WORKERS:  ${allWorkers.length}`);
    console.log(`   Match rate:           ${((allWorkers.length / allWorkerUsers.length) * 100).toFixed(1)}%\n`);

    const workersWithDocs = allWorkers.filter(w => w.idDocument || w.selfieWithId);
    const workersVerified = allWorkers.filter(w => w.verificationStatus === 'approved' || w.isVerified);

    console.log(`📑 Document Statistics:`);
    console.log(`   Workers with documents:  ${workersWithDocs.length} (${((workersWithDocs.length / allWorkers.length) * 100).toFixed(1)}%)`);
    console.log(`   Workers verified:        ${workersVerified.length} (${((workersVerified.length / allWorkers.length) * 100).toFixed(1)}%)\n`);

    // Final summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                      FINAL RESULT                             ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const criticalIssues = issues.filter(i => i.severity !== 'warning');
    const warnings = issues.filter(i => i.severity === 'warning');

    console.log(`📊 Check Results:`);
    console.log(`   Total checks:     ${totalChecks}`);
    console.log(`   Passed:           ${passedChecks}`);
    console.log(`   Failed:           ${totalChecks - passedChecks}`);
    console.log(`   Critical issues:  ${criticalIssues.length}`);
    console.log(`   Warnings:         ${warnings.length}\n`);

    if (criticalIssues.length === 0 && warnings.length === 0) {
      console.log('✅ VERIFICATION PASSED!');
      console.log('   All data integrity checks passed successfully.');
      console.log('   Migration is complete and data is consistent.\n');
      return { success: true, issues: [] };
    } else if (criticalIssues.length === 0) {
      console.log('⚠️  VERIFICATION PASSED WITH WARNINGS');
      console.log(`   ${warnings.length} non-critical warning(s) found.`);
      console.log('   Review warnings above but migration is generally successful.\n');
      return { success: true, issues: warnings };
    } else {
      console.log('❌ VERIFICATION FAILED');
      console.log(`   ${criticalIssues.length} critical issue(s) found.`);
      console.log('   Please review issues above and re-run migration if needed.\n');
      return { success: false, issues };
    }

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    console.error(error);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Starting migration verification...\n');
  await new Promise(resolve => setTimeout(resolve, 1000));

  const result = await verifyMigration();

  if (result.success) {
    console.log('Next steps:');
    console.log('   1. ✅ Data migration verified');
    console.log('   2. Deploy code changes to remove dual-updates');
    console.log('   3. Test worker onboarding and profile updates\n');
  } else {
    console.log('Recommended actions:');
    console.log('   1. Review issues listed above');
    console.log('   2. Fix data inconsistencies');
    console.log('   3. Re-run migration: node scripts/migrate-worker-data.js --execute');
    console.log('   4. Verify again: node scripts/verify-migration.js\n');
  }
}

main();
