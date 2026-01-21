#!/usr/bin/env node

/**
 * Script to check bookings and see if workerId is populated
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
const REVIEWS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID;

async function checkBookingsWorkerId() {
  console.log('🔍 Checking bookings for workerId field...\n');

  try {
    // Get all completed bookings
    const bookings = await databases.listDocuments(
      DATABASE_ID,
      BOOKINGS_COLLECTION,
      [
        sdk.Query.equal('status', 'completed'),
        sdk.Query.limit(100)
      ]
    );

    console.log(`📊 Total completed bookings: ${bookings.total}\n`);

    if (bookings.documents.length === 0) {
      console.log('⚠️  No completed bookings found.\n');
      return;
    }

    console.log('📝 Completed bookings workerId status:\n');

    let bookingsWithWorkerId = 0;
    let bookingsWithoutWorkerId = 0;
    const bookingReviewMap = {};

    for (const booking of bookings.documents) {
      const hasWorkerId = booking.workerId && booking.workerId.trim() !== '';

      if (hasWorkerId) {
        bookingsWithWorkerId++;
      } else {
        bookingsWithoutWorkerId++;
      }

      console.log(`   Booking ID: ${booking.$id}`);
      console.log(`   Title: ${booking.title || 'Untitled'}`);
      console.log(`   Worker ID: ${booking.workerId || '(null/empty)'} ${hasWorkerId ? '✅' : '❌'}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Completed: ${booking.completedAt || booking.$updatedAt}`);

      // Check if this booking has a review
      try {
        const reviews = await databases.listDocuments(
          DATABASE_ID,
          REVIEWS_COLLECTION,
          [
            sdk.Query.equal('bookingId', booking.$id),
            sdk.Query.limit(1)
          ]
        );

        if (reviews.documents.length > 0) {
          const review = reviews.documents[0];
          console.log(`   Review: ✅ Rating ${review.rating}/5`);
          console.log(`   Review Worker ID: ${review.workerId || '(null/empty)'} ${review.workerId ? '✅' : '❌'}`);

          bookingReviewMap[booking.$id] = {
            bookingWorkerId: booking.workerId,
            reviewWorkerId: review.workerId,
            rating: review.rating
          };
        } else {
          console.log(`   Review: ❌ No review found`);
        }
      } catch (error) {
        console.log(`   Review: ⚠️  Error checking: ${error.message}`);
      }

      console.log('   ---\n');
    }

    console.log('\n📈 Summary:');
    console.log(`   Total completed bookings: ${bookings.documents.length}`);
    console.log(`   Bookings WITH workerId: ${bookingsWithWorkerId} ✅`);
    console.log(`   Bookings WITHOUT workerId: ${bookingsWithoutWorkerId} ❌`);

    console.log('\n🔗 Booking-Review Correlation:');
    const reviewedBookings = Object.keys(bookingReviewMap).length;
    console.log(`   Bookings with reviews: ${reviewedBookings}`);

    let correctWorkerIds = 0;
    let incorrectWorkerIds = 0;

    for (const bookingId in bookingReviewMap) {
      const data = bookingReviewMap[bookingId];
      if (data.bookingWorkerId && data.reviewWorkerId === data.bookingWorkerId) {
        correctWorkerIds++;
      } else {
        incorrectWorkerIds++;
        console.log(`   ⚠️  Mismatch for booking ${bookingId}:`);
        console.log(`      Booking workerId: ${data.bookingWorkerId || '(null)'}`);
        console.log(`      Review workerId: ${data.reviewWorkerId || '(null)'}`);
      }
    }

    console.log(`   Reviews with CORRECT workerId: ${correctWorkerIds} ✅`);
    console.log(`   Reviews with INCORRECT/NULL workerId: ${incorrectWorkerIds} ❌`);

  } catch (error) {
    console.error('❌ Error checking bookings:', error.message);
    if (error.code) console.error(`   Code: ${error.code}`);
  }
}

// Run the script
checkBookingsWorkerId()
  .then(() => {
    console.log('\n✨ Check completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
