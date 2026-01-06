require('dotenv').config({ path: '.env' });
const { Client, Databases, Query } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

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
 * Backup USERS and WORKERS collections to JSON files
 * Creates timestamped backup files for recovery if needed
 */
async function backupCollections() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, 'backups');

  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('🗄️  BACKUP COLLECTIONS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`Timestamp: ${new Date().toLocaleString()}`);
  console.log(`Backup directory: ${backupDir}\n`);

  try {
    // Backup USERS (only workers)
    console.log('📥 Backing up USERS collection (role=worker)...');
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

    const usersBackupFile = path.join(backupDir, `users-workers-${timestamp}.json`);
    fs.writeFileSync(usersBackupFile, JSON.stringify(allWorkerUsers, null, 2));
    console.log(`✅ Backed up ${allWorkerUsers.length} worker users to:`);
    console.log(`   ${usersBackupFile}\n`);

    // Backup WORKERS
    console.log('📥 Backing up WORKERS collection...');
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

    const workersBackupFile = path.join(backupDir, `workers-${timestamp}.json`);
    fs.writeFileSync(workersBackupFile, JSON.stringify(allWorkers, null, 2));
    console.log(`✅ Backed up ${allWorkers.length} workers to:`);
    console.log(`   ${workersBackupFile}\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    BACKUP COMPLETE                            ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📊 Summary:');
    console.log(`   Worker users: ${allWorkerUsers.length}`);
    console.log(`   Workers:      ${allWorkers.length}`);
    console.log(`   Timestamp:    ${timestamp}\n`);

    console.log('📁 Backup files:');
    console.log(`   1. ${path.basename(usersBackupFile)}`);
    console.log(`   2. ${path.basename(workersBackupFile)}\n`);

    console.log('✅ Backups saved successfully!');
    console.log('   You can restore from these files if needed.\n');

    return {
      usersBackupFile,
      workersBackupFile,
      timestamp,
      workerUsersCount: allWorkerUsers.length,
      workersCount: allWorkers.length
    };

  } catch (error) {
    console.error('❌ Error during backup:', error.message);
    console.error(error);
    throw error;
  }
}

async function main() {
  console.log('⚠️  Creating backup of USERS and WORKERS collections...\n');
  console.log('   This will export all data to JSON files for safety.');
  console.log('   Starting in 2 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 2000));

  const result = await backupCollections();

  console.log('Next steps:');
  console.log('   1. Review backup files to ensure data integrity');
  console.log('   2. Run migration script: node scripts/migrate-worker-data.js');
  console.log('   3. Keep backups safe until migration is verified\n');
}

main();
