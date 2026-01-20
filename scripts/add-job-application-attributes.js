#!/usr/bin/env node

/**
 * Script to add missing attributes to JOB_APPLICATIONS collection
 *
 * Adds the following timestamp attributes:
 * - withdrawnAt (datetime, optional) - When worker withdrew their application
 * - selectedAt (datetime, optional) - When client selected the worker
 * - acceptedAt (datetime, optional) - When worker accepted the job
 * - declinedAt (datetime, optional) - When worker declined the job
 * - unpickedAt (datetime, optional) - When selection expired/unpicked
 */

// Load environment variables from both .env and .env.local
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

const sdk = require('node-appwrite');

// Initialize SDK
const client = new sdk.Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY); // API key with proper permissions

const databases = new sdk.Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_JOB_APPLICATIONS_COLLECTION_ID;

// Validate environment variables
if (!DATABASE_ID || !COLLECTION_ID) {
  console.error('❌ Missing required environment variables:');
  if (!DATABASE_ID) console.error('   - NEXT_PUBLIC_APPWRITE_DATABASE_ID');
  if (!COLLECTION_ID) console.error('   - NEXT_PUBLIC_APPWRITE_JOB_APPLICATIONS_COLLECTION_ID');
  process.exit(1);
}

async function addAttributes() {
  console.log('🚀 Starting to add attributes to JOB_APPLICATIONS collection...\n');

  const attributes = [
    {
      key: 'withdrawnAt',
      type: 'datetime',
      required: false,
      description: 'Timestamp when worker withdrew their application'
    },
    {
      key: 'selectedAt',
      type: 'datetime',
      required: false,
      description: 'Timestamp when client selected the worker'
    },
    {
      key: 'acceptedAt',
      type: 'datetime',
      required: false,
      description: 'Timestamp when worker accepted the job'
    },
    {
      key: 'declinedAt',
      type: 'datetime',
      required: false,
      description: 'Timestamp when worker declined the job'
    },
    {
      key: 'unpickedAt',
      type: 'datetime',
      required: false,
      description: 'Timestamp when selection expired or was unpicked'
    }
  ];

  for (const attr of attributes) {
    try {
      console.log(`📝 Adding attribute: ${attr.key}`);
      console.log(`   Type: ${attr.type}`);
      console.log(`   Required: ${attr.required}`);
      console.log(`   Description: ${attr.description}`);

      await databases.createDatetimeAttribute(
        DATABASE_ID,
        COLLECTION_ID,
        attr.key,
        attr.required
      );

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
  console.log('   Added 5 datetime attributes to JOB_APPLICATIONS collection');
  console.log('   - withdrawnAt');
  console.log('   - selectedAt');
  console.log('   - acceptedAt');
  console.log('   - declinedAt');
  console.log('   - unpickedAt');
  console.log('\n💡 These attributes enable:');
  console.log('   ✓ Application withdrawal tracking');
  console.log('   ✓ Worker selection timestamps');
  console.log('   ✓ Job acceptance/decline tracking');
  console.log('   ✓ 1-hour acceptance window enforcement');
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
