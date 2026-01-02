# ✅ Collapsible Job Cards - Workers Can View Details Before Accepting

## What Changed:

Workers can now **expand/collapse job cards** to view full details inline before accepting. No more modal dialogs - everything happens on the same page!

---

## New Features:

### 1. **Collapsed View (Default)**
Shows job summary:
- ✅ Job title
- ✅ Category badge (with icon)
- ✅ Description preview (2 lines max)
- ✅ Location
- ✅ Scheduled date
- ✅ Duration
- ✅ Budget
- ✅ Expand/collapse button (chevron icon)

### 2. **Expanded View (Click to Open)**
Shows complete job details:
- ✅ Full description
- ✅ Skills required (badges)
- ✅ Photos/attachments (3-column grid)
- ✅ Client information (name + rating)
- ✅ **Earnings breakdown** (budget - platform fee = your earnings)
- ✅ **Accept This Job button** (only visible when expanded)

---

## How It Works:

### User Flow:

1. **Worker visits `/worker/jobs`**
   - Sees list of all available jobs (collapsed)

2. **Worker clicks on a job card**
   - Card smoothly expands to show full details
   - "Loading details..." shows while fetching

3. **Worker reviews all details**
   - Reads full description
   - Checks skills required
   - Views photos
   - Sees client rating
   - Reviews earnings breakdown

4. **Worker clicks "Accept This Job"**
   - Job accepted
   - Booking created
   - Payment held in escrow
   - Card collapses
   - Redirects to booking page

5. **Worker can click again to collapse**
   - Returns to collapsed summary view

---

## Technical Implementation:

### Components Used:

**New Component Created:**
- `components/ui/collapsible.tsx` - Radix UI collapsible wrapper

**New Dependencies:**
- `@radix-ui/react-collapsible` - Accessible collapsible component

### State Management:

```typescript
const [expandedJobId, setExpandedJobId] = React.useState<string | null>(null);
const [jobDetails, setJobDetails] = React.useState<Record<string, JobWithDetails>>({});
```

- Only one job can be expanded at a time
- Details are cached after first fetch
- Clicking the same job collapses it

### Key Functions:

**handleToggleJob(job)**
- Toggles expansion state
- Fetches details if not cached
- Shows loading state while fetching

**handleAcceptJob(job)**
- Accepts the job via API
- Refreshes job list
- Collapses the card
- Redirects to booking page

---

## Benefits:

✅ **Better UX** - No popup modals, everything inline
✅ **Faster browsing** - Workers can quickly scan multiple jobs
✅ **Progressive disclosure** - Only show details when needed
✅ **Performance** - Details loaded on demand, cached for speed
✅ **Accessibility** - Radix UI provides keyboard navigation
✅ **Mobile friendly** - Collapsible works great on small screens

---

## Visual Structure:

```
┌─────────────────────────────────────────────┐
│ 🧹 Cleaning Services                    ▼   │ ← Collapsed
│ house cleaning service                      │
│ house cleaning service                      │
│ 📍 wwwwww        📅 01/01/2026              │
│ ⏱️ 8 hours       💵 ₦50                     │
└─────────────────────────────────────────────┘

Click ↓

┌─────────────────────────────────────────────┐
│ 🧹 Cleaning Services                    ▲   │ ← Expanded
│ house cleaning service                      │
│ house cleaning service                      │
│ 📍 wwwwww        📅 01/01/2026              │
│ ⏱️ 8 hours       💵 ₦50                     │
├─────────────────────────────────────────────┤
│ Full Description                            │
│ house cleaning service                      │
│                                             │
│ Skills Required                             │
│ [Skill 1] [Skill 2]                        │
│                                             │
│ Photos                                      │
│ [img] [img] [img]                          │
│                                             │
│ Client Information                          │
│ 👤 Client Name  ⭐ 4.5                     │
│                                             │
│ Your Earnings                               │
│ Job Budget:         ₦50                     │
│ Platform Fee (15%): -₦8                     │
│ You'll Earn:        ₦42                     │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │      Accept This Job                     │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## Testing:

1. **Visit `/worker/jobs`**
2. **Click on the "house cleaning service" job card**
3. **Card should expand** to show full details
4. **Verify you see**:
   - Full description
   - Client info
   - Earnings breakdown (₦50 - 15% = ₦42.50)
   - Green "Accept This Job" button
5. **Click the chevron up button** to collapse
6. **Card should return** to summary view

---

## Files Modified:

- `app/(dashboard)/worker/jobs/page.tsx` - Main jobs page with collapsible cards
- `components/ui/collapsible.tsx` - **NEW** - Radix UI collapsible wrapper
- `package.json` - Added @radix-ui/react-collapsible dependency

---

**Status:** ✅ Complete - Build successful, ready for testing!

**Try it:** Refresh `/worker/jobs` and click on any job card to expand it!
