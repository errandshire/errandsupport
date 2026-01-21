#!/usr/bin/env node

/**
 * Script to fix reviews by populating workerId from corresponding bookings
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
const WORKERS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID;

async function fixReviewsWorkerId() {
  console.log('🔧 Fixing reviews workerId field...\n');

  try {
    // Get all reviews
    const reviews = await databases.listDocuments(
      DATABASE_ID,
      REVIEWS_COLLECTION,
      [sdk.Query.limit(100)]
    );

    console.log(`📊 Total reviews found: ${reviews.total}\n`);

    if (reviews.documents.length === 0) {
      console.log('⚠️  No reviews found.\n');
      return;
    }

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const review of reviews.documents) {
      console.log(`\n📝 Processing review ${review.$id}...`);
      console.log(`   Current workerId: ${review.workerId || '(null)'}`);

      // If review already has a workerId, skip it
      if (review.workerId && review.workerId.trim() !== '') {
        console.log(`   ✓ Already has workerId, skipping`);
        skippedCount++;
        continue;
      }

      try {
        // Get the corresponding booking
        const booking = await databases.getDocument(
          DATABASE_ID,
          BOOKINGS_COLLECTION,
          review.bookingId
        );

        if (!booking.workerId || booking.workerId.trim() === '') {
          console.log(`   ⚠️  Booking ${review.bookingId} has no workerId, skipping`);
          skippedCount++;
          continue;
        }

        console.log(`   Booking workerId: ${booking.workerId}`);

        // Update the review with the workerId from booking
        await databases.updateDocument(
          DATABASE_ID,
          REVIEWS_COLLECTION,
          review.$id,
          {
            workerId: booking.workerId,
            updatedAt: new Date().toISOString()
          }
        );

        console.log(`   ✅ Updated review with workerId: ${booking.workerId}`);
        fixedCount++;

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n\n📈 Summary:');
    console.log(`   Total reviews processed: ${reviews.documents.length}`);
    console.log(`   Reviews fixed: ${fixedCount} ✅`);
    console.log(`   Reviews skipped: ${skippedCount} ⚠️`);
    console.log(`   Reviews with errors: ${errorCount} ❌`);

    if (fixedCount > 0) {
      console.log('\n\n🔄 Now updating worker rating statistics...\n');

      // Get unique worker IDs from updated reviews
      const workerIds = new Set();
      for (const review of reviews.documents) {
        try {
          const updatedReview = await databases.getDocument(
            DATABASE_ID,
            REVIEWS_COLLECTION,
            review.$id
          );

          if (updatedReview.workerId && updatedReview.workerId.trim() !== '') {
            workerIds.add(updatedReview.workerId);
          }
        } catch (error) {
          // Ignore errors
        }
      }

      console.log(`   Found ${workerIds.size} unique workers with reviews\n`);

      for (const workerId of workerIds) {
        try {
          console.log(`   Updating stats for worker ${workerId}...`);

          // Get all reviews for this worker
          const workerReviews = await databases.listDocuments(
            DATABASE_ID,
            REVIEWS_COLLECTION,
            [
              sdk.Query.equal('workerId', workerId),
              sdk.Query.equal('isPublic', true),
              sdk.Query.limit(1000)
            ]
          );

          if (workerReviews.documents.length === 0) {
            console.log(`      No reviews found, skipping`);
            continue;
          }

          // Calculate stats
          const totalRating = workerReviews.documents.reduce((sum, r) => sum + r.rating, 0);
          const averageRating = Math.round((totalRating / workerReviews.documents.length) * 10) / 10;
          const totalReviews = workerReviews.documents.length;

          console.log(`      Reviews: ${totalReviews}, Avg Rating: ${averageRating}`);

          // Find worker document
          const workerDocs = await databases.listDocuments(
            DATABASE_ID,
            WORKERS_COLLECTION,
            [
              sdk.Query.equal('userId', workerId),
              sdk.Query.limit(1)
            ]
          );

          if (workerDocs.documents.length === 0) {
            console.log(`      ⚠️  Worker document not found for userId ${workerId}`);
            continue;
          }

          // Update worker stats
          await databases.updateDocument(
            DATABASE_ID,
            WORKERS_COLLECTION,
            workerDocs.documents[0].$id,
            {
              ratingAverage: averageRating,
              totalReviews: totalReviews,
              updatedAt: new Date().toISOString()
            }
          );

          console.log(`      ✅ Updated worker stats`);

        } catch (error) {
          console.log(`      ❌ Error updating worker ${workerId}: ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error fixing reviews:', error.message);
    if (error.code) console.error(`   Code: ${error.code}`);
  }
}

// Run the script
fixReviewsWorkerId()
  .then(() => {
    console.log('\n\n✨ Fix completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
