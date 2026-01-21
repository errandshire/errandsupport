#!/usr/bin/env node

/**
 * Script to verify and add necessary attributes to REVIEWS collection
 */

// Load environment variables
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

const sdk = require('node-appwrite');

// Initialize SDK
const client = new sdk.Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID;

// Validate environment variables
if (!DATABASE_ID || !COLLECTION_ID) {
  console.error('❌ Missing required environment variables:');
  if (!DATABASE_ID) console.error('   - NEXT_PUBLIC_APPWRITE_DATABASE_ID');
  if (!COLLECTION_ID) console.error('   - NEXT_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID');
  process.exit(1);
}

async function verifyAndAddAttributes() {
  console.log('🔍 Verifying REVIEWS collection attributes...\n');

  const requiredAttributes = [
    {
      key: 'bookingId',
      type: 'string',
      size: 100,
      required: true,
      description: 'ID of the booking being reviewed'
    },
    {
      key: 'clientId',
      type: 'string',
      size: 100,
      required: true,
      description: 'ID of the client who wrote the review'
    },
    {
      key: 'workerId',
      type: 'string',
      size: 100,
      required: true,
      description: 'User ID of the worker being reviewed'
    },
    {
      key: 'rating',
      type: 'integer',
      min: 1,
      max: 5,
      required: true,
      description: 'Rating from 1-5 stars'
    },
    {
      key: 'comment',
      type: 'string',
      size: 5000,
      required: false,
      description: 'Review comment text'
    },
    {
      key: 'isPublic',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Whether the review is publicly visible'
    },
    {
      key: 'createdAt',
      type: 'string',
      size: 50,
      required: true,
      description: 'ISO timestamp when review was created'
    },
    {
      key: 'updatedAt',
      type: 'string',
      size: 50,
      required: false,
      description: 'ISO timestamp when review was last updated'
    }
  ];

  for (const attr of requiredAttributes) {
    try {
      console.log(`📝 Checking attribute: ${attr.key}`);

      if (attr.type === 'string') {
        await databases.createStringAttribute(
          DATABASE_ID,
          COLLECTION_ID,
          attr.key,
          attr.size,
          attr.required,
          attr.default || null
        );
        console.log(`✅ Added: ${attr.key}\n`);
      } else if (attr.type === 'integer') {
        await databases.createIntegerAttribute(
          DATABASE_ID,
          COLLECTION_ID,
          attr.key,
          attr.required,
          attr.min,
          attr.max,
          attr.default || null
        );
        console.log(`✅ Added: ${attr.key}\n`);
      } else if (attr.type === 'boolean') {
        await databases.createBooleanAttribute(
          DATABASE_ID,
          COLLECTION_ID,
          attr.key,
          attr.required,
          attr.default ?? null
        );
        console.log(`✅ Added: ${attr.key}\n`);
      }

      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      if (error.code === 409) {
        console.log(`✓ Attribute '${attr.key}' already exists\n`);
      } else {
        console.error(`❌ Error with attribute '${attr.key}':`, error.message);
        console.error(`   Code: ${error.code}\n`);
      }
    }
  }

  console.log('✨ Verification complete!');
  console.log('\n📋 Summary:');
  console.log('   REVIEWS collection should have:');
  console.log('   - bookingId (string)');
  console.log('   - clientId (string)');
  console.log('   - workerId (string) - User ID of worker');
  console.log('   - rating (integer 1-5)');
  console.log('   - comment (string)');
  console.log('   - isPublic (boolean)');
  console.log('   - createdAt (string)');
  console.log('   - updatedAt (string)');
}

// Run the script
verifyAndAddAttributes()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
