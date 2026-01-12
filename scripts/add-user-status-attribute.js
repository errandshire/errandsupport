// Add missing 'status' attribute to USERS collection
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
const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID;

async function addStatusAttribute() {
  try {
    console.log('🔧 Adding "status" attribute to USERS collection...\n');

    // Add status attribute
    await databases.createStringAttribute(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      'status',
      50,
      false, // not required
      'active', // default value
      false // not array
    );

    console.log('✅ Successfully added "status" attribute to USERS collection');
    console.log('   - Type: string');
    console.log('   - Size: 50');
    console.log('   - Required: false');
    console.log('   - Default: "active"');
    console.log('   - Possible values: "active", "inactive", "suspended"\n');

    console.log('⏳ Note: Attribute may take a few moments to become available.');
    console.log('   You can check the Appwrite Console to confirm.\n');

    console.log('✅ USERS collection is now fully compatible with broadcast system!\n');

  } catch (error) {
    if (error.code === 409) {
      console.log('ℹ️  "status" attribute already exists in USERS collection');
      console.log('✅ No action needed - USERS collection is ready!\n');
    } else {
      console.error('❌ Error adding status attribute:', error.message);
      console.error('\n💡 You may need to add this attribute manually via Appwrite Console:');
      console.error('   1. Go to your USERS collection');
      console.error('   2. Add a string attribute named "status"');
      console.error('   3. Set size to 50, not required, default "active"\n');
      process.exit(1);
    }
  }
}

// Run the script
addStatusAttribute();
