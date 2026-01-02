/**
 * Script to add "cleaning" category to ALL workers who don't have it
 */

require('dotenv').config();
const { Client, Databases } = require('node-appwrite');

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const WORKERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID;

async function addCleaningToAll() {
  console.log('🔄 Adding "cleaning" category to ALL workers...\n');

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
    let skippedCount = 0;

    for (const worker of workers.documents) {
      const categories = worker.categories || [];
      const hasCleaning = categories.includes('cleaning');

      if (!hasCleaning) {
        console.log(`📝 Updating: ${worker.displayName || worker.$id}`);
        console.log(`   Before: ${JSON.stringify(categories)}`);

        const newCategories = [...categories, 'cleaning'];

        await databases.updateDocument(
          DATABASE_ID,
          WORKERS_COLLECTION_ID,
          worker.$id,
          { categories: newCategories }
        );

        console.log(`   After: ${JSON.stringify(newCategories)}\n`);
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`\n✅ Done!`);
    console.log(`   Updated: ${updatedCount} workers`);
    console.log(`   Skipped: ${skippedCount} workers (already had cleaning)`);
    console.log('\n🎉 ALL workers can now see "cleaning" jobs!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addCleaningToAll();
