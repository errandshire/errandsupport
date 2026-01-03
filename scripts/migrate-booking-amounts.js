const { Client, Databases, Query } = require('node-appwrite');
require('dotenv').config();

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function migrateBookingAmounts() {
  try {
    console.log('🔄 Starting migration of booking amounts...\n');

    // Fetch all bookings
    const bookings = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      process.env.NEXT_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID,
      [
        Query.limit(500) // Adjust if you have more bookings
      ]
    );

    console.log(`📋 Found ${bookings.documents.length} total bookings\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const booking of bookings.documents) {
      try {
        // Check if budgetAmount is missing or 0
        const needsMigration = !booking.budgetAmount || booking.budgetAmount === 0;

        if (!needsMigration) {
          console.log(`✓ Booking ${booking.$id} already has budgetAmount: ₦${booking.budgetAmount}`);
          skippedCount++;
          continue;
        }

        // Try to get amount from totalAmount field
        let amountToSet = 0;

        if (booking.totalAmount) {
          amountToSet = booking.totalAmount;
          console.log(`📝 Booking ${booking.$id}: Found totalAmount = ₦${booking.totalAmount}`);
        } else if (booking.serviceId) {
          // Try to get amount from the linked job
          try {
            const job = await databases.getDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
              process.env.NEXT_PUBLIC_APPWRITE_JOBS_COLLECTION_ID,
              booking.serviceId
            );

            if (job.budgetMax) {
              amountToSet = job.budgetMax;
              console.log(`📝 Booking ${booking.$id}: Got amount from job = ₦${job.budgetMax}`);
            }
          } catch (jobError) {
            console.log(`⚠️  Booking ${booking.$id}: Could not fetch linked job`);
          }
        }

        if (amountToSet === 0) {
          console.log(`⚠️  Booking ${booking.$id}: No amount found, skipping...`);
          skippedCount++;
          continue;
        }

        // Update the booking
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
          process.env.NEXT_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID,
          booking.$id,
          {
            budgetAmount: amountToSet,
            budgetCurrency: 'NGN',
            budgetIsHourly: false
          }
        );

        console.log(`✅ Migrated booking ${booking.$id}: Set budgetAmount = ₦${amountToSet}`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ Failed to migrate booking ${booking.$id}:`, error.message);
        failedCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migratedCount}`);
    console.log(`   ⏭️  Skipped (already has amount): ${skippedCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log(`   📋 Total: ${bookings.documents.length}`);

  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

migrateBookingAmounts();
