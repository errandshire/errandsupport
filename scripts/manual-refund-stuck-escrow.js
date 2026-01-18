/**
 * Manual Refund Script for Stuck Escrow Funds
 *
 * This script manually refunds bookings that were cancelled before the
 * refund system was fixed. It moves funds from escrow back to available balance.
 *
 * BOOKINGS TO REFUND (₦200 total):
 * - 6954fd940003c2296471 (₦50)
 * - 6954f7f7000888ca7edb (₦50)
 * - 6954f7ed001985f8914c (₦50)
 * - 6954f76b003cfd4e76cf (₦50)
 *
 * Run with: node scripts/manual-refund-stuck-escrow.js
 */

// Load environment variables
require('dotenv').config();

const { Client, Databases, Query } = require('node-appwrite');

// Configuration
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

// Collection IDs
const COLLECTIONS = {
  BOOKINGS: process.env.NEXT_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID,
  VIRTUAL_WALLETS: process.env.NEXT_PUBLIC_APPWRITE_VIRTUAL_WALLETS_COLLECTION_ID,
  WALLET_TRANSACTIONS: process.env.NEXT_PUBLIC_APPWRITE_WALLET_TRANSACTIONS_COLLECTION_ID,
};

// Bookings that need refunds
const STUCK_BOOKINGS = [
  '6954fd940003c2296471',
  '6954f7f7000888ca7edb',
  '6954f7ed001985f8914c',
  '6954f76b003cfd4e76cf'
];

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

/**
 * Process refund for a single booking
 */
