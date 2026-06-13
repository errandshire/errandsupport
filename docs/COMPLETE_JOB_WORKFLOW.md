# Complete Job Workflow: Client to Worker

## Overview
This document outlines the entire process from when a client posts a job to when a worker completes it and receives payment.

---

## 🔄 Complete Workflow Diagram

```
CLIENT                          SYSTEM                          WORKER
  │                               │                               │
  │ 1. Post Job                   │                               │
  ├──────────────────────────────>│                               │
  │                               │ Job created (status: open)    │
  │                               │ Notifications sent            │
  │                               ├──────────────────────────────>│
  │                               │                               │
  │                               │                               │ 2. Browse Jobs
  │                               │                               │ View job details
  │                               │                               │
  │                               │                               │ 3. Apply to Job
  │                               │<──────────────────────────────┤
  │                               │ Application created           │
  │                               │ Applicant count++             │
  │ Notification: New applicant   │                               │
  │<──────────────────────────────┤                               │
  │                               │                               │
  │ 4. Fund Wallet                │                               │
  ├──────────────────────────────>│                               │
  │                               │ Balance updated               │
  │                               │                               │
  │ 5. View Applicants            │                               │
  ├──────────────────────────────>│                               │
  │ (requires funding)            │                               │
  │                               │                               │
  │ 6. Select Worker              │                               │
  ├──────────────────────────────>│                               │
  │                               │ Booking created               │
  │                               │ Funds moved to escrow         │
  │                               │ Job status: assigned          │
  │                               │ Application status: selected  │
  │                               │ Other apps: rejected          │
  │                               │ Notification sent             │
  │                               ├──────────────────────────────>│
  │                               │                               │
  │                               │                               │ 7. Perform Job
  │                               │                               │ (scheduled date/time)
  │                               │                               │
  │                               │                               │ 8. Mark Complete
  │                               │<──────────────────────────────┤
  │                               │ Booking: in_progress          │
  │ Notification: Job completed   │                               │
  │<──────────────────────────────┤                               │
  │                               │                               │
  │ 9. Confirm & Release Payment  │                               │
  ├──────────────────────────────>│                               │
  │                               │ Deduct 15% commission         │
  │                               │ Release to worker wallet      │
  │                               │ Booking: completed            │
  │                               │ Payment: released             │
  │                               │ Notification sent             │
  │                               ├──────────────────────────────>│
  │                               │                               │ Payment received!
  │                               │                               │
```

---

## 📋 Detailed Process Breakdown

### **Phase 1: Job Posting (Client)**

#### **Files Involved:**
- `components/client/job-posting-modal.tsx`
- `app/api/jobs/create/route.ts`
- `lib/job-posting.service.ts`

#### **Process:**

1. **Client fills job form** (5 steps):
   - **Step 1 - Details:** Title, description, category
   - **Step 2 - Requirements:** Duration, skills, photos
   - **Step 3 - Location:** Address, scheduled date/time
   - **Step 4 - Budget:** 
     - For **Laundry/Cleaning**: Select items with quantities (auto-calculates total)
     - For **Other categories**: Enter manual budget
   - **Step 5 - Review:** Confirm all details

2. **Submit job:**
   ```typescript
   POST /api/jobs/create
   Body: {
     clientId: string,
     jobData: {
       title, description, categoryId,
       budgetMax, locationAddress, scheduledDate,
       pricingItems?: [...] // For laundry/cleaning
     }
   }
   ```

3. **System creates job:**
   - Uploads attachments to Appwrite Storage
   - Generates unique job ID and SEO slug
   - Sets expiry date (72 hours)
   - Creates job document with status: `open`
   - Sets permissions (client owns, anyone can read)

4. **Notifications sent:**
   - In-app notifications to relevant workers
   - Workers see new job in their feed

#### **Database Changes:**
```
JOBS collection:
  - New document created
  - status: "open"
  - requiresFunding: false
  - applicantCount: 0
```

