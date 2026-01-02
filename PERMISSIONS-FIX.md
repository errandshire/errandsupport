# ✅ FIXED: Job Acceptance Permissions Error

## Issue Identified:

**Error:** "The current user is not authorized to perform the requested action."

**Root Cause:** When a worker tried to accept a job, the system was using the **client-side SDK with worker permissions** to update the JOBS collection. Workers don't have permission to update job documents, causing the 401 Unauthorized error.

**Flow that was failing:**
1. ✅ Eligibility check - PASSED
2. ✅ Booking created - SUCCESS
3. ✅ Payment held in escrow - SUCCESS
4. ❌ **Update job status** - **PERMISSION DENIED (401)**
5. Rollback everything

---

## Solution Implemented:

### Created Server-Side Admin Client

Added an admin client with API key authentication that has full permissions to update job documents.

**File: `app/api/jobs/accept/route.ts`** (Lines 8-15)

```typescript
// Create admin client for job updates (uses API key)
function getAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  return new Databases(client);
}
```

### Updated Job Acceptance Service

Modified `acceptJob()` to accept an optional admin client parameter for job updates.

**File: `lib/job-acceptance.service.ts`** (Line 236)

```typescript
static async acceptJob(
  jobId: string,
  workerId: string,
  workerData: { ... },
  adminDatabases?: any // Optional admin client with API key
): Promise<{ success: boolean; bookingId?: string; message: string }>
```

### Used Admin Client for All Admin Operations

Updated all database operations that require admin permissions:

**1. Update Booking Payment Status** (Line 323-334)
```typescript
const dbClient = adminDatabases || databases;
await dbClient.updateDocument(
  DATABASE_ID,
  COLLECTIONS.BOOKINGS,
  bookingId,
  { paymentStatus: 'held' }
);
```

**2. Update Job Status** (Line 337-350)
```typescript
await dbClient.updateDocument(
  DATABASE_ID,
  COLLECTIONS.JOBS,
  jobId,
  {
    status: JOB_STATUS.ASSIGNED,
    assignedWorkerId: workerId,
    assignedAt: new Date().toISOString(),
    bookingId,
    updatedAt: new Date().toISOString(),
  }
);
```

**3. Rollback Operations** (Lines 313-314, 356-357, 383-384)
```typescript
const rollbackClient = adminDatabases || databases;
await rollbackClient.deleteDocument(DATABASE_ID, COLLECTIONS.BOOKINGS, bookingId);
```

### Pass Admin Client from API Route

**File: `app/api/jobs/accept/route.ts`** (Lines 95-110)

```typescript
// Get admin client for job updates (requires API key permissions)
const adminDb = getAdminClient();

// Accept the job (handles race conditions, escrow, booking creation)
const result = await JobAcceptanceService.acceptJob(
  jobId,
  tempWorkerId,
  {
    name: user.name,
    email: user.email,
    isVerified: worker.isVerified || false,
    isActive: worker.isActive !== false,
    categories: worker.categories || [],
  },
  adminDb // Pass admin client for job updates
);
```

---

## How It Works Now:

### Job Acceptance Flow (With Fix):

1. **Worker clicks "Accept This Job"** on `/worker/jobs`
2. **API Route receives request** (`/api/jobs/accept`)
3. **API creates admin client** using API key (has full permissions)
4. **Eligibility check** (worker is verified, active, etc.)
5. **Create booking** (using admin client if needed)
6. **Hold payment in escrow** via WalletService
7. **Update booking status** to 'held' (**✅ using admin client**)
8. **Update job status** to 'assigned' (**✅ using admin client**)
9. **Success!** Return booking ID to worker
10. **Redirect** worker to `/worker/bookings?id={bookingId}`

### Error Handling:

**Permission Error Detection:**
```typescript
const isPermissionError = updateError.code === 401 || updateError.type === 'user_unauthorized';

return {
  success: false,
  message: isPermissionError
    ? 'Failed to complete job acceptance. Please try again.'
    : 'This job was just accepted by another worker',
};
```

**Rollback with Admin Permissions:**
All rollback operations now use admin client to ensure they have permission to delete documents if needed.

---

## Testing:

### Before Fix:
```
✅ Eligibility check passed!
✅ Job is open, proceeding with acceptance...
✅ Held ₦50 for booking 6954fd940003c2296471
❌ Job already assigned, rolling back: AppwriteException: The current user is not authorized
```

### After Fix (Expected):
```
✅ Eligibility check passed!
✅ Job is open, proceeding with acceptance...
✅ Held ₦50 for booking [bookingId]
✅ Job status updated to 'assigned'
✅ Job [jobId] accepted by worker [workerId], booking [bookingId] created
```

---

## Benefits:

✅ **Proper Permissions** - Admin operations use admin client with API key
✅ **Security** - Worker permissions unchanged (can't update jobs directly)
✅ **Clean Architecture** - Service accepts optional admin client
✅ **Backwards Compatible** - Falls back to regular client if admin not provided
✅ **Better Error Messages** - Differentiates permission errors from race conditions
✅ **Rollback Safety** - Ensures rollback operations have proper permissions

---

## Files Modified:

1. **`app/api/jobs/accept/route.ts`**
   - Added `getAdminClient()` function (lines 8-15)
   - Created admin client and passed to service (lines 95-110)

2. **`lib/job-acceptance.service.ts`**
   - Added `adminDatabases` parameter to `acceptJob()` (line 236)
   - Used admin client for booking updates (line 323-334)
   - Used admin client for job updates (line 337-350)
   - Used admin client for rollback operations (lines 313-314, 356-357, 383-384)
   - Improved error handling for permission errors (lines 363-370)

---

## Environment Requirements:

Ensure `APPWRITE_API_KEY` is set in `.env`:
```env
APPWRITE_API_KEY=standard_...your_api_key...
```

This API key must have:
- ✅ Read permission on USERS, WORKERS, JOBS collections
- ✅ Write permission on JOBS, BOOKINGS collections
- ✅ Delete permission on BOOKINGS collection (for rollback)

---

## Next Steps:

1. **Test job acceptance** - Try accepting a job as a worker
2. **Check console logs** - Verify you see:
   ```
   ✅ Job status updated to 'assigned'
   ✅ Job [jobId] accepted by worker [workerId], booking [bookingId] created
   ```
3. **Verify booking created** - Check `/worker/bookings` for the new booking
4. **Verify job updated** - Job should show status='assigned' in database

---

**Status:** ✅ Fixed - Build successful, ready for testing!

**Try it now:** Go to `/worker/jobs`, expand a job, and click "Accept This Job". It should work without permission errors!