async function refundBooking(bookingId) {
  try {
    console.log(`\n========================================`);
    console.log(`Processing booking: ${bookingId}`);
    console.log(`========================================`);

    // 1. Get booking details
    const booking = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.BOOKINGS,
      bookingId
    );

    console.log(`📋 Booking Status: ${booking.status}`);
    console.log(`💰 Payment Status: ${booking.paymentStatus}`);
    console.log(`👤 Client ID: ${booking.clientId}`);

    // 2. Calculate refund amount
    const refundAmount = booking.totalAmount || booking.budgetAmount || 0;

    if (refundAmount <= 0) {
      console.log(`❌ ERROR: Booking has no amount to refund`);
      return { success: false, bookingId, reason: 'No amount found' };
    }

    console.log(`💵 Refund Amount: ₦${refundAmount}`);

    // 3. Check if already refunded
    if (booking.status === 'cancelled' && booking.paymentStatus === 'refunded') {
      console.log(`✅ SKIP: Booking already cancelled and refunded`);
      return { success: true, bookingId, reason: 'Already refunded' };
    }

    // 4. Get client's wallet
    console.log(`\n🔍 Fetching client wallet...`);
    const wallets = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.VIRTUAL_WALLETS,
      [Query.equal('userId', booking.clientId)]
    );

    if (wallets.documents.length === 0) {
      console.log(`❌ ERROR: Wallet not found for client ${booking.clientId}`);
      return { success: false, bookingId, reason: 'Wallet not found' };
    }

    const wallet = wallets.documents[0];

    console.log(`💳 Wallet Found:`, {
      walletId: wallet.$id,
      currentBalance: `₦${wallet.balance}`,
      currentEscrow: `₦${wallet.escrow}`,
      availableBalance: `₦${wallet.balance - wallet.escrow}`
    });

    // 5. Check if escrow has enough funds
    if (wallet.escrow < refundAmount) {
      console.log(`⚠️  WARNING: Escrow (₦${wallet.escrow}) is less than refund amount (₦${refundAmount})`);
      console.log(`   This may indicate the funds were already moved. Proceeding with available escrow...`);
    }

    // 6. Calculate new wallet values
    const amountToRefund = Math.min(wallet.escrow, refundAmount);
    const newBalance = wallet.balance + amountToRefund;
    const newEscrow = wallet.escrow - amountToRefund;

    console.log(`\n💸 Refund Calculation:`, {
      oldBalance: `₦${wallet.balance}`,
      oldEscrow: `₦${wallet.escrow}`,
      refunding: `₦${amountToRefund}`,
      newBalance: `₦${newBalance}`,
      newEscrow: `₦${newEscrow}`
    });

    // 7. Create refund transaction (for audit trail)
    const transactionId = `manual_refund_${bookingId}_${Date.now()}`;

    console.log(`\n📝 Creating refund transaction: ${transactionId}`);
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.WALLET_TRANSACTIONS,
        transactionId,
        {
          userId: booking.clientId,
          type: 'booking_refund',
          amount: amountToRefund,
          bookingId: bookingId,
          reference: transactionId,
          status: 'completed',
          description: `Manual refund for cancelled booking #${bookingId} (stuck escrow recovery)`,
          createdAt: new Date().toISOString()
        }
      );
      console.log(`✅ Transaction created`);
    } catch (transError) {
      if (transError.code === 409) {
        console.log(`⚠️  Transaction already exists, continuing...`);
      } else {
        throw transError;
      }
    }

    // 8. Update wallet (move funds from escrow to balance)
    console.log(`\n💰 Updating wallet...`);
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.VIRTUAL_WALLETS,
      wallet.$id,
      {
        balance: newBalance,
        escrow: newEscrow,
        updatedAt: new Date().toISOString()
      }
    );
    console.log(`✅ Wallet updated`);

    // 9. Update booking payment status
    console.log(`\n📋 Updating booking status...`);
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.BOOKINGS,
      bookingId,
      {
        status: 'cancelled',
        paymentStatus: 'refunded',
        updatedAt: new Date().toISOString()
      }
    );
    console.log(`✅ Booking updated`);

    console.log(`\n✅ SUCCESS: Refund completed for booking ${bookingId}`);
    console.log(`   Client received: ₦${amountToRefund}`);

    return {
      success: true,
      bookingId,
      amount: amountToRefund,
      clientId: booking.clientId
    };

  } catch (error) {
    console.error(`\n❌ ERROR processing booking ${bookingId}:`, error.message);
    return {
      success: false,
      bookingId,
      error: error.message
    };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           MANUAL REFUND SCRIPT - STUCK ESCROW RECOVERY         ║
╚════════════════════════════════════════════════════════════════╝
  `);

  console.log(`📌 Configuration:`);
  console.log(`   Endpoint: ${APPWRITE_ENDPOINT}`);
  console.log(`   Project: ${APPWRITE_PROJECT_ID}`);
  console.log(`   Database: ${DATABASE_ID}`);
  console.log(`\n📊 Bookings to process: ${STUCK_BOOKINGS.length}`);
  console.log(`   Total expected refund: ₦200 (₦50 × 4 bookings)`);

  // Validate configuration
  if (!APPWRITE_API_KEY) {
    console.error(`\n❌ FATAL ERROR: APPWRITE_API_KEY not found in environment`);
    console.error(`   Please set the APPWRITE_API_KEY environment variable and try again.`);
    process.exit(1);
  }

  // Process each booking
  const results = [];
  let totalRefunded = 0;

  for (const bookingId of STUCK_BOOKINGS) {
    const result = await refundBooking(bookingId);
    results.push(result);

    if (result.success && result.amount) {
      totalRefunded += result.amount;
    }

    // Small delay between operations to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print summary
  console.log(`\n\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║                         FINAL SUMMARY                          ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`📊 Results:`);
  console.log(`   ✅ Successful: ${successful.length}`);
  console.log(`   ❌ Failed: ${failed.length}`);
  console.log(`   💰 Total Refunded: ₦${totalRefunded}`);

  if (successful.length > 0) {
    console.log(`\n✅ Successfully refunded:`);
    successful.forEach(r => {
      const amount = r.amount || '(already processed)';
      console.log(`   - ${r.bookingId}: ${typeof amount === 'number' ? '₦' + amount : amount}`);
    });
  }

  if (failed.length > 0) {
    console.log(`\n❌ Failed refunds:`);
    failed.forEach(r => {
      console.log(`   - ${r.bookingId}: ${r.reason || r.error || 'Unknown error'}`);
    });
  }

  console.log(`\n✨ Script completed!\n`);

  // Exit with appropriate code
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run the script
main().catch(error => {
  console.error('\n💥 FATAL ERROR:', error);
  process.exit(1);
});
