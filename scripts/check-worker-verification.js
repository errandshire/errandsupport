require('dotenv').config();
const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const workersCollectionId = process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID;
const usersCollectionId = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID;

async function checkWorkerVerification() {
  console.log('🔍 Checking worker verification status...\n');

  try {
    // Get all workers
    const workersResponse = await databases.listDocuments(
      databaseId,
      workersCollectionId,
      [Query.limit(100)]
    );

    console.log(`📋 Found ${workersResponse.documents.length} workers\n`);

    for (const worker of workersResponse.documents) {
      try {
        // Get user data
        const user = await databases.getDocument(
          databaseId,
          usersCollectionId,
          worker.userId
        );

        const isVerified = worker.isVerified || false;
        const isActive = worker.isActive !== false; // Default to true if undefined
        const hasLocation = !!(worker.locationLat && worker.locationLng);
        const hasServiceRadius = !!worker.serviceRadius;

        const statusIcon = (isVerified && isActive) ? '✅' : '⚠️';

        console.log(`${statusIcon} Worker: ${user.name}`);
        console.log(`   User ID: ${worker.userId}`);
        console.log(`   Worker ID: ${worker.$id}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Verified: ${isVerified ? '✅ YES' : '❌ NO'}`);
        console.log(`   Active: ${isActive ? '✅ YES' : '❌ NO'}`);
        console.log(`   Has Location: ${hasLocation ? '✅ YES' : '❌ NO'}`);
        if (hasLocation) {
          console.log(`   Location: ${worker.locationLat}, ${worker.locationLng}`);
        }
        console.log(`   Service Radius: ${hasServiceRadius ? `${worker.serviceRadius}km` : '❌ NOT SET'}`);

        if (!isVerified) {
          console.log(`   ⚠️  ISSUE: Worker needs to be verified to accept jobs`);
        }
        if (!isActive) {
          console.log(`   ⚠️  ISSUE: Worker needs to be activated to accept jobs`);
        }

        console.log('---');
      } catch (userError) {
        console.log(`❌ Error fetching user for worker ${worker.$id}:`, userError.message);
        console.log('---');
      }
    }

    // Summary
    const verifiedWorkers = workersResponse.documents.filter(w => w.isVerified === true);
    const activeWorkers = workersResponse.documents.filter(w => w.isActive !== false);
    const eligibleWorkers = workersResponse.documents.filter(w => w.isVerified === true && w.isActive !== false);

    console.log('\n📊 Summary:');
    console.log(`   Total Workers: ${workersResponse.documents.length}`);
    console.log(`   Verified Workers: ${verifiedWorkers.length}`);
    console.log(`   Active Workers: ${activeWorkers.length}`);
    console.log(`   Eligible Workers (Verified + Active): ${eligibleWorkers.length}`);

    if (eligibleWorkers.length === 0) {
      console.log('\n⚠️  WARNING: No workers are eligible to accept jobs!');
      console.log('   Workers need to be both verified AND active.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkWorkerVerification()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
