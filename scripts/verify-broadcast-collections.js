// Verify existing collections have required attributes for broadcast system
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client, Databases } = require('node-appwrite');

const serverClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(serverClient);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

const COLLECTIONS = {
  USERS: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
  WORKERS: process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID,
  NOTIFICATIONS: process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID,
};

async function verifyCollections() {
  console.log('🔍 Verifying Appwrite collections for broadcast compatibility...\n');

  const results = {
    users: { required: [], missing: [], optional: [] },
    workers: { required: [], missing: [], optional: [] },
    notifications: { required: [], missing: [], optional: [] },
  };

  // ============================================
  // 1. VERIFY USERS COLLECTION
  // ============================================
  console.log('📋 Checking USERS collection...');

  const usersRequired = {
    email: 'string',
    phone: 'string',
    role: 'string', // enum stored as string
    status: 'string', // enum stored as string
  };

  try {
    const usersCollection = await databases.getCollection(DATABASE_ID, COLLECTIONS.USERS);
    const usersAttributes = usersCollection.attributes || [];

    console.log(`   Found ${usersAttributes.length} attributes in USERS collection`);

    for (const [field, type] of Object.entries(usersRequired)) {
      const attr = usersAttributes.find(a => a.key === field);
      if (attr) {
        results.users.required.push(`✅ ${field} (${attr.type})`);
      } else {
        results.users.missing.push(`❌ ${field} (${type}) - MISSING`);
      }
    }

    // System fields (always present)
    console.log('   ✅ $id (system field)');
    console.log('   ✅ $createdAt (system field)');

  } catch (error) {
    console.error('   ❌ Error checking USERS collection:', error.message);
    results.users.missing.push('ERROR: Could not access USERS collection');
  }

  // ============================================
  // 2. VERIFY WORKERS COLLECTION
  // ============================================
  console.log('\n📋 Checking WORKERS collection...');

  const workersRequired = {
    userId: 'string',
    verificationStatus: 'string', // enum
  };

  const workersOptional = {
    isVerified: 'boolean',
    isActive: 'boolean',
  };

  try {
    const workersCollection = await databases.getCollection(DATABASE_ID, COLLECTIONS.WORKERS);
    const workersAttributes = workersCollection.attributes || [];

    console.log(`   Found ${workersAttributes.length} attributes in WORKERS collection`);

    for (const [field, type] of Object.entries(workersRequired)) {
      const attr = workersAttributes.find(a => a.key === field);
      if (attr) {
        results.workers.required.push(`✅ ${field} (${attr.type})`);
      } else {
        results.workers.missing.push(`❌ ${field} (${type}) - MISSING`);
      }
    }

    for (const [field, type] of Object.entries(workersOptional)) {
      const attr = workersAttributes.find(a => a.key === field);
      if (attr) {
        results.workers.optional.push(`✅ ${field} (${attr.type})`);
      } else {
        results.workers.optional.push(`⚠️  ${field} (${type}) - Optional, not present`);
      }
    }

  } catch (error) {
    console.error('   ❌ Error checking WORKERS collection:', error.message);
    results.workers.missing.push('ERROR: Could not access WORKERS collection');
  }

  // ============================================
  // 3. VERIFY NOTIFICATIONS COLLECTION
  // ============================================
  console.log('\n📋 Checking NOTIFICATIONS collection...');

  const notificationsRequired = {
    userId: 'string',
    title: 'string',
    message: 'string',
    type: 'string', // enum
    isRead: 'boolean',
    createdAt: 'string',
  };

  const notificationsOptional = {
    idempotencyKey: 'string',
    actionUrl: 'string',
    bookingId: 'string',
  };

  try {
    const notificationsCollection = await databases.getCollection(DATABASE_ID, COLLECTIONS.NOTIFICATIONS);
    const notificationsAttributes = notificationsCollection.attributes || [];

    console.log(`   Found ${notificationsAttributes.length} attributes in NOTIFICATIONS collection`);

    for (const [field, type] of Object.entries(notificationsRequired)) {
      const attr = notificationsAttributes.find(a => a.key === field);
      if (attr) {
        results.notifications.required.push(`✅ ${field} (${attr.type})`);
      } else {
        results.notifications.missing.push(`❌ ${field} (${type}) - MISSING`);
      }
    }

    for (const [field, type] of Object.entries(notificationsOptional)) {
      const attr = notificationsAttributes.find(a => a.key === field);
      if (attr) {
        results.notifications.optional.push(`✅ ${field} (${attr.type})`);
      } else {
        results.notifications.optional.push(`⚠️  ${field} (${type}) - Optional, not present`);
      }
    }

  } catch (error) {
    console.error('   ❌ Error checking NOTIFICATIONS collection:', error.message);
    results.notifications.missing.push('ERROR: Could not access NOTIFICATIONS collection');
  }

  // ============================================
  // PRINT RESULTS
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION RESULTS');
  console.log('='.repeat(60));

  console.log('\n📊 USERS Collection:');
  results.users.required.forEach(r => console.log('   ' + r));
  results.users.missing.forEach(m => console.log('   ' + m));

  console.log('\n📊 WORKERS Collection:');
  results.workers.required.forEach(r => console.log('   ' + r));
  results.workers.optional.forEach(o => console.log('   ' + o));
  results.workers.missing.forEach(m => console.log('   ' + m));

  console.log('\n📊 NOTIFICATIONS Collection:');
  results.notifications.required.forEach(r => console.log('   ' + r));
  results.notifications.optional.forEach(o => console.log('   ' + o));
  results.notifications.missing.forEach(m => console.log('   ' + m));

  // ============================================
  // OVERALL STATUS
  // ============================================
  const totalMissing =
    results.users.missing.length +
    results.workers.missing.length +
    results.notifications.missing.length;

  console.log('\n' + '='.repeat(60));
  if (totalMissing === 0) {
    console.log('✅ ALL REQUIRED ATTRIBUTES PRESENT');
    console.log('✅ Broadcast system is ready to use!');
  } else {
    console.log(`⚠️  ${totalMissing} MISSING ATTRIBUTES FOUND`);
    console.log('⚠️  Broadcast system may not work correctly');
    console.log('\n📝 Next steps:');
    console.log('   1. Add missing attributes in Appwrite Console');
    console.log('   2. Or run attribute creation script for each collection');
  }
  console.log('='.repeat(60) + '\n');

  // ============================================
  // RECOMMENDATIONS
  // ============================================
  if (totalMissing > 0) {
    console.log('\n💡 RECOMMENDATIONS:\n');

    if (results.users.missing.length > 0) {
      console.log('🔧 For USERS collection, you may need to:');
      results.users.missing.forEach(m => {
        const field = m.match(/❌ (\w+)/)[1];
        console.log(`   - Add "${field}" attribute via Appwrite Console`);
      });
      console.log('');
    }

    if (results.workers.missing.length > 0) {
      console.log('🔧 For WORKERS collection, you may need to:');
      results.workers.missing.forEach(m => {
        if (m.includes('❌')) {
          const field = m.match(/❌ (\w+)/)[1];
          console.log(`   - Add "${field}" attribute via Appwrite Console`);
        }
      });
      console.log('');
    }

    if (results.notifications.missing.length > 0) {
      console.log('🔧 For NOTIFICATIONS collection, you may need to:');
      results.notifications.missing.forEach(m => {
        if (m.includes('❌')) {
          const field = m.match(/❌ (\w+)/)[1];
          console.log(`   - Add "${field}" attribute via Appwrite Console`);
        }
      });
      console.log('');
    }
  }
}

// Run verification
verifyCollections().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
