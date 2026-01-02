require('dotenv').config();
const { Client, Databases, ID } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const collectionId = process.env.NEXT_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID;

async function updateBookingsCollection() {
  console.log('🔄 Updating BOOKINGS collection for job acceptance...');
  console.log(`📦 Collection ID: ${collectionId}`);

  try {
    // Get existing collection to check attributes
    const collection = await databases.getCollection(databaseId, collectionId);
    console.log('✅ Found BOOKINGS collection');
    console.log(`📋 Current attributes: ${collection.attributes.length}`);

    // List of required attributes for job acceptance
    const requiredAttributes = [
      { key: 'clientId', type: 'string', size: 255, required: true },
      { key: 'workerId', type: 'string', size: 255, required: true },
      { key: 'serviceId', type: 'string', size: 255, required: true },
      { key: 'categoryId', type: 'string', size: 255, required: true },
      { key: 'status', type: 'string', size: 50, required: true },
      { key: 'scheduledDate', type: 'string', size: 50, required: true },
      { key: 'scheduledTime', type: 'string', size: 50, required: true },
      { key: 'duration', type: 'integer', required: true },
      { key: 'totalAmount', type: 'double', required: true },
      { key: 'paymentStatus', type: 'string', size: 50, required: true },
      { key: 'notes', type: 'string', size: 10000, required: false },
      { key: 'createdAt', type: 'string', size: 50, required: false },
      { key: 'updatedAt', type: 'string', size: 50, required: false },
      { key: 'completedAt', type: 'string', size: 50, required: false },
      { key: 'cancelledAt', type: 'string', size: 50, required: false },
      { key: 'cancellationReason', type: 'string', size: 1000, required: false },
      { key: 'cancellationFee', type: 'double', required: false },
      { key: 'clientConfirmed', type: 'boolean', required: false },
      { key: 'workerConfirmed', type: 'boolean', required: false },
      { key: 'completionNote', type: 'string', size: 1000, required: false },
      { key: 'clientRating', type: 'integer', required: false },
      { key: 'clientReview', type: 'string', size: 2000, required: false },
      { key: 'workerRating', type: 'integer', required: false },
      { key: 'workerReview', type: 'string', size: 2000, required: false },

      // Location fields (instead of nested object, use flat structure)
      { key: 'locationAddress', type: 'string', size: 500, required: true },
      { key: 'locationCity', type: 'string', size: 100, required: false },
      { key: 'locationState', type: 'string', size: 100, required: false },
      { key: 'locationPostalCode', type: 'string', size: 20, required: false },
      { key: 'locationCountry', type: 'string', size: 100, required: false },
      { key: 'locationLat', type: 'double', required: false },
      { key: 'locationLng', type: 'double', required: false },
      { key: 'locationInstructions', type: 'string', size: 1000, required: false },
    ];

    // Get existing attribute keys
    const existingKeys = collection.attributes.map(attr => attr.key);
    console.log('📋 Existing attributes:', existingKeys.join(', '));

    // Check which attributes need to be created
    const missingAttributes = requiredAttributes.filter(
      attr => !existingKeys.includes(attr.key)
    );

    if (missingAttributes.length === 0) {
      console.log('✅ All required attributes already exist!');
      return;
    }

    console.log(`\n📝 Creating ${missingAttributes.length} missing attributes:\n`);

    // Create missing attributes
    for (const attr of missingAttributes) {
      try {
        console.log(`   ⏳ Creating: ${attr.key} (${attr.type})...`);

        if (attr.type === 'string') {
          await databases.createStringAttribute(
            databaseId,
            collectionId,
            attr.key,
            attr.size,
            attr.required
          );
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            databaseId,
            collectionId,
            attr.key,
            attr.required
          );
        } else if (attr.type === 'double') {
          await databases.createFloatAttribute(
            databaseId,
            collectionId,
            attr.key,
            attr.required
          );
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(
            databaseId,
            collectionId,
            attr.key,
            attr.required
          );
        }

        console.log(`   ✅ Created: ${attr.key}`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        if (error.code === 409) {
          console.log(`   ⚠️  ${attr.key} already exists (skipping)`);
        } else {
          console.error(`   ❌ Failed to create ${attr.key}:`, error.message);
        }
      }
    }

    // Create indexes for efficient querying
    console.log('\n📇 Creating indexes...');

    const indexes = [
      { key: 'serviceId_index', attributes: ['serviceId'], type: 'key' },
      { key: 'clientId_status_index', attributes: ['clientId', 'status'], type: 'key' },
      { key: 'workerId_status_index', attributes: ['workerId', 'status'], type: 'key' },
    ];

    for (const index of indexes) {
      try {
        console.log(`   ⏳ Creating index: ${index.key}...`);
        await databases.createIndex(
          databaseId,
          collectionId,
          index.key,
          index.type,
          index.attributes
        );
        console.log(`   ✅ Created index: ${index.key}`);
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        if (error.code === 409) {
          console.log(`   ⚠️  Index ${index.key} already exists (skipping)`);
        } else {
          console.error(`   ❌ Failed to create index ${index.key}:`, error.message);
        }
      }
    }

    console.log('\n✅ BOOKINGS collection update complete!');
    console.log('\n💡 Important: The location field is now stored as flat attributes:');
    console.log('   - locationAddress, locationCity, locationState, locationPostalCode');
    console.log('   - locationCountry, locationLat, locationLng, locationInstructions');
    console.log('\n💡 You need to update the job acceptance code to use flat location fields!');

  } catch (error) {
    console.error('❌ Error updating BOOKINGS collection:', error);
    throw error;
  }
}

updateBookingsCollection()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
