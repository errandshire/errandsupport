// Add missing attributes to JOB_APPLICATIONS and BOOKINGS collections
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

async function addMissingAttributes() {
  try {
    console.log('🔧 Adding missing attributes to support worker acceptance system...\n');

    // ============================================
    // JOB_APPLICATIONS COLLECTION
    // ============================================
    console.log('📋 JOB_APPLICATIONS Collection:');
    const JOB_APPLICATIONS_ID = process.env.NEXT_PUBLIC_APPWRITE_JOB_APPLICATIONS_COLLECTION_ID;

    if (!JOB_APPLICATIONS_ID) {
      throw new Error('NEXT_PUBLIC_APPWRITE_JOB_APPLICATIONS_COLLECTION_ID not found in environment');
    }

    // Add selectedAt - CRITICAL for 1-hour acceptance window
    try {
      await databases.createDatetimeAttribute(
        DATABASE_ID,
        JOB_APPLICATIONS_ID,
        'selectedAt',
        false // not required
      );
      console.log('✅ Added "selectedAt" (datetime) - Tracks when client selects worker');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  "selectedAt" attribute already exists');
      } else {
        throw error;
      }
    }

    console.log('\n📦 BOOKINGS Collection:');
    const BOOKINGS_ID = process.env.NEXT_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID;

    if (!BOOKINGS_ID) {
      throw new Error('NEXT_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID not found in environment');
    }

    // Add acceptedAt - Tracks when worker accepts booking
    try {
      await databases.createDatetimeAttribute(
        DATABASE_ID,
        BOOKINGS_ID,
        'acceptedAt',
        false // not required
      );
      console.log('✅ Added "acceptedAt" (datetime) - Tracks when worker accepts booking');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  "acceptedAt" attribute already exists');
      } else {
        throw error;
      }
    }

    // Add startedAt - Tracks when work begins
    try {
      await databases.createDatetimeAttribute(
        DATABASE_ID,
        BOOKINGS_ID,
        'startedAt',
        false // not required
      );
      console.log('✅ Added "startedAt" (datetime) - Tracks when work begins');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  "startedAt" attribute already exists');
      } else {
        throw error;
      }
    }

    // Add clientConfirmedAt - Tracks when client confirms completion
    try {
      await databases.createDatetimeAttribute(
        DATABASE_ID,
        BOOKINGS_ID,
        'clientConfirmedAt',
        false // not required
      );
      console.log('✅ Added "clientConfirmedAt" (datetime) - Tracks when client confirms completion');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  "clientConfirmedAt" attribute already exists');
      } else {
        throw error;
      }
    }

    console.log('\n✅ All missing attributes added successfully!');
    console.log('\n📝 Summary:');
    console.log('   JOB_APPLICATIONS:');
    console.log('   - selectedAt: Enables 1-hour acceptance window validation');
    console.log('\n   BOOKINGS:');
    console.log('   - acceptedAt: Tracks worker acceptance timestamp');
    console.log('   - startedAt: Tracks work start timestamp');
    console.log('   - clientConfirmedAt: Tracks client confirmation timestamp');
    console.log('\n🎉 Worker acceptance and client cancellation system is now fully operational!\n');

  } catch (error) {
    console.error('❌ Error adding attributes:', error.message);
    console.error('\n💡 Manual steps if this fails:');
    console.error('\n   JOB_APPLICATIONS Collection:');
    console.error('   1. Go to Appwrite Console → Database → job_applications_collection');
    console.error('   2. Add datetime attribute: selectedAt (optional)');
    console.error('\n   BOOKINGS Collection:');
    console.error('   3. Go to Appwrite Console → Database → bookings_collection');
    console.error('   4. Add datetime attributes:');
    console.error('      - acceptedAt (optional)');
    console.error('      - startedAt (optional)');
    console.error('      - clientConfirmedAt (optional)\n');
    process.exit(1);
  }
}

// Run the script
addMissingAttributes();
