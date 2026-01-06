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
 * Verify that name, email, phone exist in WORKERS collection
 */
async function verifyWorkersData() {
  console.log('🔍 Verifying WORKERS Collection Data\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Fetch sample workers
    const workers = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.WORKERS,
      [Query.limit(10)]
    );

    console.log(`Checking ${workers.documents.length} sample workers:\n`);

    const stats = {
      total: workers.documents.length,
      withName: 0,
      withEmail: 0,
      withPhone: 0,
      withAllThree: 0
    };

    workers.documents.forEach((worker, index) => {
      const hasName = worker.name && worker.name.trim() !== '';
      const hasEmail = worker.email && worker.email.trim() !== '';
      const hasPhone = worker.phone && worker.phone.trim() !== '';

      if (hasName) stats.withName++;
      if (hasEmail) stats.withEmail++;
      if (hasPhone) stats.withPhone++;
      if (hasName && hasEmail && hasPhone) stats.withAllThree++;

      console.log(`${index + 1}. Worker ID: ${worker.$id}`);
      console.log(`   name:  ${hasName ? '✅ ' + worker.name : '❌ MISSING'}`);
      console.log(`   email: ${hasEmail ? '✅ ' + worker.email : '❌ MISSING'}`);
      console.log(`   phone: ${hasPhone ? '✅ ' + worker.phone : '❌ MISSING'}`);
      console.log(`   displayName: ${worker.displayName || 'N/A'}`);
      console.log(`   userId: ${worker.userId || 'N/A'}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                         STATISTICS                            ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`📊 Sample Statistics (${stats.total} workers):`);
    console.log(`   With name:  ${stats.withName}/${stats.total} (${((stats.withName/stats.total)*100).toFixed(0)}%)`);
    console.log(`   With email: ${stats.withEmail}/${stats.total} (${((stats.withEmail/stats.total)*100).toFixed(0)}%)`);
    console.log(`   With phone: ${stats.withPhone}/${stats.total} (${((stats.withPhone/stats.total)*100).toFixed(0)}%)`);
    console.log(`   With all 3: ${stats.withAllThree}/${stats.total} (${((stats.withAllThree/stats.total)*100).toFixed(0)}%)\n`);

    // Now check USERS collection to see if name still exists there
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                   USERS COLLECTION CHECK                      ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const users = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.USERS,
      [Query.equal('role', 'worker'), Query.limit(5)]
    );

    console.log('Checking if name still exists in USERS collection:\n');

    users.documents.forEach((user, index) => {
      const hasName = user.name && user.name.trim() !== '';
      console.log(`${index + 1}. User ID: ${user.$id}`);
      console.log(`   email: ${user.email || 'N/A'}`);
      console.log(`   name:  ${hasName ? '✅ ' + user.name : '❌ MISSING'}`);
      console.log(`   phone: ${user.phone || 'N/A'}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════\n');

    if (stats.withAllThree < stats.total) {
      console.log('⚠️  ISSUE FOUND: Some workers are missing name/email/phone in WORKERS!\n');
      console.log('Possible causes:');
      console.log('   1. Migration didn\'t run completely');
      console.log('   2. Some USERS records don\'t have name/email/phone');
      console.log('   3. Data wasn\'t properly copied\n');
      console.log('Solution:');
      console.log('   Run migration again: node scripts/migrate-worker-data.js --execute\n');
    } else {
      console.log('✅ SUCCESS: All sampled workers have complete data in WORKERS!\n');
      console.log('Note: The Appwrite Console view might not show all columns.');
      console.log('Click on "Columns" button to add name, email, phone to the view.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

verifyWorkersData();
