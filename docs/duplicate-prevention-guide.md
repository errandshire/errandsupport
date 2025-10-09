# Duplicate Prevention Guide

This document outlines the duplicate prevention measures implemented across the application to ensure data integrity and prevent race conditions.

## Overview

Duplicate prevention is critical for maintaining data consistency, especially in scenarios involving:
- User registration and onboarding
- Payment processing and webhooks
- Notification systems
- Financial transactions
- Document creation

## Implemented Solutions

### 1. Worker Profiles (WORKERS Collection)

**Location**: `app/onboarding/page.tsx`

**Problem**: Multiple worker profiles could be created for the same user during onboarding.

**Solution**: Implemented upsert pattern in `WorkerProfileStep`:
```typescript
// Check if worker profile already exists
const existingWorkers = await databases.listDocuments(
  DATABASE_ID,
  COLLECTIONS.WORKERS,
  [Query.equal('userId', user.$id)]
);

if (existingWorkers.documents.length > 0) {
  // Update existing worker profile
  await databases.updateDocument(/* ... */);
} else {
  // Create new worker profile
  await databases.createDocument(/* ... */);
}
```

**Recommendation**: Add unique index on `userId` in Appwrite Console.

### 2. User Profiles (USERS Collection)

**Location**: `hooks/use-auth.ts`

**Problem**: User profiles could be created multiple times during authentication.

**Solution**: Check for existing profile before creation:
```typescript
try {
  const existingProfile = await databases.getDocument(
    DATABASE_ID,
    COLLECTIONS.USERS,
    profileData.userId
  );
  if (existingProfile) {
    return existingProfile as unknown as User;
  }
} catch (error) {
  // Profile doesn't exist, continue with creation
}
```

**Recommendation**: Use deterministic document IDs (docId = userId).

### 3. Virtual Wallets (VIRTUAL_WALLETS Collection)

**Location**: `lib/virtual-wallet-service.ts`

**Problem**: Multiple wallets could be created for the same user.

**Solution**: Check for existing wallet before creation:
```typescript
const existingWallets = await databases.listDocuments(
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  COLLECTIONS.VIRTUAL_WALLETS,
  [Query.equal('userId', userId)]
);

if (existingWallets.documents.length > 0) {
  return existingWallets.documents[0] as unknown as VirtualWallet;
}
```

**Recommendation**: Add unique index on `userId` and use deterministic document IDs.

### 4. Wallet Transactions (WALLET_TRANSACTIONS Collection)

**Location**: `lib/virtual-wallet-service.ts`

**Problem**: Duplicate transaction records for the same payment reference.

**Solution**: Check for existing transaction by reference:
```typescript
const existingTransactions = await databases.listDocuments(
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  COLLECTIONS.WALLET_TRANSACTIONS,
  [Query.equal('reference', data.reference), Query.limit(1)]
);

if (existingTransactions.documents.length > 0) {
  console.log('Wallet transaction already exists for reference:', data.reference);
  return;
}
```

**Recommendation**: Add unique index on `reference` field.

### 5. Escrow Transactions (ESCROW_TRANSACTIONS Collection)

**Location**: `lib/escrow-service.ts`

**Problem**: Duplicate escrow transactions for the same Paystack reference.

**Solution**: Check for existing escrow transaction:
```typescript
const existingEscrow = await databases.listDocuments(
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  COLLECTIONS.ESCROW_TRANSACTIONS,
  [Query.equal('paystackReference', paystackReference), Query.limit(1)]
);

if (existingEscrow.documents.length > 0) {
  console.log('Escrow transaction already exists for paystack reference:', paystackReference);
  return existingEscrow.documents[0] as unknown as EscrowTransaction;
}
```

**Recommendation**: Add unique index on `paystackReference` field.

### 6. Bank Accounts (BANK_ACCOUNTS Collection)

**Location**: `lib/worker-payout-service.ts`

**Problem**: Multiple bank accounts could be created for the same user.

**Solution**: Implemented upsert pattern:
```typescript
const existingAccounts = await databases.listDocuments(
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  COLLECTIONS.BANK_ACCOUNTS,
  [Query.equal('userId', userId), Query.limit(1)]
);

if (existingAccounts.documents.length > 0) {
  // Update existing bank account
  bankAccount = await databases.updateDocument(/* ... */);
} else {
  // Create new bank account
  bankAccount = await databases.createDocument(/* ... */);
}
```

**Recommendation**: Add unique index on `userId` or `userId + accountNumber`.

### 7. Withdrawal Requests (WALLET_WITHDRAWALS Collection)

**Location**: `lib/virtual-wallet-service.ts`

**Problem**: Duplicate withdrawal requests for the same reference.

