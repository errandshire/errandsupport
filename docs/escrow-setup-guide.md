# Phase 1 Escrow Setup Guide

## Prerequisites
- Appwrite Console access
- Database already created
- Admin permissions

## Step 1: Environment Variables

Add these to your `.env.local` file:

```bash
# Phase 1 Escrow Collections
NEXT_PUBLIC_APPWRITE_ESCROW_TRANSACTIONS_COLLECTION_ID=escrow_transactions
NEXT_PUBLIC_APPWRITE_USER_BALANCES_COLLECTION_ID=user_balances
NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID=transactions
```

## Step 2: Create Collections in Appwrite Console

### Collection 1: ESCROW_TRANSACTIONS

1. **Create Collection:**
   - Collection ID: `escrow_transactions`
   - Name: `Escrow Transactions`

2. **Add Attributes:**
   ```
   bookingId        | String  | Size: 255 | Required ✓ | Array ✗
   clientId         | String  | Size: 255 | Required ✓ | Array ✗  
   workerId         | String  | Size: 255 | Required ✓ | Array ✗
   amount           | Integer |           | Required ✓ | Array ✗
   platformFee      | Integer |           | Required ✓ | Array ✗
   workerAmount     | Integer |           | Required ✓ | Array ✗
   status           | String  | Size: 50  | Required ✓ | Array ✗
   paystackReference| String  | Size: 255 | Required ✓ | Array ✗
   createdAt        | DateTime|           | Required ✓ | Array ✗
   releasedAt       | DateTime|           | Required ✗ | Array ✗
   metadata         | String  | Size: 2048| Required ✗ | Array ✗
   ```

3. **Create Indexes:**
   - `bookingId_unique` → Type: Unique, Attribute: bookingId
   - `clientId_index` → Type: Key, Attribute: clientId
   - `workerId_index` → Type: Key, Attribute: workerId
   - `status_index` → Type: Key, Attribute: status
   - `paystack_unique` → Type: Unique, Attribute: paystackReference
   - `created_desc` → Type: Key, Attribute: createdAt, Order: DESC

4. **Set Permissions:**
   - **Create**: `role:admin`, `role:server`
   - **Read**: `role:admin`, `role:server`, `user:[USER_ID]` (for own transactions)
   - **Update**: `role:admin`, `role:server`
   - **Delete**: `role:admin`

---

### Collection 2: USER_BALANCES

1. **Create Collection:**
   - Collection ID: `user_balances`
   - Name: `User Balances`

2. **Add Attributes:**
   ```
   userId           | String  | Size: 255 | Required ✓ | Array ✗
   availableBalance | Integer |           | Required ✓ | Array ✗
   pendingBalance   | Integer |           | Required ✓ | Array ✗
   totalEarnings    | Integer |           | Required ✓ | Array ✗
   totalWithdrawn   | Integer |           | Required ✓ | Array ✗
   currency         | String  | Size: 10  | Required ✓ | Array ✗
   updatedAt        | DateTime|           | Required ✓ | Array ✗
   ```

3. **Create Indexes:**
   - `userId_unique` → Type: Unique, Attribute: userId
   - `updated_desc` → Type: Key, Attribute: updatedAt, Order: DESC

4. **Set Permissions:**
   - **Create**: `role:admin`, `role:server`
   - **Read**: `role:admin`, `role:server`, `user:[USER_ID]` (for own balance)
   - **Update**: `role:admin`, `role:server`
   - **Delete**: `role:admin`

---

### Collection 3: TRANSACTIONS

1. **Create Collection:**
   - Collection ID: `transactions`
   - Name: `Transactions`

2. **Add Attributes:**
   ```
   userId           | String  | Size: 255 | Required ✓ | Array ✗
   type             | String  | Size: 50  | Required ✓ | Array ✗
   amount           | Integer |           | Required ✓ | Array ✗
   description      | String  | Size: 500 | Required ✓ | Array ✗
   reference        | String  | Size: 255 | Required ✓ | Array ✗
   bookingId        | String  | Size: 255 | Required ✗ | Array ✗
   status           | String  | Size: 50  | Required ✓ | Array ✗
   createdAt        | DateTime|           | Required ✓ | Array ✗
   ```

