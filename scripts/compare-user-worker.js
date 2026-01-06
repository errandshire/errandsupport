require('dotenv').config({ path: '.env' });
const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const COLLECTIONS = {
  USERS: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
  WORKERS: process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID
};

async function compareUserAndWorker() {
  console.log('🔍 Comparing USERS and WORKERS records...\n');

  // Fetch USERS record
  const userId1 = '69515c050027ac8246f7';
  const userId2 = '694db448001f481c1f9d';

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    USERS COLLECTION                           ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const user1 = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.USERS,
      userId1
    );

    console.log('User Record (userId: 69515c050027ac8246f7):');
    console.log(JSON.stringify(user1, null, 2));

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                  WORKERS COLLECTION                           ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Try to find worker with userId2
    const worker = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.WORKERS,
      '694db67c002d4a1148d5' // The worker document ID from your screenshot
    );

    console.log('Worker Record (userId: 694db448001f481c1f9d):');
    console.log(JSON.stringify(worker, null, 2));

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                    FIELD COMPARISON                           ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Compare all fields
    const similarities = [];
    const differences = [];

    // Check common fields
    const fieldsToCheck = [
      'email', 'phone', 'phoneNumber', 'name', 'firstName', 'lastName',
      'displayName', 'bio', 'address', 'city', 'state', 'country',
      'postalCode', 'dateOfBirth', '$createdAt', '$updatedAt',
      'locationLat', 'locationLng', 'profileImage', 'coverImage'
    ];

    for (const field of fieldsToCheck) {
      const userValue = user1[field];
      const workerValue = worker[field];

      if (userValue !== undefined || workerValue !== undefined) {
        if (userValue === workerValue && userValue) {
          similarities.push({
            field,
            value: userValue
          });
        } else if (userValue || workerValue) {
          differences.push({
            field,
            userValue: userValue || '(not set)',
            workerValue: workerValue || '(not set)'
          });
        }
      }
    }

    console.log('✅ MATCHING FIELDS:\n');
    if (similarities.length > 0) {
      similarities.forEach(({ field, value }) => {
        console.log(`   ${field}: ${value}`);
      });
    } else {
      console.log('   ❌ No matching fields found!\n');
    }

    console.log('\n⚠️  DIFFERENT FIELDS:\n');
    differences.forEach(({ field, userValue, workerValue }) => {
      console.log(`   ${field}:`);
      console.log(`      USERS:   ${userValue}`);
      console.log(`      WORKERS: ${workerValue}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                     TIMESTAMPS                                ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const userCreated = new Date(user1.$createdAt);
    const workerCreated = new Date(worker.$createdAt);
    const timeDiff = Math.abs(workerCreated - userCreated) / 1000; // seconds

    console.log(`   USERS created:   ${userCreated.toISOString()}`);
    console.log(`   WORKERS created: ${workerCreated.toISOString()}`);
    console.log(`   Time difference: ${timeDiff} seconds (${(timeDiff / 60).toFixed(2)} minutes)\n`);

    if (timeDiff < 600) { // Less than 10 minutes
      console.log('   ✅ Records created within 10 minutes - likely same registration session!\n');
    }

    // Check if user2 exists in USERS
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('            CHECKING WORKER\'S USERID IN USERS                  ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
      const user2 = await databases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        COLLECTIONS.USERS,
        userId2
      );
      console.log(`✅ User with ID ${userId2} EXISTS in USERS collection:`);
      console.log(`   Email: ${user2.email || 'N/A'}`);
      console.log(`   Phone: ${user2.phone || user2.phoneNumber || 'N/A'}`);
      console.log(`   Name: ${user2.name || user2.firstName + ' ' + user2.lastName || 'N/A'}`);
      console.log(`   Role: ${user2.role || 'N/A'}`);
      console.log('\n   ⚠️  This means we have DUPLICATE user accounts!\n');
    } catch (error) {
      console.log(`❌ No user found with ID ${userId2} in USERS collection`);
      console.log('   This userId only exists in WORKERS collection\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

compareUserAndWorker();
