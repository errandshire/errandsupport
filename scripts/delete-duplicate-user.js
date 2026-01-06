require('dotenv').config({ path: '.env' });
const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const COLLECTIONS = {
  USERS: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
  WORKERS: process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID,
  BOOKINGS: process.env.NEXT_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID,
  JOBS: process.env.NEXT_PUBLIC_APPWRITE_JOBS_COLLECTION_ID,
  MESSAGES: process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID,
  PAYMENTS: process.env.NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID,
  USER_BALANCES: process.env.NEXT_PUBLIC_APPWRITE_USER_BALANCES_COLLECTION_ID,
  TRANSACTIONS: process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID
};

/**
 * Delete duplicate user account for Eyiowuawi Muinat Abiola
 *
 * KEEP: Account 1 (694db448001f481c1f9d) - Has WORKERS profile with documents
 * DELETE: Account 2 (69515c050027ac8246f7) - Duplicate with no WORKERS profile
 */
async function deleteDuplicateUser() {
  const keepUserId = '694db448001f481c1f9d';
  const deleteUserId = '69515c050027ac8246f7';

  console.log('🗑️  Duplicate User Account Deletion\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Fetch both accounts
  let keepAccount, deleteAccount;

  try {
    keepAccount = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.USERS,
      keepUserId
    );

    deleteAccount = await databases.getDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.USERS,
      deleteUserId
    );

    console.log('✅ ACCOUNT TO KEEP:');
    console.log(`   User ID: ${keepUserId}`);
    console.log(`   Email: ${keepAccount.email}`);
    console.log(`   Phone: ${keepAccount.phone}`);
    console.log(`   Name: ${keepAccount.name}`);
    console.log(`   Created: ${new Date(keepAccount.$createdAt).toLocaleString()}`);
    console.log('   Status: Has WORKERS profile with documents ✅\n');

    console.log('❌ ACCOUNT TO DELETE:');
    console.log(`   User ID: ${deleteUserId}`);
    console.log(`   Email: ${deleteAccount.email}`);
    console.log(`   Phone: ${deleteAccount.phone}`);
    console.log(`   Name: ${deleteAccount.name}`);
    console.log(`   Created: ${new Date(deleteAccount.$createdAt).toLocaleString()}`);
    console.log('   Status: Duplicate with no WORKERS profile ❌\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('           CHECKING FOR DEPENDENCIES                           ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Check for dependencies
    const dependencies = {
      bookingsAsWorker: 0,
      bookingsAsClient: 0,
      jobsPosted: 0,
      messages: 0,
      payments: 0,
      balance: null,
      transactions: 0
    };

    // Check bookings as worker
    try {
      const bookingsWorker = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        COLLECTIONS.BOOKINGS,
        [Query.equal('workerId', deleteUserId), Query.limit(1)]
      );
      dependencies.bookingsAsWorker = bookingsWorker.total;
    } catch (e) { /* Collection might not exist */ }

    // Check bookings as client
    try {
      const bookingsClient = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        COLLECTIONS.BOOKINGS,
        [Query.equal('clientId', deleteUserId), Query.limit(1)]
      );
      dependencies.bookingsAsClient = bookingsClient.total;
    } catch (e) { /* Collection might not exist */ }

    // Check jobs posted
    try {
      const jobs = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        COLLECTIONS.JOBS,
        [Query.equal('clientId', deleteUserId), Query.limit(1)]
      );
      dependencies.jobsPosted = jobs.total;
    } catch (e) { /* Collection might not exist */ }

    // Check messages
    try {
      const messages = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        COLLECTIONS.MESSAGES,
        [Query.equal('senderId', deleteUserId), Query.limit(1)]
      );
      dependencies.messages = messages.total;
    } catch (e) { /* Collection might not exist */ }

    // Check payments
    try {
      const payments = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        COLLECTIONS.PAYMENTS,
        [Query.equal('userId', deleteUserId), Query.limit(1)]
      );
      dependencies.payments = payments.total;
    } catch (e) { /* Collection might not exist */ }

    // Check balance
    try {
      const balances = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        COLLECTIONS.USER_BALANCES,
        [Query.equal('userId', deleteUserId), Query.limit(1)]
      );
      if (balances.documents.length > 0) {
        dependencies.balance = balances.documents[0];
      }
    } catch (e) { /* Collection might not exist */ }

    // Check transactions
    try {
      const transactions = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        COLLECTIONS.TRANSACTIONS,
        [Query.equal('userId', deleteUserId), Query.limit(1)]
      );
      dependencies.transactions = transactions.total;
    } catch (e) { /* Collection might not exist */ }

    console.log('📊 Dependency Check Results:\n');
    console.log(`   Bookings (as worker):  ${dependencies.bookingsAsWorker}`);
    console.log(`   Bookings (as client):  ${dependencies.bookingsAsClient}`);
    console.log(`   Jobs posted:           ${dependencies.jobsPosted}`);
    console.log(`   Messages:              ${dependencies.messages}`);
    console.log(`   Payments:              ${dependencies.payments}`);
    console.log(`   Balance record:        ${dependencies.balance ? 'EXISTS' : 'None'}`);
    if (dependencies.balance) {
      console.log(`      Balance amount:     ₦${dependencies.balance.balance || 0}`);
    }
    console.log(`   Transactions:          ${dependencies.transactions}\n`);

    const hasDependencies =
      dependencies.bookingsAsWorker > 0 ||
      dependencies.bookingsAsClient > 0 ||
      dependencies.jobsPosted > 0 ||
      dependencies.messages > 0 ||
      dependencies.payments > 0 ||
      (dependencies.balance && dependencies.balance.balance > 0) ||
      dependencies.transactions > 0;

    if (hasDependencies) {
      console.log('⚠️  WARNING: This account has dependencies!\n');
      console.log('   Deleting this account may cause issues with:');
      if (dependencies.bookingsAsWorker > 0) console.log(`   - ${dependencies.bookingsAsWorker} booking(s) as worker`);
      if (dependencies.bookingsAsClient > 0) console.log(`   - ${dependencies.bookingsAsClient} booking(s) as client`);
      if (dependencies.jobsPosted > 0) console.log(`   - ${dependencies.jobsPosted} job(s) posted`);
      if (dependencies.messages > 0) console.log(`   - ${dependencies.messages} message(s)`);
      if (dependencies.payments > 0) console.log(`   - ${dependencies.payments} payment(s)`);
      if (dependencies.balance && dependencies.balance.balance > 0) console.log(`   - Wallet balance: ₦${dependencies.balance.balance}`);
      if (dependencies.transactions > 0) console.log(`   - ${dependencies.transactions} transaction(s)`);
      console.log('\n   ❌ DELETION ABORTED - Please migrate data first!\n');
      return;
    }

    console.log('✅ No dependencies found - Safe to delete!\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                  DELETING DUPLICATE ACCOUNT                   ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Delete the duplicate account
    await databases.deleteDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      COLLECTIONS.USERS,
      deleteUserId
    );

    console.log('✅ Duplicate account deleted successfully!\n');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    DELETION COMPLETE                          ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Summary:');
    console.log(`   ✅ Deleted: ${deleteAccount.email} (${deleteUserId})`);
    console.log(`   ✅ Kept: ${keepAccount.email} (${keepUserId})`);
    console.log(`   ✅ WORKERS profile remains intact with all documents\n`);

    console.log('Next Steps:');
    console.log('   1. User should login with: minny4luv.ek@gmail.com');
    console.log('   2. Admin page will now show correct WORKERS profile');
    console.log('   3. Documents will be visible ✅\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

async function main() {
  console.log('⚠️  This script will delete the duplicate user account:\n');
  console.log('   DELETE: 69515c050027ac8246f7 (twinsluv0007@gmail.com)');
  console.log('   KEEP:   694db448001f481c1f9d (minny4luv.ek@gmail.com)\n');
  console.log('   Starting in 3 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  await deleteDuplicateUser();
}

main();