---

### **Phase 2: Worker Discovery & Application**

#### **Files Involved:**
- `app/(dashboard)/worker/jobs/page.tsx`
- `lib/job-acceptance.service.ts`
- `app/api/jobs/apply/route.ts`
- `lib/job-application.service.ts`

#### **Process:**

1. **Worker browses jobs:**
   - Views all open jobs (not filtered by worker categories)
   - Can filter by category, budget, location
   - Sees job details: title, budget, location, scheduled date

2. **Worker clicks "Show Interest":**
   ```typescript
   POST /api/jobs/apply
   Body: {
     jobId: string,
     message?: string // Optional pitch
   }
   ```

3. **System validates:**
   - Worker hasn't already applied ✓
   - Job is still open ✓
   - Worker is verified ✓
   - Worker is active ✓

4. **Application created:**
   - Creates document in `JOB_APPLICATIONS` collection
   - Status: `pending`
   - Increments job's `applicantCount`
   - Sets job's `requiresFunding: true`

5. **Client notified:**
   - In-app notification: "New applicant for your job"
   - Email notification (optional)

#### **Database Changes:**
```
JOB_APPLICATIONS collection:
  - New document created
  - status: "pending"
  - jobId, workerId, clientId
  
JOBS collection:
  - applicantCount: +1
  - requiresFunding: true
```

---

### **Phase 3: Client Selection & Escrow**

#### **Files Involved:**
- `components/client/applicant-list.tsx`
- `app/api/jobs/select-worker/route.ts`
- `lib/worker-selection.service.ts`
- `lib/wallet.service.ts`

#### **Process:**

1. **Client funds wallet** (if needed):
   - Adds money via Paystack
   - Balance updated in `VIRTUAL_WALLETS` collection

2. **Client views applicants:**
   - Can only view after funding wallet
   - Sees worker profiles, ratings, experience
   - Reviews worker messages/pitches

3. **Client selects worker:**
   ```typescript
   POST /api/jobs/select-worker
   Body: {
     jobId: string,
     applicationId: string,
     clientId: string
   }
   ```

4. **System validates:**
   - Job belongs to client ✓
   - Job is still open ✓
   - Application is pending ✓
   - Worker is verified & active ✓
   - **Client has sufficient funds** ✓

5. **Escrow transaction:**
   - Moves funds from client's `balance` to `escrow`
   - Creates wallet transaction record
   - **Idempotent:** Uses booking ID as transaction ID to prevent double-charging

6. **Booking created:**
   - Creates document in `BOOKINGS` collection
   - Links job, client, and worker
   - Status: `confirmed`
   - Payment status: `held` (in escrow)

7. **Job & applications updated:**
   - Job status: `open` → `assigned`
   - Selected application: `pending` → `selected`
   - Other applications: `pending` → `rejected`

8. **Worker notified:**
   - In-app: "You've been selected for a job!"
   - SMS: Job details and scheduled time
   - Email: Booking confirmation

#### **Database Changes:**
```
VIRTUAL_WALLETS (client):
  - balance: -jobBudget
  - escrow: +jobBudget
  
BOOKINGS collection:
  - New document created
  - status: "confirmed"
  - paymentStatus: "held"
  
JOBS collection:
  - status: "assigned"
  - assignedWorkerId: workerId
  - bookingId: bookingId
  
JOB_APPLICATIONS:
  - Selected app: status = "selected"
  - Others: status = "rejected"
```

---

### **Phase 4: Job Execution**

#### **Files Involved:**
- `app/(dashboard)/worker/bookings/page.tsx`
- `app/(dashboard)/client/bookings/page.tsx`

#### **Process:**

1. **Worker prepares:**
   - Views booking details in dashboard
   - Sees scheduled date/time, location, requirements
   - Can message client if needed

2. **Worker performs job:**
   - Goes to location at scheduled time
   - Completes the work as described
   - Takes photos/evidence if needed

