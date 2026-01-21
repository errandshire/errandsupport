#!/usr/bin/env node

/**
 * Script to check if bookings have selectedAt from job applications
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
const BOOKINGS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID;
const APPLICATIONS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_JOB_APPLICATIONS_COLLECTION_ID;

async function checkBookingSelectedAt() {
  console.log('🔍 Checking bookings and job applications...\n');

  try {
    // Get bookings with status 'confirmed'
    const bookings = await databases.listDocuments(
      DATABASE_ID,
      BOOKINGS_COLLECTION,
      [
        sdk.Query.equal('status', 'confirmed'),
        sdk.Query.limit(10)
      ]
    );

    console.log(`📊 Found ${bookings.total} confirmed bookings\n`);

    if (bookings.documents.length === 0) {
      console.log('⚠️  No confirmed bookings found.\n');
      return;
    }

    for (const booking of bookings.documents) {
      console.log(`\n📝 Booking ID: ${booking.$id}`);
      console.log(`   Title: ${booking.title || 'Untitled'}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Worker ID: ${booking.workerId || '(none)'}`);
      console.log(`   Job ID: ${booking.jobId || '(none)'}`);

      // Check if booking has a jobId
      if (booking.jobId) {
        try {
          // Find job application for this job and worker
          const applications = await databases.listDocuments(
            DATABASE_ID,
            APPLICATIONS_COLLECTION,
            [
              sdk.Query.equal('jobId', booking.jobId),
              sdk.Query.equal('workerId', booking.workerId),
              sdk.Query.limit(1)
            ]
          );

          if (applications.documents.length > 0) {
            const app = applications.documents[0];
            console.log(`   ✅ Found application:`);
            console.log(`      Application ID: ${app.$id}`);
            console.log(`      Status: ${app.status}`);
            console.log(`      Selected At: ${app.selectedAt || '(none)'}`);
            console.log(`      Applied At: ${app.appliedAt || app.$createdAt}`);
          } else {
            console.log(`   ⚠️  No application found for this booking`);
          }
        } catch (error) {
          console.log(`   ❌ Error fetching application: ${error.message}`);
        }
      } else {
        console.log(`   ⚠️  Booking has no jobId - cannot link to application`);
      }
    }

    // Also check all selected applications
    console.log('\n\n📋 All selected applications:\n');

    const selectedApps = await databases.listDocuments(
      DATABASE_ID,
      APPLICATIONS_COLLECTION,
      [
        sdk.Query.equal('status', 'selected'),
        sdk.Query.limit(20)
      ]
    );

    console.log(`   Found ${selectedApps.total} selected applications\n`);

    for (const app of selectedApps.documents) {
      console.log(`   Application ID: ${app.$id}`);
      console.log(`   Job ID: ${app.jobId}`);
      console.log(`   Worker ID: ${app.workerId}`);
      console.log(`   Status: ${app.status}`);
      console.log(`   Selected At: ${app.selectedAt || '(none)'}`);

      // Check if there's a corresponding booking
      try {
        const bookings = await databases.listDocuments(
          DATABASE_ID,
          BOOKINGS_COLLECTION,
          [
            sdk.Query.equal('jobId', app.jobId),
            sdk.Query.equal('workerId', app.workerId),
            sdk.Query.limit(1)
          ]
        );

        if (bookings.documents.length > 0) {
          console.log(`   ✅ Has corresponding booking: ${bookings.documents[0].$id} (status: ${bookings.documents[0].status})`);
        } else {
          console.log(`   ⚠️  No corresponding booking found`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }

      console.log('   ---');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) console.error(`   Code: ${error.code}`);
  }
}

// Run the script
checkBookingSelectedAt()
  .then(() => {
    console.log('\n✨ Check completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
