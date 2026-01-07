const { serverClient, serverDatabases, DATABASE_ID, COLLECTIONS } = require('../lib/appwrite-server');
const { Query } = require('node-appwrite');

async function checkStuckEscrow() {
  try {
    const clientId = '68e77c6a001db71648a3'; // Your client ID from the logs

    console.log('🔍 Checking stuck escrow for client:', clientId);
    console.log('');

    // 1. Get wallet
    const wallets = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.VIRTUAL_WALLETS,
      [Query.equal('userId', clientId)]
    );

    if (wallets.documents.length === 0) {
      console.log('❌ No wallet found');
      return;
    }

    const wallet = wallets.documents[0];
    console.log('💰 Wallet Status:');
    console.log('  Balance:', wallet.balance);
    console.log('  Escrow:', wallet.escrow);
    console.log('  Available:', wallet.balance - wallet.escrow);
    console.log('  Total Spent:', wallet.totalSpent);
    console.log('');

    // 2. Get all bookings for this client
    const bookings = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.BOOKINGS,
      [
        Query.equal('clientId', clientId),
        Query.limit(100)
      ]
    );

    console.log('📋 Bookings:');
    console.log(`  Total: ${bookings.documents.length}`);
    console.log('');

    let totalEscrowExpected = 0;
    const escrowBookings = [];

    for (const booking of bookings.documents) {
      console.log(`  Booking ${booking.$id}:`);
      console.log(`    Status: ${booking.status}`);
      console.log(`    Payment Status: ${booking.paymentStatus}`);
      console.log(`    Amount: ₦${booking.amount}`);

      if (booking.paymentStatus === 'held_in_escrow') {
        totalEscrowExpected += booking.amount;
        escrowBookings.push(booking);
        console.log(`    ⚠️  HOLDING ESCROW: ₦${booking.amount}`);
      }
      console.log('');
    }

    console.log('📊 Summary:');
    console.log(`  Actual Escrow in Wallet: ₦${wallet.escrow}`);
    console.log(`  Expected from Bookings: ₦${totalEscrowExpected}`);
    console.log(`  Difference: ₦${wallet.escrow - totalEscrowExpected}`);
    console.log('');

    if (wallet.escrow !== totalEscrowExpected) {
      console.log('⚠️  ESCROW MISMATCH DETECTED!');
      console.log('');

      if (escrowBookings.length === 0 && wallet.escrow > 0) {
        console.log('💡 Solution: No bookings holding escrow, but wallet has escrow.');
        console.log('   You can manually release this escrow back to balance.');
        console.log('');
        console.log('   Run: node scripts/fix-escrow.js');
      }
    }

    // 3. Get transactions
    const transactions = await serverDatabases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.WALLET_TRANSACTIONS,
      [
        Query.equal('userId', clientId),
        Query.orderDesc('createdAt'),
        Query.limit(20)
      ]
    );

    console.log('💳 Recent Transactions:');
    for (const tx of transactions.documents) {
      console.log(`  ${tx.type}: ₦${tx.amount} - ${tx.description} (${tx.status})`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkStuckEscrow();
