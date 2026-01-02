/**
 * Script to list all workers
 */

require('dotenv').config();
const { Client, Databases } = require('node-appwrite');

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const WORKERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID;

async function listWorkers() {
  console.log('🔍 Fetching all workers...\n');

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    const workers = await databases.listDocuments(
      DATABASE_ID,
      WORKERS_COLLECTION_ID
    );

    console.log(`Found ${workers.documents.length} workers:\n`);

    workers.documents.forEach((worker, index) => {
      console.log(`${index + 1}. Worker ID: ${worker.$id}`);
      console.log(`   User ID: ${worker.userId}`);
      console.log(`   Categories: ${JSON.stringify(worker.categories || [])}`);
      console.log(`   Display Name: ${worker.displayName || 'N/A'}`);
      console.log('');
    });

    console.log('\n💡 To update a worker, run:');
    console.log('node scripts/update-worker-categories.js <userId> "cleaning,home_maintenance,delivery"');

  } catch (error) {
    console.error('❌ Error listing workers:', error.message);
    process.exit(1);
  }
}

listWorkers();
