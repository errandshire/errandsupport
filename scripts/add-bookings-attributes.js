// Load environment variables FIRST
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('Environment check:');
console.log('ENDPOINT:', process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ? '✓' : '✗');
console.log('PROJECT:', process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ? '✓' : '✗');
console.log('API_KEY:', process.env.APPWRITE_API_KEY ? '✓' : '✗');
console.log('');

// Now import Appwrite
const { Client, Databases } = require('node-appwrite');

// Create client manually
const serverClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const COLLECTIONS = {
  BOOKINGS: process.env.NEXT_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID
};

async function addMissingAttributes() {
  try {
    const databases = new Databases(serverClient);

    console.log('🔧 Adding missing attributes to BOOKINGS collection...');
    console.log('');

    // Add workerUserId attribute
    try {
      await databases.createStringAttribute(
        DATABASE_ID,
        COLLECTIONS.BOOKINGS,
        'workerUserId',
        255,
        false, // not required (optional)
        null,  // no default
        false  // not array
      );
      console.log('✅ Added workerUserId attribute');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  workerUserId attribute already exists');
      } else {
        console.error('❌ Error adding workerUserId:', error.message);
      }
    }

    // Add jobId attribute (if missing)
    try {
      await databases.createStringAttribute(
        DATABASE_ID,
        COLLECTIONS.BOOKINGS,
        'jobId',
        255,
        false, // not required (optional)
        null,
        false
      );
      console.log('✅ Added jobId attribute');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  jobId attribute already exists');
      } else {
        console.error('❌ Error adding jobId:', error.message);
      }
    }

    // Add location attribute (JSON object)
    try {
      // Note: Appwrite doesn't have createJsonAttribute, we need to use a relationship or string
      // For now, we'll store location as a JSON string
      await databases.createStringAttribute(
        DATABASE_ID,
        COLLECTIONS.BOOKINGS,
        'location',
        10000, // Large enough for JSON
        false, // not required (optional)
        null,
        false
      );
      console.log('✅ Added location attribute (as JSON string)');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  location attribute already exists');
      } else {
        console.error('❌ Error adding location:', error.message);
      }
    }

    console.log('');
    console.log('✅ Schema update complete!');
    console.log('⏳ Wait 1-2 minutes for Appwrite to index the new attributes...');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

addMissingAttributes();
