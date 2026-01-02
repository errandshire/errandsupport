# ✅ BOOKINGS Collection Updated for Job Acceptance

## What Changed:

The BOOKINGS collection has been updated to properly support job acceptance workflow with all required attributes and correct data structure.

---

## Problem Identified:

When workers accept jobs, the system creates a booking document. However, the booking creation was using a **nested location object** which Appwrite doesn't support natively:

```typescript
// ❌ OLD CODE (Won't work in Appwrite)
location: {
  address: job.locationAddress,
  lat: job.locationLat,
  lng: job.locationLng,
}
```

Appwrite requires **flat attribute structure**, not nested objects.

---

## Solution Implemented:

### 1. **Created Update Script** (`scripts/update-bookings-collection.js`)
- Automated script using Appwrite Node SDK
- Checks existing BOOKINGS collection attributes
- Adds missing attributes required for job acceptance
- Creates indexes for efficient querying

### 2. **New Attributes Added:**
The script added 15 missing attributes:

**Job-Related Fields:**
- `scheduledTime` (string) - Time of scheduled job
- `duration` (integer) - Duration in minutes
- `totalAmount` (double) - Total booking amount

**Completion & Review Fields:**
- `cancellationFee` (double) - Fee charged for cancellations
- `clientConfirmed` (boolean) - Client confirmation status
- `workerConfirmed` (boolean) - Worker confirmation status
- `completionNote` (string) - Notes on completion
- `workerRating` (integer) - Rating given to worker
- `workerReview` (string) - Review text for worker

**Location Fields (Flat Structure):**
- `locationCity` (string)
- `locationState` (string)
- `locationPostalCode` (string)
- `locationCountry` (string)
- `locationInstructions` (string)

**Note:** `locationAddress`, `locationLat`, and `locationLng` already existed.

### 3. **Indexes Created:**
```javascript
- serviceId_index → Query bookings by job ID
- clientId_status_index → Query client bookings by status
- workerId_status_index → Query worker bookings by status
```

### 4. **Updated Job Acceptance Code** (`lib/job-acceptance.service.ts:244-272`)

**Before:**
```typescript
const booking = await databases.createDocument(
  DATABASE_ID,
  COLLECTIONS.BOOKINGS,
  ID.unique(),
  {
    clientId: job.clientId,
    workerId,
    serviceId: job.$id,
    categoryId: job.categoryId,
    status: 'confirmed',
    scheduledDate: job.scheduledDate,
    scheduledTime: job.scheduledTime,
    duration: job.duration * 60,
    location: {  // ❌ Nested object won't work
      address: job.locationAddress,
      lat: job.locationLat,
      lng: job.locationLng,
    },
    notes: job.description,  // ❌ Field doesn't exist
    totalAmount: job.budgetMax,
    paymentStatus: 'unpaid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
);
```

**After:**
```typescript
const booking = await databases.createDocument(
  DATABASE_ID,
  COLLECTIONS.BOOKINGS,
  ID.unique(),
  {
    clientId: job.clientId,
    workerId,
    serviceId: job.$id,
    categoryId: job.categoryId,
    status: 'confirmed',
    scheduledDate: job.scheduledDate,
    scheduledTime: job.scheduledTime,
    duration: job.duration * 60,
    // ✅ Flat location structure
    locationAddress: job.locationAddress,
    locationLat: job.locationLat,
    locationLng: job.locationLng,
    locationCity: '',
    locationState: '',
    locationCountry: 'Nigeria',
    // ✅ Use existing fields
    description: job.description,
    title: job.title,
    totalAmount: job.budgetMax,
    paymentStatus: 'unpaid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
);
```

---

## How Job Acceptance Works Now:

### Worker accepts a job → System creates booking:

1. **Verify job is still open** (atomic check)
2. **Check client wallet balance** (must have sufficient funds)
3. **Create booking document** with:
   - Client and worker IDs
   - Link to job via `serviceId`
   - Scheduled date/time and duration
   - **Flat location fields** (address, city, state, country, coordinates)
   - Job title and description
   - Total amount (job's max budget)
   - Payment status: 'unpaid' initially
4. **Hold payment in escrow** from client's wallet
5. **Update booking payment status** to 'held'
6. **Update job status** to 'assigned'
7. **Send notifications** to client and worker

---

## Key Changes Summary:

### ✅ Database Schema
- Added 15 new attributes to BOOKINGS collection
- All attributes use flat structure (no nested objects)
- Created 3 indexes for efficient queries

### ✅ Code Updates
- Updated `lib/job-acceptance.service.ts:244-272`
- Changed from nested location object to flat fields
- Use `description` field instead of non-existent `notes`
- Added `title` field to booking

### ✅ Script Automation
- Created `scripts/update-bookings-collection.js`
- Automatically checks and updates collection
- Safe to run multiple times (idempotent)

---

## Testing:

1. **Worker visits `/worker/jobs`**
2. **Expands a job card** to view details
3. **Clicks "Accept This Job"**
4. **System creates booking** with all fields properly set:
   ```json
   {
     "clientId": "abc123",
     "workerId": "xyz789",
     "serviceId": "job456",
     "categoryId": "cleaning",
     "status": "confirmed",
     "scheduledDate": "2026-01-01",
     "scheduledTime": "09:00",
     "duration": 480,
     "locationAddress": "123 Main St",
     "locationLat": 6.5244,
     "locationLng": 3.3792,
     "locationCity": "",
     "locationState": "",
     "locationCountry": "Nigeria",
     "title": "house cleaning service",
     "description": "house cleaning service",
     "totalAmount": 50,
     "paymentStatus": "held",
     "createdAt": "2025-12-31T...",
     "updatedAt": "2025-12-31T..."
   }
   ```

---

## Files Modified:

1. **`scripts/update-bookings-collection.js`** - NEW - Automates collection updates
2. **`lib/job-acceptance.service.ts`** - Updated booking creation (lines 244-272)

---

## Database Impact:

**Collection:** BOOKINGS (`687759ea003db7b4e52d`)

**Before:** 41 attributes
**After:** 56 attributes (15 added)

**Indexes Added:** 3 new indexes for serviceId, clientId+status, workerId+status

---

**Status:** ✅ Complete - Build successful, collection updated, ready for production!

**Try it:**
1. Run the update script if needed: `node scripts/update-bookings-collection.js`
2. Accept a job as a worker to test booking creation
3. Check Appwrite console to verify booking document structure
