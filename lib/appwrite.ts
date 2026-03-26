import { Client, Account, Databases, Storage, Functions, Teams } from 'appwrite';

// Environment variables (read at call time where needed for lazy client)
const APPWRITE_DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const APPWRITE_STORAGE_BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID!;

// Collections
export const COLLECTIONS = {
  USERS: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
  WORKERS: process.env.NEXT_PUBLIC_APPWRITE_WORKERS_COLLECTION_ID!,
  SERVICES: process.env.NEXT_PUBLIC_APPWRITE_SERVICES_COLLECTION_ID!,
  BOOKINGS: process.env.NEXT_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID!,
  JOBS: process.env.NEXT_PUBLIC_APPWRITE_JOBS_COLLECTION_ID!,
  JOB_APPLICATIONS: process.env.NEXT_PUBLIC_APPWRITE_JOB_APPLICATIONS_COLLECTION_ID!,
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
  WALLET_WITHDRAWALS: process.env.NEXT_PUBLIC_APPWRITE_WALLET_WITHDRAWALS_COLLECTION_ID!,
  // Phase 4: Worker Payout Collections
  BANK_ACCOUNTS: process.env.NEXT_PUBLIC_APPWRITE_BANK_ACCOUNTS_COLLECTION_ID!,
  WITHDRAWALS: process.env.NEXT_PUBLIC_APPWRITE_WITHDRAWALS_COLLECTION_ID!,
  // Platform Settings
  SETTINGS: process.env.NEXT_PUBLIC_APPWRITE_SETTINGS_COLLECTION_ID!,
  // Broadcast Collections
  BROADCAST_MESSAGES: 'broadcast_messages',
  BROADCAST_TEMPLATES: 'broadcast_templates',
  // Partner Program Collections
  PARTNERS: process.env.NEXT_PUBLIC_APPWRITE_PARTNERS_COLLECTION_ID!,
  REFERRALS: process.env.NEXT_PUBLIC_APPWRITE_REFERRALS_COLLECTION_ID!,
  PARTNER_COMMISSIONS: process.env.NEXT_PUBLIC_APPWRITE_PARTNER_COMMISSIONS_COLLECTION_ID!,
} as const;

// Lazy client — avoids setEndpoint(undefined) during `next build` / static analysis
let _client: Client | undefined;
let _account: Account | undefined;
let _databases: Databases | undefined;
let _storage: Storage | undefined;
let _functions: Functions | undefined;
let _teams: Teams | undefined;

function ensureClient(): Client {
  if (!_client) {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    if (!endpoint || !projectId) {
      throw new Error(
        'Appwrite: NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID are required'
      );
    }
    _client = new Client().setEndpoint(endpoint).setProject(projectId);
  }
  return _client;
}

function getAccount(): Account {
  if (!_account) _account = new Account(ensureClient());
  return _account;
}

function getDatabases(): Databases {
  if (!_databases) _databases = new Databases(ensureClient());
  return _databases;
}

function getStorage(): Storage {
  if (!_storage) _storage = new Storage(ensureClient());
  return _storage;
}

function getFunctions(): Functions {
  if (!_functions) _functions = new Functions(ensureClient());
  return _functions;
}

function getTeams(): Teams {
  if (!_teams) _teams = new Teams(ensureClient());
  return _teams;
}

function lazyService<T extends object>(getter: () => T): T {
  return new Proxy({} as T, {
    get(_, prop) {
      const svc = getter();
      const v = (svc as Record<string | symbol, unknown>)[prop as string];
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(svc) : v;
    },
  });
}

export const client = lazyService(ensureClient) as Client;
export const account = lazyService(getAccount) as Account;
export const databases = lazyService(getDatabases) as Databases;
export const storage = lazyService(getStorage) as Storage;
export const functions = lazyService(getFunctions) as Functions;
export const teams = lazyService(getTeams) as Teams;

// Database and Storage IDs
export const DATABASE_ID = APPWRITE_DATABASE_ID;
export const STORAGE_BUCKET_ID = APPWRITE_STORAGE_BUCKET_ID;

// Helper functions
export const appwriteConfig = {
  get endpoint() {
    return process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
  },
  get projectId() {
    return process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
  },
  databaseId: APPWRITE_DATABASE_ID,
  storageBucketId: APPWRITE_STORAGE_BUCKET_ID,
  collections: COLLECTIONS,
};

export default client;
