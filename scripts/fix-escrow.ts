/**
 * ONE-TIME SCRIPT: Fix negative escrow balance
 *
 * This script corrects the escrow balance for a user who has negative escrow
 * due to double refunds that occurred before the idempotency fix.
 *
 * Usage:
 * 1. Update the USER_ID below with the affected user's ID
 * 2. Run: npx tsx scripts/fix-escrow.ts
 */

import { databases, COLLECTIONS } from '../lib/appwrite';
import { Query } from 'appwrite';

// Replace with the actual user ID that has -406 escrow
const USER_ID = 'YOUR_USER_ID_HERE';

async function fixEscrowBalance() {
  try {
    console.log('🔍 Finding wallet for user:', USER_ID);

    // Find the user's wallet
    const wallets = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.VIRTUAL_WALLETS,
      [Query.equal('userId', USER_ID)]
    );

    if (wallets.documents.length === 0) {
      console.error('❌ No wallet found for user:', USER_ID);
      return;
    }

    const wallet = wallets.documents[0];
    console.log('📊 Current wallet state:');
    console.log(`   Balance: ₦${wallet.balance}`);
    console.log(`   Escrow: ₦${wallet.escrow}`);
    console.log(`   Wallet ID: ${wallet.$id}`);

    // Check if escrow is negative
    if (wallet.escrow >= 0) {
      console.log('✅ Escrow is not negative. No fix needed.');
      return;
    }

    console.log('\n⚠️  Escrow is negative. Applying fix...');

    // Fix: Set escrow to 0
    // The money was already refunded (that's why it went negative),
    // so escrow should be 0
    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.VIRTUAL_WALLETS,
      wallet.$id,
      {
        escrow: 0,
        updatedAt: new Date().toISOString()
      }
    );

    console.log('✅ Escrow balance corrected to ₦0');
    console.log('📊 New wallet state:');
    console.log(`   Balance: ₦${wallet.balance}`);
    console.log(`   Escrow: ₦0`);

  } catch (error) {
    console.error('❌ Error fixing escrow:', error);
    throw error;
  }
}

// Run the fix
fixEscrowBalance()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
