#!/usr/bin/env node

/**
 * Script to add rating attributes to WORKERS collection
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
const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID;

// Validate environment variables
if (!DATABASE_ID || !COLLECTION_ID) {
  console.error('❌ Missing required environment variables:');
  if (!DATABASE_ID) console.error('   - NEXT_PUBLIC_APPWRITE_DATABASE_ID');
  if (!COLLECTION_ID) console.error('   - NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID');
  process.exit(1);
}

async function addAttributes() {
  console.log('🚀 Adding rating attributes to WORKERS collection...\n');

  const attributes = [
    {
      key: 'ratingAverage',
      type: 'float',
      min: 0,
      max: 5,
      required: false,
      default: 0,
      description: 'Average rating from reviews (0-5)'
    },
    {
      key: 'totalReviews',
      type: 'integer',
      min: 0,
      required: false,
      default: 0,
      description: 'Total number of reviews received'
    }
  ];

  for (const attr of attributes) {
    try {
      console.log(`📝 Adding attribute: ${attr.key}`);
      console.log(`   Type: ${attr.type}`);
      console.log(`   Required: ${attr.required}`);
      console.log(`   Default: ${attr.default}`);
      console.log(`   Description: ${attr.description}`);

      if (attr.type === 'float') {
        await databases.createFloatAttribute(
          DATABASE_ID,
          COLLECTION_ID,
          attr.key,
          attr.required,
          attr.min,
          attr.max,
          attr.default
        );
      } else if (attr.type === 'integer') {
        await databases.createIntegerAttribute(
          DATABASE_ID,
          COLLECTION_ID,
          attr.key,
          attr.required,
          attr.min,
          attr.max,
          attr.default
        );
      }

      console.log(`✅ Successfully added: ${attr.key}\n`);

      // Wait a bit between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      if (error.code === 409) {
        console.log(`⚠️  Attribute '${attr.key}' already exists, skipping...\n`);
      } else {
        console.error(`❌ Error adding attribute '${attr.key}':`, error.message);
        console.error(`   Code: ${error.code}`);
        console.error(`   Type: ${error.type}\n`);
      }
    }
  }

  console.log('✨ Finished adding attributes!');
  console.log('\n📋 Summary:');
  console.log('   Added rating attributes to WORKERS collection:');
  console.log('   - ratingAverage (float 0-5)');
  console.log('   - totalReviews (integer)');
}

// Run the script
addAttributes()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
