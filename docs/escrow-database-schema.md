# Phase 1: Escrow Database Schema

## Overview
This document outlines the database structure for Phase 1 of the escrow system implementation.

## Collections Required in Appwrite

### 1. ESCROW_TRANSACTIONS Collection
**Collection ID**: `escrow_transactions`

| Attribute | Type | Required | Index | Description |
|-----------|------|----------|-------|-------------|
| bookingId | string | Yes | Yes | Reference to booking document |
| clientId | string | Yes | Yes | User ID of client |
| workerId | string | Yes | Yes | User ID of worker |
| amount | integer | Yes | No | Total amount in kobo (NGN * 100) |
| platformFee | integer | Yes | No | Platform commission in kobo |
| workerAmount | integer | Yes | No | Amount worker receives (amount - platformFee) |
| status | string | Yes | Yes | 'pending', 'held', 'released', 'refunded' |
| paystackReference | string | Yes | Yes | Paystack payment reference |
| createdAt | datetime | Yes | Yes | Transaction creation timestamp |
| releasedAt | datetime | No | No | Timestamp when funds were released |
| metadata | string | No | No | JSON string with additional data |

**Indexes Required:**
- `bookingId` (unique)
- `clientId` 
- `workerId`
- `status`
- `paystackReference` (unique)
- `createdAt` (descending)

**Permissions:**
- Read: Users can read their own transactions
- Write: Only server/admin can write
- Delete: No delete permissions

---

### 2. USER_BALANCES Collection
**Collection ID**: `user_balances`

| Attribute | Type | Required | Index | Description |
|-----------|------|----------|-------|-------------|
| userId | string | Yes | Yes | User ID (unique per user) |
| availableBalance | integer | Yes | No | Available balance in kobo |
| pendingBalance | integer | Yes | No | Money held in escrow in kobo |
| totalEarnings | integer | Yes | No | Lifetime earnings in kobo |
| totalWithdrawn | integer | Yes | No | Total amount withdrawn in kobo |
| currency | string | Yes | No | Always 'NGN' for now |
| updatedAt | datetime | Yes | Yes | Last update timestamp |

**Indexes Required:**
- `userId` (unique)
- `updatedAt` (descending)

**Permissions:**
- Read: Users can read their own balance
- Write: Only server/admin can write
- Delete: No delete permissions

---

### 3. TRANSACTIONS Collection
**Collection ID**: `transactions`

| Attribute | Type | Required | Index | Description |
|-----------|------|----------|-------|-------------|
| userId | string | Yes | Yes | User ID |
| type | string | Yes | Yes | Transaction type |
| amount | integer | Yes | No | Amount in kobo |
| description | string | Yes | No | Human-readable description |
| reference | string | Yes | Yes | Unique transaction reference |
| bookingId | string | No | Yes | Related booking (if applicable) |
| status | string | Yes | Yes | 'completed', 'pending', 'failed' |
| createdAt | datetime | Yes | Yes | Transaction timestamp |

**Transaction Types:**
- `escrow_hold`: Money held in escrow
- `escrow_release`: Money released from escrow
- `withdrawal`: Money withdrawn to bank account
- `refund`: Money refunded to client

**Indexes Required:**
- `userId`
- `type`
- `status`
- `reference` (unique)
- `bookingId`
- `createdAt` (descending)

**Permissions:**
- Read: Users can read their own transactions
- Write: Only server/admin can write
- Delete: No delete permissions

---

## Environment Variables to Add

Add these to your `.env.local`:

```bash
# Phase 1 Escrow Collections
NEXT_PUBLIC_APPWRITE_ESCROW_TRANSACTIONS_COLLECTION_ID=escrow_transactions
NEXT_PUBLIC_APPWRITE_USER_BALANCES_COLLECTION_ID=user_balances
NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID=transactions
```

---

## Sample Data Structure

### EscrowTransaction Example:
```json
{
  "$id": "escrow_64f7b8c2a1b2c3d4e5f6g7h8",
  "bookingId": "booking_64f7b8c2a1b2c3d4e5f6g7h8",
  "clientId": "user_client_123",
  "workerId": "user_worker_456", 
  "amount": 1500000,
  "platformFee": 75000,
  "workerAmount": 1425000,
  "status": "held",
  "paystackReference": "booking_20241201_abc123",
  "createdAt": "2024-12-01T10:30:00.000Z",
  "releasedAt": null,
  "metadata": "{\"serviceName\":\"House Cleaning\",\"workerName\":\"John Doe\",\"clientName\":\"Jane Smith\",\"paymentMethod\":\"card\"}"
}
```

### UserBalance Example:
```json
{
  "$id": "balance_user_worker_456",
  "userId": "user_worker_456",
  "availableBalance": 2850000,
  "pendingBalance": 1425000,
  "totalEarnings": 4275000,
  "totalWithdrawn": 0,
  "currency": "NGN",
  "updatedAt": "2024-12-01T10:30:00.000Z"
}
```

### Transaction Example:
```json
{
  "$id": "txn_64f7b8c2a1b2c3d4e5f6g7h8",
  "userId": "user_worker_456",
  "type": "escrow_hold",
  "amount": 1425000,
  "description": "Payment held in escrow for House Cleaning service",
  "reference": "escrow_hold_booking_20241201_abc123",
  "bookingId": "booking_64f7b8c2a1b2c3d4e5f6g7h8",
  "status": "completed",
  "createdAt": "2024-12-01T10:30:00.000Z"
}
```

---

## Integration with Existing System

### Relationship to Existing Collections:

1. **BOOKINGS Collection**: 
   - `bookingId` in escrow_transactions references BOOKINGS.$id
   - Keep existing payment fields for backward compatibility

2. **PAYMENTS Collection**: 
   - Continue using for Paystack transaction records
   - Add escrow reference fields if needed

3. **USERS Collection**:
   - `userId`, `clientId`, `workerId` reference USERS.$id

### Migration Strategy:
1. Create new collections alongside existing ones
2. Update payment webhook to write to both systems
3. Gradually migrate existing payments to new escrow system
4. Eventually deprecate old payment flow

---

## Next Steps:
1. ✅ Create database schema documentation
2. ⏳ Create collections in Appwrite Console
3. ⏳ Create Appwrite Functions for escrow management
4. ⏳ Update payment webhook system
5. ⏳ Update booking flow integration 