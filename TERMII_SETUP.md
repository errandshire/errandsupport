# Termii SMS Setup Guide

## Current Status

✅ API Key configured
✅ Balance: NGN 10.00
❌ **Sender ID not registered** (blocking SMS)

## Issue

Termii requires ALL sender IDs to be registered before you can send SMS, even with the `dnd` channel.

**Error:** `ApplicationSenderId not found for applicationId: 51976 and senderName: ErrandWork`

## Solution: Register a Sender ID

### Step 1: Login to Termii Dashboard

Go to: https://accounts.termii.com/sender-id

### Step 2: Request a Sender ID

1. Click **"Request Sender ID"**
2. Enter your desired name: **ErrandWork** (or any name 3-11 characters)
3. Select purpose: **Transactional** (for booking/payment notifications)
4. Wait for approval

**Approval Time:**
- **Test Mode**: Usually instant
- **Live Mode**: 1-24 hours

### Step 3: Once Approved

The sender ID will appear in your dashboard. Then SMS will work!

## Alternative: Use Existing Sender ID

If you already have an approved sender ID in your Termii account, update `.env`:

```bash
TERMII_SENDER_ID=YourApprovedSenderID
```

Check existing sender IDs:
```bash
node scripts/check-termii-senders.js
```

## Quick Test After Setup

Once sender ID is approved:

```bash
node scripts/test-termii.js
```

## Channels Explained

- **`dnd`**: Bypasses DND (Do Not Disturb) restrictions. Still needs registered sender ID. Higher cost (~₦4/SMS)
- **`generic`**: Standard SMS. Needs registered sender ID. Lower cost (~₦2/SMS)
- **`whatsapp`**: WhatsApp messages

## Cost Comparison

| Channel | Cost/SMS | DND Support | Registration Required |
|---------|----------|-------------|----------------------|
| dnd | ~₦4 | Yes | ✅ Yes |
| generic | ~₦2 | No | ✅ Yes |
| whatsapp | Variable | N/A | ✅ Yes |

## Your Current Balance

**NGN 10.00** = ~2-5 SMS messages (depending on channel)

Add more balance at: https://accounts.termii.com/topup

## Next Steps

1. ✅ Register "ErrandWork" as sender ID (do this now!)
2. ⏳ Wait for approval (~instant for test mode)
3. ✅ Run test: `node scripts/test-termii.js`
4. ✅ Start your app: `npm run dev`
5. ✅ Test by creating a dispute or completing a booking

## Support

- Termii Docs: https://developers.termii.com/
- Termii Dashboard: https://accounts.termii.com/
- Support: support@termii.com
