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
 * Check what attributes exist in WORKERS collection
 */
async function checkWorkersSchema() {
  console.log('🔍 Checking WORKERS Collection Schema\n');

  try {
    // Fetch a few sample workers
    const workers = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.WORKERS,
      [Query.limit(5)]
    );

    if (workers.documents.length === 0) {
      console.log('No workers found in collection');
      return;
    }

    console.log(`Found ${workers.total} total workers`);
    console.log(`Sample size: ${workers.documents.length}\n`);

    // Get all unique keys from the first document
    const sampleWorker = workers.documents[0];
    const allKeys = Object.keys(sampleWorker).sort();

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                  WORKERS COLLECTION ATTRIBUTES                ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`Sample Worker ID: ${sampleWorker.$id}\n`);

    console.log('All Attributes:');
    allKeys.forEach((key, index) => {
      const value = sampleWorker[key];
      const type = Array.isArray(value) ? 'array' : typeof value;
      const preview = Array.isArray(value)
        ? `[${value.length} items]`
        : type === 'string' && value.length > 50
          ? `"${value.substring(0, 50)}..."`
          : JSON.stringify(value);

      console.log(`   ${index + 1}. ${key.padEnd(25)} ${type.padEnd(10)} ${preview}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                  FIELD AVAILABILITY CHECK                     ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Check specific fields we want to add
    const fieldsToCheck = ['email', 'phone', 'name', 'firstName', 'lastName', 'displayName'];

    console.log('Checking if registration fields exist:\n');
    fieldsToCheck.forEach(field => {
      const exists = field in sampleWorker;
      const hasValue = exists && sampleWorker[field];
      console.log(`   ${field.padEnd(15)} ${exists ? '✅ EXISTS' : '❌ MISSING'}${hasValue ? ` (value: ${JSON.stringify(sampleWorker[field]).substring(0, 30)})` : ''}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                  FIELD POPULATION STATISTICS                  ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Check all workers to see field population
    console.log('Analyzing all workers...\n');

    const stats = {
      total: workers.total,
      withEmail: 0,
      withPhone: 0,
      withName: 0,
      withUserId: 0
    };

    // Fetch all workers in batches
    let allWorkers = [];
    let offset = 0;
    const limit = 100;

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

    allWorkers.forEach(worker => {
      if ('email' in worker && worker.email) stats.withEmail++;
      if ('phone' in worker && worker.phone) stats.withPhone++;
      if ('name' in worker && worker.name) stats.withName++;
      if ('userId' in worker && worker.userId) stats.withUserId++;
    });

    console.log(`Total Workers: ${stats.total}\n`);
    console.log('Field Population:');
    console.log(`   email:    ${stats.withEmail.toString().padStart(4)} / ${stats.total} (${((stats.withEmail / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   phone:    ${stats.withPhone.toString().padStart(4)} / ${stats.total} (${((stats.withPhone / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   name:     ${stats.withName.toString().padStart(4)} / ${stats.total} (${((stats.withName / stats.total) * 100).toFixed(1)}%)`);
    console.log(`   userId:   ${stats.withUserId.toString().padStart(4)} / ${stats.total} (${((stats.withUserId / stats.total) * 100).toFixed(1)}%)`);

    console.log('\n═══════════════════════════════════════════════════════════════\n');

    if (stats.withEmail === 0 && stats.withPhone === 0 && stats.withName === 0) {
      console.log('⚠️  WARNING: email, phone, and name fields appear to be empty in ALL workers!');
      console.log('   This means these fields exist in the schema but have no data.\n');
      console.log('   ✅ Migration can proceed - fields exist in schema\n');
    } else if ('email' in sampleWorker && 'phone' in sampleWorker && 'name' in sampleWorker) {
      console.log('✅ All required fields exist in WORKERS schema');
      console.log('   Migration can proceed to populate these fields\n');
    } else {
      console.log('❌ Some required fields are MISSING from WORKERS schema');
      console.log('   These fields need to be added to the collection in Appwrite Console:\n');
      if (!('email' in sampleWorker)) console.log('   - email (string, required)');
      if (!('phone' in sampleWorker)) console.log('   - phone (string, required)');
      if (!('name' in sampleWorker)) console.log('   - name (string, required)');
      if (!('firstName' in sampleWorker)) console.log('   - firstName (string, optional)');
      if (!('lastName' in sampleWorker)) console.log('   - lastName (string, optional)');
      if (!('displayName' in sampleWorker)) console.log('   - displayName (string, optional)');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

checkWorkersSchema();
