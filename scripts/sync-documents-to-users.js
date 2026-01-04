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
 * Syncs verification documents from WORKERS collection to USERS collection
 * This ensures the admin page can display documents from either collection
 */
async function syncDocumentsToUsers() {
  console.log('🔄 Syncing verification documents from WORKERS to USERS collection...\n');

  // Fetch all worker profiles that have documents
  let allWorkers = [];
  let offset = 0;
  const limit = 100;

  console.log('📥 Fetching all worker profiles with documents...');
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

  console.log(`✅ Found ${allWorkers.length} worker profiles\n`);

  // Filter workers that have at least one document
  const workersWithDocs = allWorkers.filter(w =>
    w.idDocument || w.selfieWithId || w.additionalDocuments
  );

  console.log(`📄 ${workersWithDocs.length} workers have documents uploaded\n`);

  if (workersWithDocs.length === 0) {
    console.log('✅ No documents to sync!\n');
    return;
  }

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                   SYNCING DOCUMENTS                           ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const worker of workersWithDocs) {
    const userId = worker.userId;
    const workerName = worker.displayName || worker.firstName || 'Unknown';

    if (!userId) {
      console.log(`⚠️  Skipping ${workerName} - no userId field`);
      skipped++;
      continue;
    }

    try {
      // Verify user exists
      const user = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        COLLECTIONS.USERS,
        userId
      );

      // Prepare document data to sync
      const documentData = {};

      if (worker.idType) documentData.idType = worker.idType;
      if (worker.idNumber) documentData.idNumber = worker.idNumber;
      if (worker.idDocument) documentData.idDocument = worker.idDocument;
      if (worker.selfieWithId) documentData.selfieWithId = worker.selfieWithId;
      if (worker.additionalDocuments) documentData.additionalDocuments = worker.additionalDocuments;

      // Both collections now use same status values: pending | approved | denied
      if (worker.verificationStatus) {
        documentData.verificationStatus = worker.verificationStatus;
      }

      // Only update if there's data to sync
      if (Object.keys(documentData).length === 0) {
        console.log(`⏭️  ${workerName} - No document fields to sync`);
        skipped++;
        continue;
      }

      // Update USERS collection with document data
      await databases.updateDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        COLLECTIONS.USERS,
        userId,
        documentData
      );

      console.log(`✅ ${workerName} - Synced ${Object.keys(documentData).length} fields`);
      synced++;

    } catch (error) {
      console.log(`❌ ${workerName} - Error: ${error.message}`);
      errors++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                     SYNC COMPLETE                             ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`✅ Successfully synced:  ${synced}`);
  console.log(`⏭️  Skipped:             ${skipped}`);
  console.log(`❌ Errors:               ${errors}`);
  console.log(`📊 Total processed:      ${workersWithDocs.length}\n`);
}

async function main() {
  try {
    await syncDocumentsToUsers();
  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

main();