**Solution**: Check for existing withdrawal request:
```typescript
const existingWithdrawals = await databases.listDocuments(
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  COLLECTIONS.WALLET_WITHDRAWALS,
  [Query.equal('reference', reference), Query.limit(1)]
);

if (existingWithdrawals.documents.length > 0) {
  return {
    success: true,
    withdrawalId: existingWithdrawals.documents[0].$id,
    reference,
    message: 'Withdrawal request already exists'
  };
}
```

**Recommendation**: Add unique index on `reference` field.

### 8. Notifications (NOTIFICATIONS Collection)

**Location**: `lib/notification-service.ts`

**Problem**: Duplicate notifications could be created rapidly.

**Solution**: Added deduplication with time window:
```typescript
if (!idempotencyKey) {
  const recentNotifications = await databases.listDocuments(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    COLLECTIONS.NOTIFICATIONS,
    [
      Query.equal('userId', userId),
      Query.equal('title', title || 'Notification'),
      Query.equal('message', message),
      Query.greaterThan('createdAt', new Date(Date.now() - 5 * 60 * 1000).toISOString()),
      Query.limit(1)
    ]
  );

  if (recentNotifications.documents.length > 0) {
    console.log('Duplicate notification prevented:', { userId, title, message });
    return;
  }
}
```

**Recommendation**: Add optional `idempotencyKey` field and unique index on it.

## Appwrite Database Indexes to Add

To enforce duplicate prevention at the database level, add these unique indexes in Appwrite Console:

### Required Unique Indexes

1. **WORKERS Collection**
   - `userId` (unique)

2. **VIRTUAL_WALLETS Collection**
   - `userId` (unique)

3. **USER_BALANCES Collection**
   - `userId` (unique)

4. **WALLET_TRANSACTIONS Collection**
   - `reference` (unique)

5. **ESCROW_TRANSACTIONS Collection**
   - `paystackReference` (unique)

6. **BANK_ACCOUNTS Collection**
   - `userId` (unique) OR `userId + accountNumber` (composite unique)

7. **WALLET_WITHDRAWALS Collection**
   - `reference` (unique)

### Optional Indexes

8. **NOTIFICATIONS Collection**
   - `idempotencyKey` (unique, when used)

## Best Practices

### 1. Use Deterministic Document IDs
For singleton resources (one per user), use the user ID as the document ID:
```typescript
await databases.createDocument(
  DATABASE_ID,
  COLLECTION_ID,
  userId, // Use userId as document ID
  data
);
```

### 2. Implement Idempotency Keys
For operations that might be retried, use idempotency keys:
```typescript
const idempotencyKey = `${operation}_${userId}_${timestamp}`;
```

### 3. Check Before Create
Always check for existing records before creating new ones:
```typescript
const existing = await databases.listDocuments(
  DATABASE_ID,
  COLLECTION_ID,
  [Query.equal('uniqueField', value), Query.limit(1)]
);

if (existing.documents.length > 0) {
  return existing.documents[0];
}
```

### 4. Use Upsert Patterns
For resources that should be updated if they exist:
```typescript
if (existing.documents.length > 0) {
  return await databases.updateDocument(/* ... */);
} else {
  return await databases.createDocument(/* ... */);
}
```

### 5. Handle Race Conditions
Use proper error handling for concurrent operations:
```typescript
try {
  return await databases.createDocument(/* ... */);
} catch (error) {
  if (error.code === 409) { // Conflict
    // Document already exists, fetch and return it
    return await databases.getDocument(/* ... */);
  }
  throw error;
}
```

## Testing Duplicate Prevention

### 1. Concurrent Requests
Test with multiple simultaneous requests to ensure only one record is created.

### 2. Webhook Retries
Test payment webhook retries to ensure idempotency.

### 3. User Registration
Test rapid user registration to prevent duplicate profiles.

### 4. Notification Spam
Test rapid notification creation to ensure deduplication works.

## Monitoring

Monitor for duplicate prevention logs:
- "Duplicate notification prevented"
- "Wallet transaction already exists for reference"
- "Escrow transaction already exists for paystack reference"
- "User profile already exists"
- "Withdrawal request already exists for reference"

These logs indicate the duplicate prevention is working correctly.

## Future Improvements

1. **Database-Level Constraints**: Add unique indexes in Appwrite Console
2. **Distributed Locks**: For high-concurrency scenarios
3. **Event Sourcing**: For audit trails and duplicate detection
4. **Message Queues**: For asynchronous processing with deduplication
5. **Caching**: For frequently accessed singleton resources

## Conclusion

The implemented duplicate prevention measures provide a robust foundation for data integrity. Regular monitoring and testing ensure these measures continue to work effectively as the application scales.
