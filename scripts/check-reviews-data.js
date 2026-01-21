#!/usr/bin/env node

/**
 * Script to check actual reviews data in the database
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
const REVIEWS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID;
const WORKERS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID;

async function checkReviewsData() {
  console.log('🔍 Checking reviews data in database...\n');

  try {
    // Fetch all reviews
    const reviews = await databases.listDocuments(
      DATABASE_ID,
      REVIEWS_COLLECTION,
      [
        sdk.Query.limit(100)
      ]
    );

    console.log(`📊 Total reviews in database: ${reviews.total}`);

    if (reviews.documents.length === 0) {
      console.log('\n⚠️  No reviews found in the database.');
      console.log('   This is normal if no jobs have been completed and reviewed yet.\n');
      return;
    }

    console.log(`\n📝 Found ${reviews.documents.length} review(s):\n`);

    // Group reviews by worker
    const reviewsByWorker = {};

    for (const review of reviews.documents) {
      const workerId = review.workerId;

      if (!reviewsByWorker[workerId]) {
        reviewsByWorker[workerId] = {
          workerId: workerId,
          reviews: [],
          totalRating: 0,
          count: 0
        };
      }

      reviewsByWorker[workerId].reviews.push(review);
      reviewsByWorker[workerId].totalRating += review.rating;
      reviewsByWorker[workerId].count += 1;

      console.log(`   Review ID: ${review.$id}`);
      console.log(`   Worker ID: ${review.workerId}`);
      console.log(`   Client ID: ${review.clientId}`);
      console.log(`   Booking ID: ${review.bookingId}`);
      console.log(`   Rating: ${review.rating}/5 ⭐`);
      console.log(`   Comment: ${review.comment || '(no comment)'}`);
      console.log(`   Is Public: ${review.isPublic}`);
      console.log(`   Created: ${review.createdAt || review.$createdAt}`);
      console.log('   ---');
    }

    console.log('\n📈 Rating Summary by Worker:\n');

    for (const workerId in reviewsByWorker) {
      const data = reviewsByWorker[workerId];
      const avgRating = (data.totalRating / data.count).toFixed(1);

      console.log(`   Worker ID: ${workerId}`);
      console.log(`   Total Reviews: ${data.count}`);
      console.log(`   Average Rating: ${avgRating}/5.0 ⭐`);

      // Check worker profile to see if it matches
      try {
        const workerDocs = await databases.listDocuments(
          DATABASE_ID,
          WORKERS_COLLECTION,
          [
            sdk.Query.equal('userId', workerId),
            sdk.Query.limit(1)
          ]
        );

        if (workerDocs.documents.length > 0) {
          const worker = workerDocs.documents[0];
          console.log(`   Worker Profile Rating: ${worker.ratingAverage || 0}/5.0`);
          console.log(`   Worker Profile Total Reviews: ${worker.totalReviews || 0}`);

          if (worker.ratingAverage !== parseFloat(avgRating) || worker.totalReviews !== data.count) {
            console.log('   ⚠️  MISMATCH: Worker profile ratings do not match calculated ratings!');
          } else {
            console.log('   ✅ Worker profile ratings match calculated ratings');
          }
        }
      } catch (error) {
        console.log(`   ⚠️  Could not fetch worker profile: ${error.message}`);
      }

      console.log('');
    }

  } catch (error) {
    console.error('❌ Error checking reviews data:', error.message);
    if (error.code) console.error(`   Code: ${error.code}`);
    if (error.type) console.error(`   Type: ${error.type}`);
  }
}

// Run the script
checkReviewsData()
  .then(() => {
    console.log('✨ Check completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
