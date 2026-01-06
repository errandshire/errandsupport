const { Client, Databases, ID } = require('node-appwrite');
require('dotenv').config({ path: '.env' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_JOB_APPLICATIONS_COLLECTION_ID;

async function setupCollection() {
  console.log('🚀 Setting up JOB_APPLICATIONS collection...\n');

  try {
    // Step 1: Create the collection
    console.log('📦 Creating collection...');
    try {
      await databases.createCollection(
        DATABASE_ID,
        COLLECTION_ID,
        'JOB_APPLICATIONS',
        [
          // Permissions - adjust as needed
          // For now, any authenticated user can read/write their own applications
        ],
        true, // Document security enabled
        true  // Enabled
      );
      console.log('✅ Collection created successfully!\n');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  Collection already exists, updating attributes...\n');
      } else {
        throw error;
      }
    }

    // Step 2: Create attributes
    console.log('📝 Creating attributes...\n');

    const attributes = [
      {
        key: 'jobId',
        type: 'string',
        size: 50,
        required: true,
        description: 'ID of the job this application is for'
      },
      {
        key: 'workerId',
        type: 'string',
        size: 50,
        required: true,
        description: 'ID of the worker applying'
      },
      {
        key: 'clientId',
        type: 'string',
        size: 50,
        required: true,
        description: 'ID of the client who posted the job'
      },
      {
        key: 'status',
        type: 'enum',
        elements: ['pending', 'selected', 'rejected', 'withdrawn'],
        required: true,
        description: 'Status of the application'
      },
      {
        key: 'message',
        type: 'string',
        size: 500,
        required: false,
        description: 'Optional message/pitch from worker'
      },
      {
        key: 'appliedAt',
        type: 'datetime',
        required: true,
        description: 'When the worker applied'
      },
      {
        key: 'selectedAt',
        type: 'datetime',
        required: false,
        description: 'When this application was selected by client'
      },
      {
        key: 'rejectedAt',
        type: 'datetime',
        required: false,
        description: 'When this application was rejected'
      }
    ];

    for (const attr of attributes) {
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            attr.key,
            attr.size,
            attr.required
          );
        } else if (attr.type === 'enum') {
          await databases.createEnumAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            attr.key,
            attr.elements,
            attr.required
          );
        } else if (attr.type === 'datetime') {
          await databases.createDatetimeAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            attr.key,
            attr.required
          );
        }
        console.log(`  ✅ Created attribute: ${attr.key} (${attr.type})`);
      } catch (error) {
        if (error.code === 409) {
          console.log(`  ⏭️  Attribute already exists: ${attr.key}`);
        } else {
          console.error(`  ❌ Failed to create ${attr.key}:`, error.message);
        }
      }
    }

    // Wait for attributes to be available
    console.log('\n⏳ Waiting 5 seconds for attributes to be processed...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 3: Create indexes
    console.log('\n📑 Creating indexes...\n');

    const indexes = [
      {
        key: 'jobId_index',
        type: 'key',
        attributes: ['jobId'],
        orders: ['ASC']
      },
      {
        key: 'workerId_index',
        type: 'key',
        attributes: ['workerId'],
        orders: ['ASC']
      },
      {
        key: 'clientId_index',
        type: 'key',
        attributes: ['clientId'],
        orders: ['ASC']
      },
      {
        key: 'status_index',
        type: 'key',
        attributes: ['status'],
        orders: ['ASC']
      },
      {
        key: 'appliedAt_index',
        type: 'key',
        attributes: ['appliedAt'],
        orders: ['DESC']
      },
      {
        key: 'jobId_status_index',
        type: 'key',
        attributes: ['jobId', 'status'],
        orders: ['ASC', 'ASC']
      }
    ];

    for (const index of indexes) {
      try {
        await databases.createIndex(
          DATABASE_ID,
          COLLECTION_ID,
          index.key,
          index.type,
          index.attributes,
          index.orders
        );
        console.log(`  ✅ Created index: ${index.key}`);
      } catch (error) {
        if (error.code === 409) {
          console.log(`  ⏭️  Index already exists: ${index.key}`);
        } else {
          console.error(`  ❌ Failed to create ${index.key}:`, error.message);
        }
      }
    }

    console.log('\n✨ JOB_APPLICATIONS collection setup complete!\n');
    console.log('📋 Summary:');
    console.log(`   Database ID: ${DATABASE_ID}`);
    console.log(`   Collection ID: ${COLLECTION_ID}`);
    console.log(`   Attributes: ${attributes.length}`);
    console.log(`   Indexes: ${indexes.length}`);

  } catch (error) {
    console.error('❌ Error setting up collection:', error);
    throw error;
  }
}

// Run the setup
setupCollection()
  .then(() => {
    console.log('\n✅ Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
