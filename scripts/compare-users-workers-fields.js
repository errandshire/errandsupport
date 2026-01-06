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
 * Compare fields in USERS vs WORKERS collections
 * Identify fields that exist in USERS but might not be in WORKERS
 */
async function compareFields() {
  console.log('🔍 Comparing USERS and WORKERS Collection Fields\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Fetch sample worker from USERS
    const usersResponse = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.USERS,
      [Query.equal('role', 'worker'), Query.limit(5)]
    );

    // Fetch sample worker from WORKERS
    const workersResponse = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.WORKERS,
      [Query.limit(5)]
    );

    if (usersResponse.documents.length === 0 || workersResponse.documents.length === 0) {
      console.log('❌ No sample documents found');
      return;
    }

    const sampleUser = usersResponse.documents[0];
    const sampleWorker = workersResponse.documents[0];

    // Get all fields from both collections
    const userFields = Object.keys(sampleUser).filter(key => !key.startsWith('$'));
    const workerFields = Object.keys(sampleWorker).filter(key => !key.startsWith('$'));

    console.log('📊 USERS Collection Fields (worker role):');
    console.log(`   Total fields: ${userFields.length}\n`);

    // Categorize fields
    const sharedFields = ['email', 'phone', 'name', 'role', 'avatar', 'profileImage'];
    const systemFields = ['$id', '$createdAt', '$updatedAt', '$permissions', '$collectionId', '$databaseId'];

    const fieldsInUsers = {};
    userFields.forEach(field => {
      const value = sampleUser[field];
      const hasValue = value !== null && value !== undefined && value !== '';
      fieldsInUsers[field] = {
        type: Array.isArray(value) ? 'array' : typeof value,
        hasValue,
        value: hasValue ? (typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value) : null,
        inWorkers: workerFields.includes(field)
      };
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                  FIELD COMPARISON                             ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Group 1: Shared fields (should be in both)
    console.log('1️⃣  SHARED FIELDS (Basic info - should be in both):');
    console.log('   These are basic fields needed for display\n');

    sharedFields.forEach(field => {
      if (field in fieldsInUsers) {
        const status = fieldsInUsers[field].inWorkers ? '✅' : '❌';
        const valueInfo = fieldsInUsers[field].hasValue ? '(has data)' : '(empty)';
        console.log(`   ${status} ${field.padEnd(20)} ${valueInfo.padEnd(15)} ${fieldsInUsers[field].inWorkers ? 'IN WORKERS' : 'NOT in WORKERS'}`);
      }
    });
    console.log('');

    // Group 2: Verification fields
    console.log('2️⃣  VERIFICATION FIELDS (Should be in WORKERS only):');
    console.log('   These are worker-specific verification data\n');

    const verificationFields = ['idType', 'idNumber', 'idDocument', 'selfieWithId', 'additionalDocuments', 'verificationStatus', 'isVerified'];
    verificationFields.forEach(field => {
      if (field in fieldsInUsers) {
        const status = fieldsInUsers[field].inWorkers ? '✅' : '❌';
        const valueInfo = fieldsInUsers[field].hasValue ? '(has data)' : '(empty)';
        console.log(`   ${status} ${field.padEnd(25)} ${valueInfo.padEnd(15)} ${fieldsInUsers[field].inWorkers ? 'IN WORKERS' : 'NOT in WORKERS'}`);
      }
    });
    console.log('');

    // Group 3: Other fields in USERS but not in WORKERS
    console.log('3️⃣  OTHER FIELDS IN USERS:');
    console.log('   Fields that exist in USERS but not checked above\n');

    const checkedFields = [...sharedFields, ...verificationFields];
    const otherFields = Object.keys(fieldsInUsers).filter(f => !checkedFields.includes(f));

    if (otherFields.length > 0) {
      otherFields.forEach(field => {
        const info = fieldsInUsers[field];
        const status = info.inWorkers ? '✅' : '❌';
        const valueInfo = info.hasValue ? '(has data)' : '(empty)';
        console.log(`   ${status} ${field.padEnd(25)} ${info.type.padEnd(10)} ${valueInfo.padEnd(15)} ${info.inWorkers ? 'IN WORKERS' : 'NOT in WORKERS'}`);
      });
    } else {
      console.log('   (No other fields found)');
    }
    console.log('');

    // Group 4: Fields in WORKERS but not in USERS
    console.log('4️⃣  WORKER-SPECIFIC FIELDS:');
    console.log('   Fields that exist in WORKERS but not in USERS\n');

    const workerOnlyFields = workerFields.filter(f => !userFields.includes(f));
    workerOnlyFields.slice(0, 20).forEach(field => {
      const value = sampleWorker[field];
      const hasValue = value !== null && value !== undefined && value !== '';
      const valueInfo = hasValue ? '(has data)' : '(empty)';
      console.log(`   ✓ ${field.padEnd(30)} ${valueInfo}`);
    });

    if (workerOnlyFields.length > 20) {
      console.log(`   ... and ${workerOnlyFields.length - 20} more worker-specific fields`);
    }
    console.log('');

    // Summary and recommendations
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                  SUMMARY & RECOMMENDATIONS                    ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const missingInWorkers = Object.keys(fieldsInUsers).filter(f => !fieldsInUsers[f].inWorkers && fieldsInUsers[f].hasValue);

    console.log('📊 Statistics:');
    console.log(`   Fields in USERS:         ${userFields.length}`);
    console.log(`   Fields in WORKERS:       ${workerFields.length}`);
    console.log(`   Worker-specific fields:  ${workerOnlyFields.length}`);
    console.log(`   Fields with data in USERS but missing in WORKERS: ${missingInWorkers.length}\n`);

    if (missingInWorkers.length > 0) {
      console.log('⚠️  FIELDS TO CONSIDER MIGRATING:\n');
      console.log('   These fields have data in USERS but don\'t exist in WORKERS:\n');

      missingInWorkers.forEach(field => {
        const info = fieldsInUsers[field];
        console.log(`   📝 ${field}`);
        console.log(`      Type: ${info.type}`);
        console.log(`      Sample: ${JSON.stringify(info.value)}`);
        console.log('');
      });

      console.log('💡 RECOMMENDATION:\n');
      console.log('   If any of these fields are worker-specific, you should:');
      console.log('   1. Add them to WORKERS collection schema in Appwrite');
      console.log('   2. Run migration to copy data from USERS to WORKERS');
      console.log('   3. Update code to read/write these fields from WORKERS only\n');
    } else {
      console.log('✅ GOOD NEWS: All fields with data in USERS already exist in WORKERS!\n');
      console.log('   Your migration is complete. The architecture refactoring is done.\n');
    }

    console.log('Next steps:');
    console.log('   1. Review the fields listed above');
    console.log('   2. Decide which (if any) need to be in WORKERS');
    console.log('   3. Run custom migration for additional fields if needed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

compareFields();
