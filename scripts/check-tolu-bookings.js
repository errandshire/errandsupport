#!/usr/bin/env node

/**
 * Script to check bookings for user "Tolu"
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
const USERS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID;
const APPLICATIONS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_JOB_APPLICATIONS_COLLECTION_ID;

async function checkToluBookings() {
  console.log('🔍 Checking bookings for user Tolu...\n');

  try {
    // Find user "Tolu" - Get all users and filter
    const users = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION,
      [
        sdk.Query.limit(1000)
      ]
    );

    // Filter for Tolu
    const toluUsers = {
      documents: users.documents.filter(u =>
        u.name && u.name.toLowerCase().includes('tolu')
      )
    };

    console.log(`📊 Found ${toluUsers.documents.length} users matching "Tolu"\n`);

    for (const user of toluUsers.documents) {
      console.log(`\n👤 User: ${user.name} (${user.email})`);
      console.log(`   User ID: ${user.$id}`);

      // Get bookings for this user as worker
      const bookings = await databases.listDocuments(
        DATABASE_ID,
        BOOKINGS_COLLECTION,
        [
          sdk.Query.equal('workerId', user.$id),
          sdk.Query.orderDesc('$createdAt'),
          sdk.Query.limit(20)
        ]
      );

      console.log(`   📚 Total bookings: ${bookings.total}`);

      if (bookings.documents.length > 0) {
        console.log(`\n   Recent bookings:\n`);

        for (const booking of bookings.documents) {
          console.log(`   📝 Booking ID: ${booking.$id}`);
          console.log(`      Title: ${booking.title || 'Untitled'}`);
          console.log(`      Status: ${booking.status}`);
          console.log(`      Job ID: ${booking.jobId || '(none)'}`);
          console.log(`      Created: ${booking.$createdAt}`);

          // If has jobId, check application
          if (booking.jobId) {
            try {
              const applications = await databases.listDocuments(
                DATABASE_ID,
                APPLICATIONS_COLLECTION,
                [
                  sdk.Query.equal('jobId', booking.jobId),
                  sdk.Query.equal('workerId', user.$id),
                  sdk.Query.limit(1)
                ]
              );

              if (applications.documents.length > 0) {
                const app = applications.documents[0];
                console.log(`      Application Status: ${app.status}`);
                console.log(`      Selected At: ${app.selectedAt || '(none)'}`);

                if (app.selectedAt) {
                  const selectedTime = new Date(app.selectedAt);
                  const deadline = new Date(selectedTime.getTime() + 60 * 60 * 1000);
                  const now = new Date();
                  const expired = now > deadline;

                  console.log(`      Deadline: ${deadline.toISOString()}`);
                  console.log(`      Now: ${now.toISOString()}`);
                  console.log(`      Expired: ${expired ? 'YES ⏰' : 'NO ⏳'}`);

                  if (!expired) {
                    const remaining = deadline - now;
                    const minutes = Math.floor(remaining / (60 * 1000));
                    const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
                    console.log(`      Time remaining: ${minutes}m ${seconds}s`);
                  }
                }
              }
            } catch (error) {
              console.log(`      ❌ Error checking application: ${error.message}`);
            }
          }

          console.log('      ---');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) console.error(`   Code: ${error.code}`);
  }
}

// Run the script
checkToluBookings()
  .then(() => {
    console.log('\n✨ Check completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
