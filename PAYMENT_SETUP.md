# Payment System Setup Guide

## 🔴 CRITICAL: You MUST do these steps before the system works!

### 1. Create Appwrite Collections

Go to your Appwrite Console and create these collections in your database:

#### Collection: `virtual_wallets`
**Attributes:**
- `userId` (string, required, indexed)
- `balance` (double, required, default: 0)
- `escrow` (double, required, default: 0)
- `totalEarned` (double, required, default: 0)
- `totalSpent` (double, required, default: 0)
- `updatedAt` (datetime, required)

#### Collection: `wallet_transactions`
**Attributes:**
- `userId` (string, required, indexed)
- `type` (string, required) - enum: topup, booking_hold, booking_release, booking_refund, withdraw
- `amount` (double, required)
- `bookingId` (string, optional, indexed)
- `reference` (string, required, indexed)
- `status` (string, required) - enum: completed, pending, failed
- `description` (string, required)
- `createdAt` (datetime, required)

#### Collection: `bank_accounts`
**Attributes:**
- `userId` (string, required, indexed)
- `accountNumber` (string, required)
- `accountName` (string, required)
- `bankName` (string, required)
- `bankCode` (string, required)
- `paystackRecipientCode` (string, optional)
- `isDefault` (boolean, required, default: false)
- `createdAt` (datetime, required)

#### Collection: `withdrawals`
**Attributes:**
- `userId` (string, required, indexed)
- `amount` (double, required)
- `bankAccountId` (string, required)
- `status` (string, required) - enum: pending, processing, completed, failed
- `reference` (string, required, indexed)
- `paystackTransferCode` (string, optional)
- `failureReason` (string, optional)
- `createdAt` (datetime, required)
- `completedAt` (datetime, optional)

#### Update `bookings` Collection
Add this attribute:
- `paymentStatus` (string, required, default: unpaid) - enum: unpaid, held, released, refunded

### 2. Update .env File

Make sure you have these in your `.env`:
```
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
PAYSTACK_SECRET_KEY=sk_live_xxxxx

# Collection IDs (get from Appwrite after creating collections)
NEXT_PUBLIC_APPWRITE_VIRTUAL_WALLETS_COLLECTION_ID=your_collection_id
NEXT_PUBLIC_APPWRITE_WALLET_TRANSACTIONS_COLLECTION_ID=your_collection_id
NEXT_PUBLIC_APPWRITE_BANK_ACCOUNTS_COLLECTION_ID=your_collection_id
NEXT_PUBLIC_APPWRITE_WITHDRAWALS_COLLECTION_ID=your_collection_id
```

### 3. Configure Paystack Webhook

1. Go to Paystack Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/webhooks/paystack`
3. Make sure your domain is live (localhost won't work for webhooks)
4. For local testing, use ngrok:
   ```bash
   ngrok http 3000
   # Use the ngrok URL for webhook
   ```

### 4. Set Appwrite Permissions

For each collection, set these permissions:

**virtual_wallets:**
- Create: Users (any authenticated user)
- Read: Users (owner only) - Add rule: `userId` = `$userId`
- Update: Users (owner only) - Add rule: `userId` = `$userId`

**wallet_transactions:**
- Create: Users (any authenticated user)
- Read: Users (owner only) - Add rule: `userId` = `$userId`

**bank_accounts:**
- Create: Users (any authenticated user)
- Read: Users (owner only) - Add rule: `userId` = `$userId`
- Update: Users (owner only) - Add rule: `userId` = `$userId`
- Delete: Users (owner only) - Add rule: `userId` = `$userId`

**withdrawals:**
- Create: Users (any authenticated user)
- Read: Users (owner only) - Add rule: `userId` = `$userId`
- Update: Server (for webhook updates)

### 5. Test the Flow

1. **Client Top-Up:**
   - Login as client
   - Go to `/client/wallet`
   - Click "Add Money"
   - Add ₦1000 (use test card for testing)
   - Wait for redirect and webhook
   - Check wallet balance

2. **Client Books Worker:**
   - Browse workers at `/workers`
   - Click "Book Worker"
   - Fill form
   - Submit
   - Check wallet - ₦1000 should move to escrow

3. **Worker Completes Job:**
   - Worker accepts booking
   - Worker marks as complete
   - Client confirms completion
   - Check worker wallet - should show ₦1000

4. **Worker Withdraws:**
   - Worker goes to `/worker/wallet`
   - Adds bank account
   - Withdraws funds
   - Money arrives in bank (24 hours)

## ⚠️ Known Issues to Fix:

1. **No retry logic** - If Paystack webhook fails, manual intervention needed
2. **No refund button in UI** - Clients can't self-cancel bookings yet
3. **No dispute resolution** - If client/worker disagree, admin must intervene manually
4. **No balance alerts** - Users don't get notified when balance is low

## 🔒 Security Checklist:

- ✅ Webhook signature verification
- ✅ Idempotent transactions
- ✅ Balance checks before deductions
- ✅ No amount conversions (always Naira)
- ✅ Escrow protection for bookings
- ⚠️ No rate limiting on API endpoints
- ⚠️ No fraud detection

## 📱 For Production:

1. Switch to live Paystack keys
2. Add rate limiting to API routes
3. Set up monitoring (Sentry, LogRocket)
4. Add email notifications for transactions
5. Implement proper error boundaries
6. Add transaction export feature
7. Implement admin panel for disputes

---

**The system is SIMPLE and SECURE for the core flow, but you MUST complete the setup steps above!**
