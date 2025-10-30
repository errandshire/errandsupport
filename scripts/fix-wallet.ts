/**
 * One-time script to fix existing wallet with null values
 * Run this with: npx tsx scripts/fix-wallet.ts
 */

import { Client, Databases } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!); // You need API key for server-side operations

const databases = new Databases(client);

async function fixWallet() {
  try {
    const walletId = '68e78277003d63d2ab73'; // Your wallet document ID
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const collectionId = process.env.NEXT_PUBLIC_APPWRITE_VIRTUAL_WALLETS_COLLECTION_ID!;

    console.log('Updating wallet:', walletId);

    await databases.updateDocument(
      databaseId,
      collectionId,
      walletId,
      {
        balance: 0,
        escrow: 0,
        totalEarned: 0,
        totalSpend: 0,
        updatedAt: new Date().toISOString()
      }
    );

    console.log('✅ Wallet updated successfully!');
    console.log('All null values set to 0');

  } catch (error) {
    console.error('❌ Error updating wallet:', error);
  }
}

fixWallet();
