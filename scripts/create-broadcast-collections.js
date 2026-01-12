// Load environment variables FIRST
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client, Databases, Permission, Role, ID } = require('node-appwrite');

const serverClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(serverClient);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

async function createBroadcastCollections() {
  try {
    console.log('🚀 Creating Appwrite collections for broadcast messaging...\n');

    // ============================================
    // COLLECTION 1: BROADCAST_MESSAGES (History)
    // ============================================
    console.log('📝 Creating BROADCAST_MESSAGES collection...');

    let broadcastMessagesCollection;
    try {
      broadcastMessagesCollection = await databases.createCollection(
        DATABASE_ID,
        'broadcast_messages', // Collection ID
        'Broadcast Messages', // Collection Name
        [
          Permission.read(Role.any()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ]
      );
      console.log('✅ BROADCAST_MESSAGES collection created:', broadcastMessagesCollection.$id);
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  BROADCAST_MESSAGES collection already exists');
        broadcastMessagesCollection = { $id: 'broadcast_messages' };
      } else {
        throw error;
      }
    }

    // Add attributes to BROADCAST_MESSAGES
    console.log('\n📋 Adding attributes to BROADCAST_MESSAGES...');

    const broadcastAttributes = [
      { key: 'adminId', type: 'string', size: 255, required: true },
      { key: 'title', type: 'string', size: 500, required: true },
      { key: 'content', type: 'string', size: 10000, required: true },
      { key: 'htmlContent', type: 'string', size: 10000, required: false }, // Optional to avoid limit
      { key: 'channels', type: 'string', size: 500, required: true, array: true },
      { key: 'targetRole', type: 'string', size: 50, required: true },
      { key: 'filters', type: 'string', size: 2000, required: false },
      { key: 'recipientCount', type: 'integer', required: false, default: 0 },
      { key: 'emailsSent', type: 'integer', required: false, default: 0 },
      { key: 'smsSent', type: 'integer', required: false, default: 0 },
      { key: 'inAppSent', type: 'integer', required: false, default: 0 },
      { key: 'emailsFailed', type: 'integer', required: false, default: 0 },
      { key: 'smsFailed', type: 'integer', required: false, default: 0 },
      { key: 'estimatedCost', type: 'float', required: false, default: 0 },
      { key: 'status', type: 'string', size: 50, required: true },
      { key: 'sentAt', type: 'datetime', required: true },
    ];

    for (const attr of broadcastAttributes) {
      try {
        if (attr.type === 'string') {
          if (attr.array) {
            await databases.createStringAttribute(
              DATABASE_ID,
              broadcastMessagesCollection.$id,
              attr.key,
              attr.size,
              attr.required,
              null,
              true // array
            );
          } else {
            await databases.createStringAttribute(
              DATABASE_ID,
              broadcastMessagesCollection.$id,
              attr.key,
              attr.size,
              attr.required
            );
          }
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            DATABASE_ID,
            broadcastMessagesCollection.$id,
            attr.key,
            attr.required,
            0, // min
            999999, // max
            attr.default // default value
          );
        } else if (attr.type === 'float') {
          await databases.createFloatAttribute(
            DATABASE_ID,
            broadcastMessagesCollection.$id,
            attr.key,
            attr.required,
            0, // min
            999999.99, // max
            attr.default // default value
          );
        } else if (attr.type === 'datetime') {
          await databases.createDatetimeAttribute(
            DATABASE_ID,
            broadcastMessagesCollection.$id,
            attr.key,
            attr.required
          );
        }
        console.log(`  ✅ Added attribute: ${attr.key} (${attr.type})`);
      } catch (error) {
        if (error.code === 409) {
          console.log(`  ℹ️  Attribute ${attr.key} already exists`);
        } else {
          console.error(`  ❌ Failed to add ${attr.key}:`, error.message);
        }
      }
    }

    // ============================================
    // COLLECTION 2: BROADCAST_TEMPLATES
    // ============================================
    console.log('\n📝 Creating BROADCAST_TEMPLATES collection...');

    let broadcastTemplatesCollection;
    try {
      broadcastTemplatesCollection = await databases.createCollection(
        DATABASE_ID,
        'broadcast_templates', // Collection ID
        'Broadcast Templates', // Collection Name
        [
          Permission.read(Role.any()),
          Permission.create(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ]
      );
      console.log('✅ BROADCAST_TEMPLATES collection created:', broadcastTemplatesCollection.$id);
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  BROADCAST_TEMPLATES collection already exists');
        broadcastTemplatesCollection = { $id: 'broadcast_templates' };
      } else {
        throw error;
      }
    }

    // Add attributes to BROADCAST_TEMPLATES
    console.log('\n📋 Adding attributes to BROADCAST_TEMPLATES...');

    const templateAttributes = [
      { key: 'adminId', type: 'string', size: 255, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'title', type: 'string', size: 500, required: true },
      { key: 'content', type: 'string', size: 10000, required: true },
      { key: 'htmlContent', type: 'string', size: 10000, required: false }, // Optional to avoid limit
      { key: 'category', type: 'string', size: 50, required: true },
    ];

    for (const attr of templateAttributes) {
      try {
        await databases.createStringAttribute(
          DATABASE_ID,
          broadcastTemplatesCollection.$id,
          attr.key,
          attr.size,
          attr.required
        );
        console.log(`  ✅ Added attribute: ${attr.key}`);
      } catch (error) {
        if (error.code === 409) {
          console.log(`  ℹ️  Attribute ${attr.key} already exists`);
        } else {
          console.error(`  ❌ Failed to add ${attr.key}:`, error.message);
        }
      }
    }

    // ============================================
    // CREATE INDEXES
    // ============================================
    console.log('\n🔍 Creating indexes...');

    // Indexes for BROADCAST_MESSAGES
    try {
      await databases.createIndex(
        DATABASE_ID,
        broadcastMessagesCollection.$id,
        'adminId_index',
        'key',
        ['adminId'],
        ['ASC']
      );
      console.log('  ✅ Created index: adminId_index');
    } catch (error) {
      if (error.code === 409) {
        console.log('  ℹ️  Index adminId_index already exists');
      }
    }

    try {
      await databases.createIndex(
        DATABASE_ID,
        broadcastMessagesCollection.$id,
        'sentAt_index',
        'key',
        ['sentAt'],
        ['DESC']
      );
      console.log('  ✅ Created index: sentAt_index');
    } catch (error) {
      if (error.code === 409) {
        console.log('  ℹ️  Index sentAt_index already exists');
      }
    }

    // Indexes for BROADCAST_TEMPLATES
    try {
      await databases.createIndex(
        DATABASE_ID,
        broadcastTemplatesCollection.$id,
        'adminId_template_index',
        'key',
        ['adminId'],
        ['ASC']
      );
      console.log('  ✅ Created index: adminId_template_index');
    } catch (error) {
      if (error.code === 409) {
        console.log('  ℹ️  Index adminId_template_index already exists');
      }
    }

    console.log('\n✅ ========================================');
    console.log('✅ Broadcast collections setup complete!');
    console.log('✅ ========================================\n');

    console.log('📌 Collection IDs to add to your .env:');
    console.log(`NEXT_PUBLIC_APPWRITE_BROADCAST_MESSAGES_COLLECTION_ID=${broadcastMessagesCollection.$id}`);
    console.log(`NEXT_PUBLIC_APPWRITE_BROADCAST_TEMPLATES_COLLECTION_ID=${broadcastTemplatesCollection.$id}`);

    console.log('\n📌 Add these to lib/appwrite.ts COLLECTIONS:');
    console.log(`  BROADCAST_MESSAGES: '${broadcastMessagesCollection.$id}',`);
    console.log(`  BROADCAST_TEMPLATES: '${broadcastTemplatesCollection.$id}',`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
createBroadcastCollections();
