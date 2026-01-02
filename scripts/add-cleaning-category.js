/**
 * Script to add "cleaning" category to all workers who have "home_maintenance" but not "cleaning"
 */

require('dotenv').config();
const { Client, Databases } = require('node-appwrite');

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const WORKERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID;

async function addCleaningCategory() {
  console.log('🔄 Adding "cleaning" category to workers with "home_maintenance"...\n');

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

    console.log(`Found ${workers.documents.length} total workers\n`);

    let updatedCount = 0;

    for (const worker of workers.documents) {
      const categories = worker.categories || [];
      const hasHomeMaintenance = categories.includes('home_maintenance');
      const hasCleaning = categories.includes('cleaning');

      if (hasHomeMaintenance && !hasCleaning) {
        console.log(`📝 Updating worker: ${worker.displayName || worker.$id}`);
        console.log(`   Current categories: ${JSON.stringify(categories)}`);

        const newCategories = [...categories, 'cleaning'];

        await databases.updateDocument(
          DATABASE_ID,
          WORKERS_COLLECTION_ID,
          worker.$id,
          { categories: newCategories }
        );

        console.log(`   ✅ Updated to: ${JSON.stringify(newCategories)}\n`);
        updatedCount++;
      }
    }

    console.log(`\n🎉 Done! Updated ${updatedCount} workers.`);
    console.log('✅ These workers can now see both "home_maintenance" and "cleaning" jobs!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addCleaningCategory();
