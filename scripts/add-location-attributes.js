require('dotenv').config({ path: '.env' });
const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID;

/**
 * Add missing location attributes to WORKERS collection
 */
async function addLocationAttributes() {
  console.log('🔧 Adding Location Attributes to WORKERS Collection');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`Database ID: ${DATABASE_ID}`);
  console.log(`Collection ID: ${COLLECTION_ID}\n`);

  const attributes = [
    { key: 'country', size: 100, required: false, description: 'Country (e.g., Nigeria)' },
    { key: 'postalCode', size: 20, required: false, description: 'Postal/ZIP code' }
  ];

  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  console.log('Attributes to add:\n');
  attributes.forEach((attr, index) => {
    console.log(`${index + 1}. ${attr.key.padEnd(15)} (String, Size: ${attr.size}, Required: ${attr.required})`);
  });
  console.log('');

  console.log('Note: address, city, state already exist in WORKERS collection\n');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                  CREATING ATTRIBUTES                          ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const attr of attributes) {
    try {
      console.log(`📝 Creating attribute: ${attr.key}...`);

      await databases.createStringAttribute(
        DATABASE_ID,
        COLLECTION_ID,
        attr.key,
        attr.size,
        attr.required,
        null, // default value
        false // array
      );

      console.log(`   ✅ SUCCESS: ${attr.key} attribute created`);
      results.success.push(attr.key);

      // Wait a bit between attribute creations to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        console.log(`   ⏭️  SKIPPED: ${attr.key} already exists`);
        results.skipped.push(attr.key);
      } else {
        console.log(`   ❌ FAILED: ${attr.key} - ${error.message}`);
        results.failed.push({ key: attr.key, error: error.message });
      }
    }

    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         SUMMARY                               ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`📊 Results:`);
  console.log(`   Total attributes: ${attributes.length}`);
  console.log(`   ✅ Created:       ${results.success.length}`);
  console.log(`   ⏭️  Skipped:       ${results.skipped.length}`);
  console.log(`   ❌ Failed:        ${results.failed.length}\n`);

  if (results.success.length > 0) {
    console.log('✅ Created attributes:');
    results.success.forEach(key => console.log(`   - ${key}`));
    console.log('');
  }

  if (results.skipped.length > 0) {
    console.log('⏭️  Skipped attributes (already exist):');
    results.skipped.forEach(key => console.log(`   - ${key}`));
    console.log('');
  }

  if (results.failed.length > 0) {
    console.log('❌ Failed attributes:');
    results.failed.forEach(({ key, error }) => {
      console.log(`   - ${key}: ${error}`);
    });
    console.log('');
  }

  if (results.success.length > 0) {
    console.log('⚠️  IMPORTANT: Appwrite needs time to process attribute creation.');
    console.log('   Wait 30-60 seconds before running the migration script.\n');
    console.log('Next steps:');
    console.log('   1. Wait 30-60 seconds for Appwrite to process');
    console.log('   2. Run migration: node scripts/migrate-additional-fields.js --execute\n');
  } else if (results.skipped.length === attributes.length) {
    console.log('✅ All attributes already exist!');
    console.log('   You can proceed with migration immediately.\n');
    console.log('Next steps:');
    console.log('   1. Run migration: node scripts/migrate-additional-fields.js --execute\n');
  } else {
    console.log('⚠️  Some attributes failed to create.');
    console.log('   Please review errors above and try again.\n');
  }

  return results;
}

async function main() {
  console.log('⚠️  This script will add location attributes to the WORKERS collection.\n');
  console.log('   Adding fields: country, postalCode');
  console.log('   (address, city, state already exist)');
  console.log('   Starting in 2 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    await addLocationAttributes();
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error);
  }
}

main();
