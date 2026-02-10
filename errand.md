                                               
                  
  ---                                                                                                                              
  ErandWork — An Errand & Service Marketplace
                                                                                                                                   
  This is a Next.js 15 web application (with PWA support) that connects clients who need tasks done with workers who can do them.
  Think of it as a Nigerian gig-economy platform — like TaskRabbit but localized for Nigeria (currency is Naira/NGN, Paystack for
  payments, Termii for SMS).

  Tech Stack

  - Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion, Radix UI (shadcn/ui)
  - Backend/BaaS: Appwrite (auth, database, storage, realtime)
  - Payments: Paystack (top-ups, withdrawals)
  - Email: Resend (transactional emails)
  - SMS: Termii
  - State: Zustand + React Query
  - Charts: Recharts (admin dashboard)

  Three User Roles

  1. Clients — Post errands/jobs, browse workers, hire, pay
  2. Workers — Apply to jobs, get selected, complete work, earn money
  3. Admin — Manage users, bookings, disputes, withdrawals, broadcast messages

  Core Business Flow

  1. Client posts a job (title, description, location, budget, schedule)
  2. Nearby workers get notified and apply
  3. Client reviews applicants and selects a worker
  4. Payment is held in escrow (virtual wallet system)
  5. Worker completes the job
  6. Payment is released to the worker (minus 15% commission)
  7. Both parties can leave reviews

  Key Features Already Built
  ┌─────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────┐
  │       Feature       │                                            Details                                            │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Auth                │ Login, register, forgot/reset password                                                        │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Onboarding          │ Multi-step worker onboarding (personal info, profile, document upload)                        │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Job Posting         │ Full job creation with categories, budget, location, attachments                              │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Job Applications    │ Workers apply, clients select/unpick workers                                                  │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Virtual Wallet      │ Escrow-based payment system (top-up via Paystack, hold, release, refund)                      │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Worker Cancellation │ 24-hour policy, auto-refund, job reopening                                                    │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Worker Verification │ Document upload, admin approval/rejection                                                     │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Messaging           │ Real-time chat between client and worker                                                      │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Notifications       │ In-app, email (Resend), and SMS (Termii)                                                      │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Disputes            │ Dispute system for problematic bookings                                                       │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Admin Dashboard     │ User management, bookings, transactions, withdrawals, broadcast messages, commission settings │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Worker Payouts      │ Bank account linking, withdrawal requests via Paystack transfers                              │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Reviews & Ratings   │ Post-job review system                                                                        │
  ├─────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Public Pages        │ Landing page, "How it Works", workers listing, terms, privacy                                 │
  └─────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────┘
  Service Categories

  Cleaning, Delivery/Pickup, Grocery Shopping, Pet Care, Home Maintenance, Gardening, Moving/Storage, Elderly Care, Personal
  Assistant, and Other.

  Known Technical Debt

  - Verification status inconsistency between USERS collection (approved/denied) and WORKERS collection (verified/rejected) —
  currently handled via a mapping layer
  - 171 orphaned users who registered as workers but never completed onboarding (no WORKERS profile created)

  This is a well-structured, production-oriented marketplace app with a solid foundation of features already implemented.