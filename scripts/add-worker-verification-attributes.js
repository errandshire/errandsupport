#!/usr/bin/env node

/**
 * Script to add missing verification attributes to WORKERS collection
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
  console.log('🚀 Starting to add verification attributes to WORKERS collection...\n');

  const attributes = [
    {
      key: 'idType',
      type: 'string',
      size: 50,
      required: false,
      description: 'Type of ID document (e.g., passport, drivers_license, national_id)'
    },
    {
      key: 'idNumber',
      type: 'string',
      size: 100,
      required: false,
      description: 'ID document number'
    },
    {
      key: 'idDocument',
      type: 'string',
      size: 2000,
      required: false,
      description: 'URL to uploaded ID document image'
    },
    {
      key: 'selfieWithId',
      type: 'string',
      size: 2000,
      required: false,
      description: 'URL to selfie with ID document'
    },
    {
      key: 'additionalDocuments',
      type: 'string',
      size: 5000,
      required: false,
      description: 'Comma-separated URLs of additional verification documents'
    },
    {
      key: 'verificationStatus',
      type: 'string',
      size: 50,
      required: false,
      default: 'pending',
      description: 'Verification status: pending, approved, denied'
    }
  ];

  for (const attr of attributes) {
    try {
      console.log(`📝 Adding attribute: ${attr.key}`);
      console.log(`   Type: ${attr.type}`);
      console.log(`   Required: ${attr.required}`);
      console.log(`   Description: ${attr.description}`);

      await databases.createStringAttribute(
        DATABASE_ID,
        COLLECTION_ID,
        attr.key,
        attr.size,
        attr.required,
        attr.default || null
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
  console.log('   Added verification attributes to WORKERS collection:');
  console.log('   - idType (string)');
  console.log('   - idNumber (string)');
  console.log('   - idDocument (string)');
  console.log('   - selfieWithId (string)');
  console.log('   - additionalDocuments (string)');
  console.log('   - verificationStatus (string)');
  console.log('\n💡 These attributes enable:');
  console.log('   ✓ Worker identity verification');
  console.log('   ✓ Document upload and storage');
  console.log('   ✓ Verification status tracking');
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
