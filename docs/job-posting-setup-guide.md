# Job Posting & Bidding System - Setup Guide

## ✅ Completed Implementation

The following components have been successfully created:

### Backend Services (Phase 1-3)
- ✅ **Types & Constants** (`lib/types.ts`, `lib/constants.ts`)
- ✅ **Job Posting Service** (`lib/job-posting.service.ts`) - Create, update, cancel jobs
- ✅ **Job Acceptance Service** (`lib/job-acceptance.service.ts`) - Browse and accept jobs
- ✅ **Job Notification Service** (`lib/job-notification.service.ts`) - Email, SMS, in-app notifications

### Client UI (Phase 4)
- ✅ **Job Posting Modal** (`components/client/job-posting-modal.tsx`) - Multi-step form
- ✅ **Job Card Component** (`components/client/job-card.tsx`) - Display jobs
- ✅ **Client Jobs Page** (`app/(dashboard)/client/jobs/page.tsx`) - Manage posted jobs

### Worker UI (Phase 5)
- ✅ **Worker Jobs Browse Page** (`app/(dashboard)/worker/jobs/page.tsx`) - Browse available jobs
- ✅ **Job Details Modal** (`components/worker/job-details-modal.tsx`) - View & accept jobs

### API Endpoints (Phase 6-7)
- ✅ **Job Accept Endpoint** (`app/api/jobs/accept/route.ts`) - Handle job acceptance
- ✅ **Job Expiry Cron** (`app/api/cron/expire-jobs/route.ts`) - Auto-expire old jobs

---

## 📋 Setup Instructions

### Step 1: Create JOBS Collection in Appwrite

1. **Go to Appwrite Console** → Your Project → Databases → Create Collection

2. **Collection Name:** `jobs`

3. **Create Attributes:**

```
clientId          string, required, size: 50
  └─ Index: clientId_index (key)

title             string, required, size: 200

description       string, required, size: 2000

categoryId        string, required, size: 50
  └─ Index: categoryId_index (key)

budgetType        enum, required, elements: ['fixed', 'range']

budgetMin         integer, required

budgetMax         integer, required

locationAddress   string, required, size: 500

locationLat       double, optional

locationLng       double, optional

scheduledDate     datetime, required

scheduledTime     string, required, size: 10

duration          integer, required

skillsRequired    string[], optional, size: 100 (array)

attachments       string[], optional, size: 500 (array)

status            enum, required, elements: ['open', 'assigned', 'in_progress', 'completed', 'cancelled', 'expired']
  └─ Index: status_index (key)

assignedWorkerId  string, optional, size: 50
  └─ Index: assignedWorkerId_index (key)

assignedAt        datetime, optional

bookingId         string, optional, size: 50

expiresAt         datetime, required

viewCount         integer, default: 0
```

4. **Set Permissions:**
   - Read: Any authenticated user
   - Create: Authenticated users (role=client)
   - Update: Document creator + workers
   - Delete: Document creator only

5. **Copy Collection ID** and add to `.env`:
```
NEXT_PUBLIC_APPWRITE_JOBS_COLLECTION_ID=your_collection_id_here
```

---

### Step 2: Configure Vercel Cron Job

Create or update `vercel.json` in project root:

```json
{
  "crons": [{
    "path": "/api/cron/expire-jobs",
    "schedule": "0 * * * *"
  }]
}
```

This runs the job expiry check every hour.

---

### Step 3: Update Environment Variables

Add to `.env`:
```bash
# Job Posting
NEXT_PUBLIC_APPWRITE_JOBS_COLLECTION_ID=your_jobs_collection_id

# Optional: Cron Secret for security
CRON_SECRET=your_random_secret_string
```

---

### Step 4: Add Dashboard Integration (Optional)

#### Client Dashboard

Edit `app/(dashboard)/client/dashboard/page.tsx`:

```tsx
import { JobPostingModal } from "@/components/client/job-posting-modal";

// Add to component:
const [isJobModalOpen, setIsJobModalOpen] = React.useState(false);

// Add button:
<Button onClick={() => setIsJobModalOpen(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Post a Job
</Button>

// Add modal:
<JobPostingModal
  isOpen={isJobModalOpen}
  onClose={() => setIsJobModalOpen(false)}
  clientId={user.$id}
/>
```

