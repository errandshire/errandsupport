// Add acceptance and unpick attributes to JOB_APPLICATIONS collection
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
const COLLECTION_ID = 'job_applications_collection';

async function addAcceptanceAttributes() {
  try {
    console.log('🔧 Adding acceptance and unpick attributes to JOB_APPLICATIONS collection...\n');

    // Add acceptedAt attribute
    try {
      await databases.createDatetimeAttribute(
        DATABASE_ID,
        COLLECTION_ID,
        'acceptedAt',
        false // not required
      );
      console.log('✅ Added "acceptedAt" datetime attribute');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  "acceptedAt" attribute already exists');
      } else {
        throw error;
      }
    }

    // Add declinedAt attribute
    try {
      await databases.createDatetimeAttribute(
        DATABASE_ID,
        COLLECTION_ID,
        'declinedAt',
        false // not required
      );
      console.log('✅ Added "declinedAt" datetime attribute');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  "declinedAt" attribute already exists');
      } else {
        throw error;
      }
    }

    // Add unpickedAt attribute
    try {
      await databases.createDatetimeAttribute(
        DATABASE_ID,
        COLLECTION_ID,
        'unpickedAt',
        false // not required
      );
      console.log('✅ Added "unpickedAt" datetime attribute');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  "unpickedAt" attribute already exists');
      } else {
        throw error;
      }
    }

    console.log('\n✅ All acceptance/unpick attributes added successfully!');
    console.log('\n📝 Note: You may need to update the status enum to include "unpicked" value');
    console.log('   This can be done via Appwrite Console if the enum is already created.\n');

  } catch (error) {
    console.error('❌ Error adding attributes:', error.message);
    console.error('\n💡 Manual steps if this fails:');
    console.error('   1. Go to Appwrite Console → Database → job_applications_collection');
    console.error('   2. Add datetime attributes: acceptedAt, declinedAt, unpickedAt (all optional)');
    console.error('   3. Update status enum to include "unpicked" value\n');
    process.exit(1);
  }
}

// Run the script
addAcceptanceAttributes();
