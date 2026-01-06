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
 * Check the exact workers visible in the Appwrite Console screenshot
 * to prove the data is there
 */
async function checkSpecificWorkers() {
  console.log('🔍 Checking Last 20 Workers (as shown in console)\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Fetch the last 20 workers (descending by sequence/ID)
    const workers = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.WORKERS,
      [Query.limit(20), Query.orderDesc('$createdAt')]
    );

    console.log(`Found ${workers.documents.length} recent workers:\n`);

    workers.documents.forEach((worker, index) => {
      console.log(`${index + 1}. Worker (Sequence #${worker.$sequence || 'N/A'})`);
      console.log(`   Document ID: ${worker.$id}`);
      console.log(`   ---`);
      console.log(`   name:    ${worker.name || '❌ NULL'}`);
      console.log(`   email:   ${worker.email || '❌ NULL'}`);
      console.log(`   phone:   ${worker.phone || '❌ NULL'}`);
      console.log(`   ---`);
      console.log(`   displayName: ${worker.displayName || 'NULL'}`);
      console.log(`   address:     ${worker.address || 'NULL'}`);
      console.log(`   city:        ${worker.city || 'NULL'}`);
      console.log(`   state:       ${worker.state || 'NULL'}`);
      console.log(`   country:     ${worker.country || 'NULL'}`);
      console.log(`   ---`);
      console.log(`   isActive:    ${worker.isActive}`);
      console.log(`   verificationStatus: ${worker.verificationStatus || 'NULL'}`);
      console.log(`   userId:      ${worker.userId || 'NULL'}`);
      console.log('');
    });

    // Statistics
    const withName = workers.documents.filter(w => w.name && w.name.trim()).length;
    const withEmail = workers.documents.filter(w => w.email && w.email.trim()).length;
    const withPhone = workers.documents.filter(w => w.phone && w.phone.trim()).length;

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                         STATISTICS                            ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`📊 Last 20 Workers:`);
    console.log(`   With name:  ${withName}/20 (${((withName/20)*100).toFixed(0)}%)`);
    console.log(`   With email: ${withEmail}/20 (${((withEmail/20)*100).toFixed(0)}%)`);
    console.log(`   With phone: ${withPhone}/20 (${((withPhone/20)*100).toFixed(0)}%)\n`);

    if (withName < 20 || withEmail < 20) {
      console.log('⚠️  Some workers are missing name/email data!\n');
      console.log('This could be because:');
      console.log('   1. These workers were created BEFORE the migration');
      console.log('   2. The USERS records didn\'t have name/email when registered');
      console.log('   3. Need to run migration again to fill in missing data\n');
    } else {
      console.log('✅ All 20 recent workers have complete name/email/phone data!\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

checkSpecificWorkers();
