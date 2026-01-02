/**
 * Script to update worker categories
 * Usage: node scripts/update-worker-categories.js <userId> <categories>
 * Example: node scripts/update-worker-categories.js 6954e67c000b0b0c28caa "cleaning,home_maintenance,delivery"
 */

require('dotenv').config();
const { Client, Databases, Query } = require('node-appwrite');

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const WORKERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID;

async function updateWorkerCategories() {
  // Get userId and categories from command line
  const userId = process.argv[2];
  const categoriesString = process.argv[3];

  if (!userId || !categoriesString) {
    console.error('❌ Usage: node scripts/update-worker-categories.js <userId> <categories>');
    console.log('Example: node scripts/update-worker-categories.js 6954e67c000b0b0c28caa "cleaning,home_maintenance,delivery"');
    process.exit(1);
  }

  const categories = categoriesString.split(',').map(c => c.trim());

  console.log('🔄 Updating worker categories...');
  console.log('👤 User ID:', userId);
  console.log('📂 New Categories:', categories);

  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    // Find worker by userId
    console.log('\n🔍 Finding worker...');
    const workers = await databases.listDocuments(
      DATABASE_ID,
      WORKERS_COLLECTION_ID,
      [Query.equal('userId', userId)]
    );

    if (workers.documents.length === 0) {
      console.error('❌ No worker found with userId:', userId);
      process.exit(1);
    }

    const worker = workers.documents[0];
    console.log('✅ Found worker:', worker.$id);
    console.log('📋 Current categories:', worker.categories || []);

    // Update worker categories
    console.log('\n🔄 Updating categories...');
    const updated = await databases.updateDocument(
      DATABASE_ID,
      WORKERS_COLLECTION_ID,
      worker.$id,
      {
        categories: categories
      }
    );

    console.log('✅ Worker categories updated successfully!');
    console.log('📂 New categories:', updated.categories);
    console.log('\n🎉 Done! The worker can now see jobs from these categories.');

  } catch (error) {
    console.error('❌ Error updating worker:', error.message);
    process.exit(1);
  }
}

updateWorkerCategories();
