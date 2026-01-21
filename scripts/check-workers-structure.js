#!/usr/bin/env node

/**
 * Script to check WORKERS collection structure and userId mapping
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
const WORKERS_COLLECTION = process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID;

async function checkWorkersStructure() {
  console.log('🔍 Checking WORKERS collection structure...\n');

  try {
    // Get all workers
    const workers = await databases.listDocuments(
      DATABASE_ID,
      WORKERS_COLLECTION,
      [sdk.Query.limit(100)]
    );

    console.log(`📊 Total workers: ${workers.total}\n`);

    const workerIdsFromReviews = [
      '68e784b0001333631a10',
      '68ebb81d002be0a44940',
      '690290b8001c8a977317',
      '68f0e60e001fd066f365',
      '6958e3cc002fef6e48fc',
      '691da5af0007029c24fb',
      '69136eef00305787cfed'
    ];

    console.log('🔎 Looking for workers with these IDs from reviews:\n');

    for (const workerId of workerIdsFromReviews) {
      console.log(`\n📝 Searching for worker ID: ${workerId}`);

      // Try to find by $id
      let found = workers.documents.find(w => w.$id === workerId);
      if (found) {
        console.log(`   ✅ Found by $id`);
        console.log(`      Document ID: ${found.$id}`);
        console.log(`      User ID: ${found.userId}`);
        console.log(`      Name: ${found.displayName || found.name}`);
        console.log(`      Rating: ${found.ratingAverage || 0}/5.0`);
        console.log(`      Total Reviews: ${found.totalReviews || 0}`);
        continue;
      }

      // Try to find by userId
      found = workers.documents.find(w => w.userId === workerId);
      if (found) {
        console.log(`   ✅ Found by userId`);
        console.log(`      Document ID: ${found.$id}`);
        console.log(`      User ID: ${found.userId}`);
        console.log(`      Name: ${found.displayName || found.name}`);
        console.log(`      Rating: ${found.ratingAverage || 0}/5.0`);
        console.log(`      Total Reviews: ${found.totalReviews || 0}`);
        continue;
      }

      console.log(`   ❌ NOT FOUND in WORKERS collection`);
      console.log(`      This worker ID is in bookings and reviews but not in WORKERS`);
    }

    console.log('\n\n📋 All Workers in collection:\n');

    for (const worker of workers.documents) {
      console.log(`   Worker Document ID: ${worker.$id}`);
      console.log(`   User ID: ${worker.userId}`);
      console.log(`   Name: ${worker.displayName || worker.name}`);
      console.log(`   Rating: ${worker.ratingAverage || 0}/5.0 (${worker.totalReviews || 0} reviews)`);
      console.log(`   ---`);
    }

  } catch (error) {
    console.error('❌ Error checking workers:', error.message);
    if (error.code) console.error(`   Code: ${error.code}`);
  }
}

// Run the script
checkWorkersStructure()
  .then(() => {
    console.log('\n✨ Check completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
