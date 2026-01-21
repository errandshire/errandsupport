/**
 * Script to get virtual account ID for a user by email
 * Run this with: npx tsx scripts/get-virtual-id.ts <email>
 */

import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const USERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;
const VIRTUAL_WALLETS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_VIRTUAL_WALLETS_COLLECTION_ID!;

async function getVirtualId(email: string) {
  try {
    console.log(`\nSearching for user with email: ${email}`);

    // First, find the user by email
    const users = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('email', email)]
    );

    if (users.documents.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = users.documents[0];
    console.log(`\n✅ User found:`);
    console.log(`User ID: ${user.$id}`);
    console.log(`Name: ${user.name || 'N/A'}`);
    console.log(`Email: ${user.email}`);

    // Now find the virtual wallet for this user
    const wallets = await databases.listDocuments(
      DATABASE_ID,
      VIRTUAL_WALLETS_COLLECTION_ID,
      [Query.equal('userId', user.$id)]
    );

    if (wallets.documents.length === 0) {
      console.log('\n⚠️  No virtual wallet found for this user');
      return;
    }

    const wallet = wallets.documents[0];
    console.log(`\n💳 Virtual Wallet Information:`);
    console.log(`Virtual Account ID: ${wallet.virtualAccountId || 'N/A'}`);
    console.log(`Account Number: ${wallet.accountNumber || 'N/A'}`);
    console.log(`Bank Name: ${wallet.bankName || 'N/A'}`);
    console.log(`Account Name: ${wallet.accountName || 'N/A'}`);
    console.log(`Balance: ${wallet.balance || 0}`);
    console.log(`Status: ${wallet.status || 'N/A'}`);

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'damilolaolaosebikan18@gmail.com';
getVirtualId(email);
