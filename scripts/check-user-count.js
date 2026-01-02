const { Client, Databases, Query } = require('node-appwrite');
require('dotenv').config();

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function checkCounts() {
  try {
    console.log('🔍 Checking database counts...\n');

    // Count all workers
    const workersResponse = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID,
      [Query.limit(1)] // Just need the total count
    );

    console.log('👷 WORKERS Collection:');
    console.log(`   Total Workers: ${workersResponse.total}`);

    // Count all users
    const allUsersResponse = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
      [Query.limit(1)]
    );

    console.log('\n👥 USERS Collection:');
    console.log(`   Total Users: ${allUsersResponse.total}`);

    // Count users by role
    const clientsResponse = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
      [Query.equal('role', 'client'), Query.limit(1)]
    );

    const workersInUsersResponse = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
      [Query.equal('role', 'worker'), Query.limit(1)]
    );

    const adminsResponse = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
      [Query.equal('role', 'admin'), Query.limit(1)]
    );

    console.log(`   - Clients: ${clientsResponse.total}`);
    console.log(`   - Workers (in USERS): ${workersInUsersResponse.total}`);
    console.log(`   - Admins: ${adminsResponse.total}`);

    console.log('\n📊 Summary:');
    console.log(`   WORKERS collection has ${workersResponse.total} worker profiles`);
    console.log(`   USERS collection has ${workersInUsersResponse.total} users with role="worker"`);
    console.log(`   ${clientsResponse.total} clients`);
    console.log(`   ${adminsResponse.total} admins`);
    console.log(`   ${allUsersResponse.total} total users (all roles)`);

    // Check for discrepancies
    if (workersResponse.total !== workersInUsersResponse.total) {
      console.log('\n⚠️  WARNING: Mismatch detected!');
      console.log(`   WORKERS collection: ${workersResponse.total}`);
      console.log(`   USERS with role=worker: ${workersInUsersResponse.total}`);
      console.log('   Some workers may not have corresponding user accounts or vice versa.');
    } else {
      console.log('\n✅ Worker counts match between WORKERS and USERS collections');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCounts();
