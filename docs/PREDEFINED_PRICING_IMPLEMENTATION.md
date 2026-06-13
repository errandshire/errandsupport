# Predefined Pricing Implementation Guide

## Overview
This document explains how the predefined pricing system works for **Laundry** and **House Cleaning** job categories.

## What Was Implemented

### 1. Pricing Constants (`lib/constants.ts`)

Added predefined pricing for two categories:

#### **Laundry Pricing**
- Shirts: ₦1,500
- Skirt/Trousers: ₦1,500
- Nightgowns: ₦2,000
- Casual Gowns: ₦2,500
- Gown Dresses: ₦3,000
- Native Dresses: ₦3,500
- Iru & Buba: ₦3,500
- Iru and Buba/Gele: ₦4,000
- Head Tie/Asoke: ₦1,500
- Suit Jacket: ₦5,000
- Suit Complete: ₦7,000
- Aso Oke Complete: ₦8,000

#### **House Cleaning Pricing**
- One Room Cleaning: ₦8,000
- 2 Rooms Cleaning: ₦15,000
- 3 Rooms Cleaning: ₦22,000
- Full Apartment (4+ rooms): ₦30,000
- Kitchen Only: ₦5,000
- Bathroom Only: ₦4,000
- Living Room Only: ₦6,000
- Deep Cleaning (per room): ₦10,000

### 2. Job Posting Modal Updates (`components/client/job-posting-modal.tsx`)

**When clients select "Laundry" or "House Cleaning" category:**

1. **Budget Step Shows Item Selection UI** instead of manual budget input
2. **Each item displays:**
   - Icon and name
   - Fixed price
   - Quantity selector (+/- buttons)
3. **Real-time calculation** shows:
   - Selected items with quantities
   - Individual item totals
   - Grand total budget
4. **Budget is auto-calculated** from selected items

**For other categories:**
- Manual budget input remains unchanged

### 3. Data Structure Updates (`lib/types.ts`)

Added new `PricingItem` interface:
```typescript
export interface PricingItem {
  itemId: string;        // e.g., "shirts"
  itemName: string;      // e.g., "Shirts"
  quantity: number;      // e.g., 5
  pricePerItem: number;  // e.g., 1500
  totalPrice: number;    // e.g., 7500
}
```

Updated `Job` and `JobFormData` interfaces to include:
```typescript
pricingItems?: PricingItem[];
```

## How It Works

### Client Posts a Laundry Job:

1. **Step 1 - Details:** Select "Laundry" category
2. **Step 4 - Budget:** 
   - See list of laundry items with prices
   - Click + to add items (e.g., 5 shirts, 3 gowns)
   - Total calculates automatically: ₦15,000
3. **Submit:** Job is created with:
   - `budgetMax: 15000`
   - `pricingItems: [{itemId: "shirts", quantity: 5, ...}, ...]`

### Workers See the Job:

Workers will see:
- Total budget: ₦15,000
- Breakdown: "5x Shirts, 3x Gown Dresses"

## Database Changes Required

### Appwrite Collection: `jobs`

Add new attribute:
- **Name:** `pricingItems`
- **Type:** String (JSON array)
- **Size:** 10000
- **Required:** No
- **Array:** No

This will store the pricing breakdown as JSON:
```json
[
  {
    "itemId": "shirts",
    "itemName": "Shirts",
    "quantity": 5,
    "pricePerItem": 1500,
    "totalPrice": 7500
  }
]
```

## Next Steps

### 1. Update Appwrite Database Schema
```bash
# In Appwrite Console:
1. Go to Database → jobs collection
2. Add new attribute: pricingItems (String, size: 10000)
3. Save changes
```

### 2. Update Job Display Components

You need to update these files to show pricing breakdown:

#### `components/client/job-card.tsx`
Show pricing items in job cards

#### `components/client/job-details-modal.tsx`
Display full pricing breakdown when viewing job details

#### `app/(dashboard)/worker/jobs/page.tsx`
Show pricing items to workers browsing jobs

#### Example Display Code:
```tsx
{job.pricingItems && job.pricingItems.length > 0 && (
  <div className="mt-3 p-3 bg-gray-50 rounded">
    <p className="text-sm font-medium mb-2">Items:</p>
    {job.pricingItems.map((item, idx) => (
      <div key={idx} className="flex justify-between text-sm">
        <span>{item.itemName} x {item.quantity}</span>
        <span>₦{item.totalPrice.toLocaleString()}</span>
      </div>
    ))}
  </div>
)}
```

### 3. Update Job API Endpoint

The `/api/jobs/create` endpoint should already handle `pricingItems` since it's part of the job payload. Just ensure it's being saved to the database.

## Testing Checklist

- [ ] Create a laundry job with multiple items
- [ ] Verify total budget calculates correctly
- [ ] Submit job and check database has `pricingItems` field
- [ ] View job as worker and see pricing breakdown
- [ ] Create a house cleaning job with room selections
- [ ] Verify other categories still use manual budget input

## Adding More Categories

To add predefined pricing for other categories:

1. **Add pricing array in `lib/constants.ts`:**
```typescript
export const NEW_CATEGORY_PRICING = [
  { id: 'item1', name: 'Item Name', price: 5000, icon: '🔧' },
  // ... more items
];
```

2. **Update `CATEGORIES_WITH_PRICING`:**
```typescript
export const CATEGORIES_WITH_PRICING = {
  laundry: { ... },
  cleaning: { ... },
  new_category: {
    name: 'New Category',
    items: NEW_CATEGORY_PRICING,
    allowCustom: false,
  },
};
```

3. **Update the condition in job-posting-modal.tsx:**
```typescript
{(formData.categoryId === 'laundry' || 
  formData.categoryId === 'cleaning' || 
  formData.categoryId === 'new_category') && (
  // ... pricing UI
)}
```

## Benefits

✅ **Standardized Pricing** - Consistent prices across all jobs
✅ **Better UX** - Clients don't need to guess prices
✅ **Transparency** - Workers know exactly what's included
✅ **Easy Calculation** - Automatic total calculation
✅ **Detailed Breakdown** - Clear itemization for both parties

## Support

If you need to modify prices:
1. Update values in `lib/constants.ts`
2. Redeploy the application
3. New jobs will use updated prices (existing jobs keep old prices)
