# Platform Settings Setup

## Appwrite Collection Required

### Collection: `settings`

Create this collection in your Appwrite Console:

**Attributes:**
- `platformFeePercent` (double, required) - Platform fee percentage (e.g., 5 for 5%)
- `clientWithdrawalFeePercent` (double, required) - Client withdrawal fee percentage (e.g., 20 for 20%)
- `minWithdrawalAmount` (double, required) - Minimum withdrawal amount in Naira (e.g., 100)
- `autoReleaseEnabled` (boolean, required) - Whether auto-release is enabled
- `autoReleaseHours` (integer, required) - Hours after which payment is auto-released (e.g., 72)
- `createdAt` (datetime, required)
- `updatedAt` (datetime, required)

**Permissions:**
- Create: Admin only
- Read: Any authenticated user (needed for dynamic fee calculation)
- Update: Admin only
- Delete: None (settings should not be deleted)

**Indexes:**
- No indexes needed (single document collection)

## Environment Variable

Add to your `.env.local`:
```
NEXT_PUBLIC_APPWRITE_SETTINGS_COLLECTION_ID=settings
```

## Default Settings

The system will automatically create default settings if none exist:
```typescript
{
  platformFeePercent: 5,              // 5% platform fee on bookings
  clientWithdrawalFeePercent: 20,     // 20% fee on client withdrawals
  minWithdrawalAmount: 100,           // ₦100 minimum withdrawal
  autoReleaseEnabled: false,          // Auto-release disabled by default
  autoReleaseHours: 72                // 72 hours (3 days) for auto-release
}
```

## Features

### 1. **Dynamic Platform Fee**
- Booking modal automatically calculates platform fee based on settings
- Example: If subtotal is ₦10,000 and platform fee is 5%, fee = ₦500

### 2. **Dynamic Withdrawal Fee**
- Client withdrawals calculate fee dynamically
- Example: If withdrawal is ₦5,000 and fee is 20%, client receives ₦4,000

### 3. **Minimum Withdrawal Validation**
- System validates withdrawal amounts against configured minimum
- Error message shows current minimum: "Minimum withdrawal amount is ₦XXX"

### 4. **Settings Caching**
- Settings are cached for 5 minutes to reduce database calls
- Cache is automatically cleared when settings are updated
- Manual cache clearing: `SettingsService.clearCache()`

## Admin Interface

Admin can manage settings at `/admin/settings`:
- **Platform Fee (%)** - Fee charged on each booking
- **Client Withdrawal Fee (%)** - Fee deducted when clients withdraw
- **Minimum Withdrawal Amount (₦)** - Minimum amount users can withdraw
- **Auto-Release Settings** (commented out, for future use)

All changes are saved to database and immediately affect:
- New bookings (platform fee calculation)
- Client withdrawals (fee calculation and minimum validation)

## Usage in Code

### Calculate Platform Fee
```typescript
import { SettingsService } from '@/lib/settings.service';

const subtotal = 10000; // ₦10,000
const platformFee = await SettingsService.calculatePlatformFee(subtotal);
// Returns: 500 (if platform fee is 5%)
```

### Calculate Withdrawal Fee
```typescript
const withdrawalAmount = 5000; // ₦5,000
const { fee, netAmount } = await SettingsService.calculateWithdrawalFee(withdrawalAmount);
// fee: 1000 (if withdrawal fee is 20%)
// netAmount: 4000 (amount user receives)
```

### Validate Withdrawal Amount
```typescript
const amount = 50; // ₦50
const validation = await SettingsService.validateWithdrawalAmount(amount);
if (!validation.valid) {
  console.error(validation.message);
  // "Minimum withdrawal amount is ₦100"
}
```

### Get All Settings
```typescript
const settings = await SettingsService.getSettings();
console.log(settings.platformFeePercent); // 5
console.log(settings.minWithdrawalAmount); // 100
```

### Update Settings (Admin Only)
```typescript
const result = await SettingsService.updateSettings({
  platformFeePercent: 7,
  minWithdrawalAmount: 200
});
if (result.success) {
  console.log('Settings updated!');
}
```

## Implementation Notes

1. **Single Document Collection**: The settings collection should only contain ONE document with the platform settings. The service handles creating it if it doesn't exist.

2. **Caching Strategy**: Settings are cached for 5 minutes to avoid excessive database reads. The cache is cleared automatically when settings are updated.

3. **Backward Compatibility**: If the collection doesn't exist or can't be accessed, the service returns default settings without throwing errors.

4. **Rounding**: Platform fees are rounded using `Math.round()` to avoid fractional amounts.

5. **Percentage Storage**: Percentages are stored as whole numbers (e.g., 5 means 5%, not 0.05).

## Testing Checklist

After setup, verify:
- [ ] Settings collection created in Appwrite
- [ ] Environment variable added to `.env.local`
- [ ] Admin can access `/admin/settings`
- [ ] Admin can save settings (check toast notification)
- [ ] Booking modal shows correct platform fee
- [ ] Platform fee updates when admin changes settings
- [ ] Client withdrawal calculates correct fee
- [ ] Minimum withdrawal validation works
- [ ] Settings are cached (check network tab - should only fetch once)
- [ ] Cache clears after admin updates settings
