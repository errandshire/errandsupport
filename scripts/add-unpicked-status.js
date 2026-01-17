const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env' });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_JOB_APPLICATIONS_COLLECTION_ID;

async function addUnpickedStatus() {
  console.log('🔄 Adding "unpicked" status to JOB_APPLICATIONS enum...\n');

  try {
    // Update the status enum attribute to include 'unpicked'
    // Note: xdefault must be provided but set to null for required attributes
    await databases.updateEnumAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'status',
      ['pending', 'selected', 'rejected', 'withdrawn', 'unpicked'], // All values including new one
      true, // required
      null // default (null for required attributes)
    );

    console.log('✅ Successfully added "unpicked" to status enum!\n');
    console.log('📋 Status enum now accepts: pending, selected, rejected, withdrawn, unpicked');

  } catch (error) {
    console.error('❌ Error updating enum:', error);

    if (error.code === 400 && error.message?.includes('cannot be updated')) {
      console.log('\n⚠️  Enum attribute cannot be updated via API.');
      console.log('📝 Please manually update the enum in Appwrite Console:');
      console.log('   1. Go to Appwrite Console > Databases');
      console.log(`   2. Select database: ${DATABASE_ID}`);
      console.log(`   3. Select collection: JOB_APPLICATIONS`);
      console.log('   4. Find the "status" attribute');
      console.log('   5. Edit it to add "unpicked" to the enum values');
      console.log('   6. New values: pending, selected, rejected, withdrawn, unpicked');
    }

    throw error;
  }
}

// Run the update
addUnpickedStatus()
  .then(() => {
    console.log('\n✅ Update completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Update failed:', error.message);
    process.exit(1);
  });