3. **Worker marks complete:**
   - Updates booking status to `in_progress`
   - Notifies client that work is done

4. **Client reviews work:**
   - Inspects completed job
   - Can dispute if unsatisfied
   - Or confirms completion

#### **Database Changes:**
```
BOOKINGS collection:
  - status: "confirmed" → "in_progress"
  - workerCompletedAt: timestamp
```

---

### **Phase 5: Payment Release**

#### **Files Involved:**
- `app/api/bookings/complete/route.ts`
- `lib/booking-completion.service.ts`
- `lib/wallet.service.ts`

#### **Process:**

1. **Client confirms completion:**
   ```typescript
   POST /api/bookings/complete
   Body: {
     bookingId: string,
     workerId: string,
     amount: number,
     rating?: number,
     review?: string
   }
   ```

2. **System validates:**
   - Booking belongs to client ✓
   - Payment is in escrow ✓
   - Payment not already released ✓

3. **Commission calculation:**
   ```
   Platform fee: 15%
   Worker receives: 85% of job budget
   
   Example:
   Job budget: ₦10,000
   Platform fee: ₦1,500
   Worker gets: ₦8,500
   ```

4. **Payment release (with rollback protection):**
   - **Step 1:** Release funds to worker wallet
   - **Step 2:** Update booking status
   - **If Step 2 fails:** Rollback payment (prevents double-payment)

5. **Wallet updates:**
   - Client escrow: -jobBudget
   - Worker balance: +workerAmount (85%)
   - Platform balance: +commission (15%)

6. **Booking finalized:**
   - Status: `in_progress` → `completed`
   - Payment status: `held` → `released`
   - Completion timestamp recorded

7. **Worker notified:**
   - In-app: "Payment received! ₦8,500"
   - SMS: "ErrandWork: Payment received! ₦8,500 credited to your wallet"
   - Email: Payment receipt

8. **Review system:**
   - Client can rate worker (1-5 stars)
   - Client can leave review
   - Updates worker's average rating

#### **Database Changes:**
```
VIRTUAL_WALLETS (client):
  - escrow: -jobBudget
  
VIRTUAL_WALLETS (worker):
  - balance: +workerAmount (85%)
  
VIRTUAL_WALLETS (platform):
  - balance: +commission (15%)
  
WALLET_TRANSACTIONS:
  - New transaction: "booking_payment"
  - New transaction: "platform_commission"
  
BOOKINGS collection:
  - status: "completed"
  - paymentStatus: "released"
  - completedAt: timestamp
  
WORKERS collection (if rated):
  - ratingAverage: updated
  - totalReviews: +1
  - completedJobs: +1
```

---

## 🔐 Security & Safety Features

### **1. Escrow System**
- Funds held in escrow until job completion
- Prevents worker from being unpaid
- Prevents client from losing money if job not done

### **2. Idempotency**
- Transaction IDs prevent double-charging
- Duplicate requests return same result
- Safe to retry failed operations

### **3. Rollback Protection**
```typescript
// If booking update fails after payment release
await WalletService.rollbackRelease({
  clientId, workerId, bookingId, amountInNaira
});
```

### **4. Permission System**
- Client can only view/edit their own jobs
- Worker can only apply to open jobs
- Only verified workers can apply
- Only funded clients can select workers

### **5. Race Condition Prevention**
- Job status checked before selection
- Application status checked before selection
- Wallet balance locked during transaction

---

## 📊 Job Status Flow

```
open → assigned → in_progress → completed
  ↓
cancelled (if client cancels before assignment)
  ↓
expired (if no applicants after 72 hours)
```

## 💰 Payment Status Flow

```
pending → held (escrow) → released (to worker)
                    ↓
              refunded (if cancelled)
```

## 📝 Application Status Flow

```
pending → selected (chosen by client)
    ↓
rejected (not chosen)
    ↓
withdrawn (worker cancels application)
```

---

## 🎯 Key Collections