3. **Create Indexes:**
   - `userId_index` → Type: Key, Attribute: userId
   - `type_index` → Type: Key, Attribute: type
   - `status_index` → Type: Key, Attribute: status
   - `reference_unique` → Type: Unique, Attribute: reference
   - `booking_index` → Type: Key, Attribute: bookingId
   - `created_desc` → Type: Key, Attribute: createdAt, Order: DESC

4. **Set Permissions:**
   - **Create**: `role:admin`, `role:server`
   - **Read**: `role:admin`, `role:server`, `user:[USER_ID]` (for own transactions)
   - **Update**: `role:admin`, `role:server`
   - **Delete**: `role:admin`

---

## Step 3: Verify Setup

### Test Collection Creation

Run this script to verify collections are accessible:

```javascript
// Test script (add to a temporary page or console)
import { databases, COLLECTIONS } from '@/lib/appwrite';

async function testCollections() {
  try {
    // Test escrow transactions collection
    await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.ESCROW_TRANSACTIONS,
      []
    );
    console.log('✅ ESCROW_TRANSACTIONS collection accessible');
    
    // Test user balances collection  
    await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.USER_BALANCES,
      []
    );
    console.log('✅ USER_BALANCES collection accessible');
    
    // Test transactions collection
    await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      COLLECTIONS.TRANSACTIONS,
      []
    );
    console.log('✅ TRANSACTIONS collection accessible');
    
    console.log('🎉 All escrow collections set up successfully!');
    
  } catch (error) {
    console.error('❌ Collection setup error:', error);
  }
}

testCollections();
```

### Test Utilities

```javascript
// Test escrow utilities
import { EscrowUtils, TransactionDescriptions } from '@/lib/escrow-utils';

// Test calculations
const testAmount = EscrowUtils.toKobo(1500); // 1500 NGN
console.log('Amount in kobo:', testAmount);
console.log('Platform fee:', EscrowUtils.calculatePlatformFee(testAmount));
console.log('Worker amount:', EscrowUtils.calculateWorkerAmount(testAmount));
console.log('Formatted:', EscrowUtils.formatAmount(testAmount));

// Test breakdown
const breakdown = EscrowUtils.calculateBreakdown(testAmount);
console.log('Breakdown:', breakdown);

// Test descriptions
console.log('Escrow hold:', TransactionDescriptions.escrowHold('House Cleaning', 'John Doe'));
```

---

## Step 4: Common Issues & Solutions

### Issue: Collection Not Found
```
Error: Collection with the requested ID could not be found
```
**Solution:** Verify collection ID matches environment variable exactly.

### Issue: Permission Denied
```
Error: Missing permissions for this resource
```
**Solution:** Check collection permissions include `role:server` for API operations.

### Issue: Attribute Type Mismatch
```
Error: Invalid document structure
```
**Solution:** Verify attribute types match the schema exactly (String vs Integer vs DateTime).

### Issue: Index Creation Failed
```
Error: Index with the same name already exists
```
**Solution:** Use unique index names and verify attribute names are correct.

---

## Step 5: Next Steps

Once collections are created successfully:

1. ✅ Database structure complete
2. ⏳ Create Appwrite Functions for escrow operations
3. ⏳ Update payment webhook to use new escrow system
4. ⏳ Test with sample transactions
5. ⏳ Integrate with existing booking flow

---

## Rollback Plan

If you need to remove the collections:

1. **In Appwrite Console:**
   - Go to Database > Collections
   - Delete `transactions`
   - Delete `user_balances` 
   - Delete `escrow_transactions`

2. **In Code:**
   - Comment out escrow collection IDs in `.env.local`
   - Remove escrow types from `lib/types.ts`
   - Remove escrow utilities from `lib/escrow-utils.ts`

The existing system will continue to work unchanged. 