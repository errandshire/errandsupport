// Add bookingId attribute to link JOB_APPLICATIONS to BOOKINGS
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

async function addBookingLinkAttribute() {
  try {
    console.log('🔧 Adding bookingId link to JOB_APPLICATIONS collection...\n');

    // Add bookingId attribute
    try {
      await databases.createStringAttribute(
        DATABASE_ID,
        COLLECTION_ID,
        'bookingId',
        255, // size
        false // not required
      );
      console.log('✅ Added "bookingId" string attribute');
      console.log('   This links job applications to created bookings');
    } catch (error) {
      if (error.code === 409) {
        console.log('ℹ️  "bookingId" attribute already exists');
      } else {
        throw error;
      }
    }

    console.log('\n✅ Booking link attribute added successfully!');
    console.log('\n📝 This allows unified acceptance logic:');
    console.log('   - When client selects worker, booking is linked to application');
    console.log('   - When worker accepts, both booking and application are updated');
    console.log('   - BookingActionService can find related application\n');

  } catch (error) {
    console.error('❌ Error adding attribute:', error.message);
    console.error('\n💡 Manual steps if this fails:');
    console.error('   1. Go to Appwrite Console → Database → job_applications_collection');
    console.error('   2. Add string attribute: bookingId (size: 255, optional)\n');
    process.exit(1);
  }
}

// Run the script
addBookingLinkAttribute();