### **JOBS**
- Job postings from clients
- Status, budget, location, schedule
- Applicant count, assigned worker

### **JOB_APPLICATIONS**
- Worker applications to jobs
- Status (pending/selected/rejected)
- Worker message/pitch

### **BOOKINGS**
- Created when client selects worker
- Links job, client, worker
- Payment status, completion status

### **VIRTUAL_WALLETS**
- User balances and escrow
- Tracks available and held funds

### **WALLET_TRANSACTIONS**
- All wallet movements
- Deposits, payments, refunds, commissions

### **WORKERS**
- Worker profiles
- Verification status, ratings, categories
- Completed jobs, earnings

### **USERS**
- User accounts (clients & workers)
- Name, email, phone, role

---

## 🔔 Notification Points

1. **Job Posted** → Workers in relevant categories
2. **Worker Applied** → Client
3. **Worker Selected** → Selected worker
4. **Applications Rejected** → Rejected workers
5. **Job Completed** → Client
6. **Payment Released** → Worker
7. **Booking Cancelled** → Both parties

---

## 💡 Special Features

### **Predefined Pricing (Laundry & Cleaning)**
- Clients select items with quantities
- System auto-calculates total
- Stored as `pricingItems` JSON array
- Example:
  ```json
  [
    {"itemId": "shirts", "quantity": 5, "pricePerItem": 1500, "totalPrice": 7500},
    {"itemId": "gown_dresses", "quantity": 3, "pricePerItem": 3000, "totalPrice": 9000}
  ]
  ```

### **Auto-Expiry**
- Jobs expire after 72 hours if not assigned
- Cron job checks for expired jobs
- Status updated to `expired`

### **Wallet Funding**
- Clients fund via Paystack
- Instant balance update
- Supports card payments, bank transfer

### **Commission System**
- Platform takes 15% of each job
- Automatically deducted on payment release
- Worker sees net amount (85%)

---

## 🛠️ API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/jobs/create` | POST | Client posts new job |
| `/api/jobs/apply` | POST | Worker applies to job |
| `/api/jobs/select-worker` | POST | Client selects worker |
| `/api/bookings/complete` | POST | Client releases payment |
| `/api/bookings/cancel` | POST | Client cancels booking |
| `/api/wallet/fund` | POST | Add money to wallet |

---

## 📱 User Dashboards

### **Client Dashboard**
- Posted jobs (open, assigned, completed)
- Applicant management
- Booking management
- Wallet & transactions
- Payment history

### **Worker Dashboard**
- Available jobs (browse & filter)
- My applications (pending, selected, rejected)
- My bookings (upcoming, in-progress, completed)
- Wallet & earnings
- Ratings & reviews

---

## 🔄 Error Handling

### **Common Errors & Solutions**

**"Worker profile not found"**
- Worker hasn't completed onboarding
- Solution: Redirect to `/onboarding`

**"Insufficient funds"**
- Client wallet balance too low
- Solution: Redirect to wallet funding

**"Job no longer available"**
- Another client selected a worker
- Solution: Show message, redirect to jobs

**"You have already applied"**
- Worker already applied to this job
- Solution: Show existing application status

**"Worker is no longer verified"**
- Worker's verification was revoked
- Solution: Prevent application, show message

---

## 🎓 Best Practices

1. **Always check job status** before operations
2. **Use server SDK** for privileged operations
3. **Implement idempotency** for financial transactions
4. **Send notifications** at every major step
5. **Log all transactions** for audit trail
6. **Handle race conditions** with proper locking
7. **Rollback on failure** to maintain consistency

---

## 📈 Metrics & Analytics

Track these key metrics:
- Jobs posted per day
- Application rate (applications/job)
- Selection rate (selections/applications)
- Completion rate (completed/assigned)
- Average job budget
- Platform revenue (15% commission)
- Worker earnings
- Client spending

---

This workflow ensures a smooth, secure, and transparent process from job posting to payment completion! 🚀
