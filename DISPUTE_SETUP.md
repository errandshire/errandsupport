# Dispute System Setup

## Appwrite Collection Required

### Collection: `disputes`

Create this collection in your Appwrite Console:

**Attributes:**
- `bookingId` (string, required, indexed)
- `clientId` (string, required, indexed)
- `workerId` (string, required, indexed)
- `category` (string, required) - enum: quality, incomplete, damage, time, communication, other
- `clientStatement` (string, required) - Client's explanation
- `workerResponse` (string, optional) - Worker's response
- `adminNotes` (string, optional) - Admin's notes
- `evidence` (string[], optional) - Array of evidence URLs
- `status` (string, required) - enum: pending, worker_responded, under_review, resolved
- `resolution` (string, optional) - enum: approve_worker, refund_client, resolve_themselves
- `amount` (double, required) - Disputed amount
- `createdAt` (datetime, required)
- `updatedAt` (datetime, required)
- `resolvedAt` (datetime, optional)

**Permissions:**
- Create: Users (any authenticated user)
- Read: Users (client, worker, and admin can read their disputes)
- Update: Admin only (for resolving disputes)

## Environment Variable

Add to your `.env`:
```
NEXT_PUBLIC_APPWRITE_DISPUTES_COLLECTION_ID=your_disputes_collection_id
```

## Dispute Flow

1. **Client raises dispute** (when work is marked completed by worker)
   - Client selects category and provides statement
   - Dispute status: `pending`
   - Worker and admin are notified

2. **Worker responds**
   - Worker provides their side of the story
   - Dispute status: `worker_responded`
   - Admin is notified

3. **Admin reviews**
   - Admin can see both statements
   - Admin can chat with both parties for more details
   - Dispute status: `under_review`

4. **Admin resolves**
   - **Option 1: Approve Worker** - Release payment to worker
   - **Option 2: Refund Client** - Return money to client wallet
   - **Option 3: Resolve Themselves** - Both parties work it out
   - Dispute status: `resolved`
   - Both parties are notified

## Pages Created

1. **Client**: Dispute button in booking confirmation modal
2. **Worker**: `/worker/disputes/[id]` - Respond to disputes
3. **Admin**: `/admin/disputes` - Full management interface
