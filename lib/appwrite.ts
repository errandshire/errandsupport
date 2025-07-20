import { Client, Account, Databases, Storage, Functions, Teams } from 'appwrite';

// Environment variables
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const APPWRITE_STORAGE_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID!;

// Collections
export const COLLECTIONS = {
  USERS: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
  WORKERS: process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID!,
  SERVICES: process.env.NEXT_PUBLIC_APPWRITE_SERVICES_COLLECTION_ID!,
  BOOKINGS: process.env.NEXT_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID!,
  REVIEWS: process.env.NEXT_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID!,
  CATEGORIES: process.env.NEXT_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID!,
  PAYMENTS: process.env.NEXT_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID!,
  MESSAGES: process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!,
  // Phase 1 Escrow Collections
  ESCROW_TRANSACTIONS: process.env.NEXT_PUBLIC_APPWRITE_ESCROW_TRANSACTIONS_COLLECTION_ID!,
  USER_BALANCES: process.env.NEXT_PUBLIC_APPWRITE_USER_BALANCES_COLLECTION_ID!,
  TRANSACTIONS: process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID!,
  // Additional Collections
  NOTIFICATIONS: process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID!,
  DISPUTES: process.env.NEXT_PUBLIC_APPWRITE_DISPUTES_COLLECTION_ID!,
  // Phase 2: Auto-Release Collections
  AUTO_RELEASE_RULES: process.env.NEXT_PUBLIC_APPWRITE_AUTO_RELEASE_RULES_COLLECTION_ID!,
  AUTO_RELEASE_LOGS: process.env.NEXT_PUBLIC_APPWRITE_AUTO_RELEASE_LOGS_COLLECTION_ID!,
  // Phase 3: Virtual Wallet Collections
  VIRTUAL_WALLETS: process.env.NEXT_PUBLIC_APPWRITE_VIRTUAL_WALLETS_COLLECTION_ID!,
  WALLET_TRANSACTIONS: process.env.NEXT_PUBLIC_APPWRITE_WALLET_TRANSACTIONS_COLLECTION_ID!,
  WALLET_WITHDRAWALS: process.env.NEXT_PUBLIC_APPWRITE_WALLET_WITHDRAWALS_COLLECTION_ID!
} as const;

// Initialize Appwrite client
export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// Initialize Appwrite services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
export const teams = new Teams(client);

// Database and Storage IDs
export const DATABASE_ID = APPWRITE_DATABASE_ID;
export const STORAGE_BUCKET_ID = APPWRITE_STORAGE_BUCKET_ID;

// Helper functions
export const appwriteConfig = {
  endpoint: APPWRITE_ENDPOINT,
  projectId: APPWRITE_PROJECT_ID,
  databaseId: APPWRITE_DATABASE_ID,
  storageBucketId: APPWRITE_STORAGE_BUCKET_ID,
  collections: COLLECTIONS,
};

export default client; 