#### Worker Dashboard

Edit `app/(dashboard)/worker/dashboard/page.tsx`:

```tsx
import { useRouter } from "next/navigation";

const router = useRouter();

// Add button:
<Button onClick={() => router.push('/worker/jobs')}>
  <Briefcase className="h-4 w-4 mr-2" />
  Browse Available Jobs
</Button>
```

---

### Step 5: Build & Test

1. **Build the project:**
```bash
npm run build
```

2. **Start dev server:**
```bash
npm run dev
```

3. **Test the flow:**
   - Login as **client**
   - Navigate to `/client/jobs`
   - Click "Post New Job"
   - Fill out the form and submit
   - Logout and login as **worker**
   - Navigate to `/worker/jobs`
   - Click on a job to view details
   - Click "Accept This Job"
   - Verify booking is created and payment held in escrow

---

## 🔧 Troubleshooting

### Issue: "Worker ID is required"
**Fix:** The API endpoint currently expects `workerId` in request body. Update to use session authentication:

In `app/api/jobs/accept/route.ts`, replace:
```typescript
const { workerId: tempWorkerId } = body;
```

With proper auth:
```typescript
const session = await getServerSession();
const workerId = session.user.id;
```

### Issue: Jobs not appearing for workers
**Check:**
- Worker has `categories` array matching job's `categoryId`
- Worker is `isVerified: true` and `isActive: true`
- Job status is `'open'`

### Issue: Insufficient wallet balance
**Solution:**
- Client needs to top up wallet before posting job
- Budget max should be ≤ wallet balance

---

## 🎯 Key Features

### ✅ Implemented:
- Multi-step job posting form with photo uploads
- Real-time wallet balance validation
- Worker job browsing with category filtering
- Distance calculation between worker and job location
- Race condition handling (first worker wins)
- Automatic escrow payment hold
- Automatic booking creation on acceptance
- Email + SMS + In-app notifications
- Job expiry after 72 hours
- Platform commission (15%) deduction

### 🔄 Future Enhancements:
- Job editing for open jobs
- Job reposting for expired jobs
- Worker job history
- Client can view worker profile before acceptance
- Advanced filtering (budget range, distance, date)
- Job search functionality

---

## 📊 Data Flow

```
1. Client Posts Job
   ├─> Upload photos to Appwrite Storage
   ├─> Create job document (status: 'open')
   ├─> Notify workers with matching category
   └─> Set expiry date (72 hours)

2. Worker Browses Jobs
   ├─> Query jobs (status='open', worker's categories)
   ├─> Calculate distance from worker location
   └─> Display with budget breakdown (after commission)

3. Worker Accepts Job
   ├─> Check eligibility (verified, active, category match, radius)
   ├─> Atomic status update (open → assigned)
   ├─> Create booking in BOOKINGS collection
   ├─> Hold payment in escrow (WalletService)
   ├─> Update job (assignedWorkerId, bookingId)
   ├─> Send notifications (client, other workers)
   └─> Redirect to booking page

4. Job Completion
   ├─> Worker marks booking complete
   ├─> Client confirms
   ├─> Payment released (85% to worker, 15% commission)
   └─> Job status updated to 'completed'

5. Job Expiry (Cron)
   ├─> Check jobs (status='open', expiresAt < now)
   ├─> Update status to 'expired'
   └─> Notify client
```

---

## 🚀 Deployment Checklist

- [ ] Create JOBS collection in Appwrite
- [ ] Add `NEXT_PUBLIC_APPWRITE_JOBS_COLLECTION_ID` to env
- [ ] Update `vercel.json` with cron config
- [ ] Test job posting flow (client)
- [ ] Test job acceptance flow (worker)
- [ ] Verify escrow payment hold
- [ ] Verify notifications sent
- [ ] Test job expiry cron
- [ ] Deploy to Vercel
- [ ] Monitor logs for errors

---

## 📞 Support

For issues or questions:
1. Check Appwrite Console for collection setup
2. Check browser console for errors
3. Check Vercel logs for API errors
4. Verify wallet balance sufficient
5. Verify worker is verified and active

---

**Implementation Status:** 95% Complete ✅

**Remaining:**
- Dashboard integration (optional)
- Session authentication in API (currently uses temp userId)
- Testing and bug fixes
