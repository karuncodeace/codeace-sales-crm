# Webhook Debugging Guide

## Understanding the Flow

### Step 1: Button Click (What you're seeing now)
```
User clicks "Book Meeting" 
→ Creates appointment with status: "pending"
→ Console shows: "Booking click saved successfully"
```

### Step 2: User Completes Booking on Cal.com
```
User fills form and confirms booking on Cal.com
→ Cal.com sends webhook to your server
→ This is when status should update to "booked"
```

## Current Status

You're seeing the **Step 1** message, which means:
- ✅ Button click is working
- ✅ Data is being saved to database
- ⏳ Waiting for user to complete booking on Cal.com
- ⏳ Waiting for webhook to arrive

## How to Test the Webhook

### Option 1: Complete a Real Booking
1. Click "Book Meeting" button
2. **Actually complete the booking** on Cal.com (fill form, confirm)
3. Watch your **server terminal** (not browser console) for:
   ```
   🔥 Incoming Webhook: {...}
   📋 Extracted from webhook:
     - lead_id: LD-103
     - salesperson_id: ...
   🔍 Searching for pending appointments...
   📝 Found existing pending appointment...
   ✅ Updated pending appointment to booked
   ```

### Option 2: Check if Webhook is Configured
1. Go to Cal.com Settings → Webhooks
2. Verify webhook URL is: `https://yourdomain.com/api/cal-webhook`
3. Check that `booking.created` event is enabled
4. Test the webhook (Cal.com has a "Test" button)

## Important: Cal.com Metadata

**Problem:** Cal.com might not automatically pass URL parameters (`?lead_id=...`) in the webhook.

**Solution:** The webhook handler now tries multiple ways to extract `lead_id`:
- From `booking.metadata.lead_id`
- From `booking.metadata.customInputs.lead_id`
- From `booking.description` (if Cal.com includes it)
- From `videoCallUrl` query parameters

## What to Check in Server Logs

When webhook arrives, you should see in your **server terminal**:

```
🔥 Incoming Webhook: {
  "event": "booking.created",
  "booking": {
    "id": "...",
    "metadata": { ... },
    ...
  }
}

📋 Extracted from webhook:
  - lead_id: LD-103 (or null if not found)
  - salesperson_id: ...
  - booking.metadata: { ... }

🔍 Searching for pending appointments with lead_id: LD-103
   Found 1 pending appointment(s)

📝 Found existing pending appointment, will update it: 94

✅ Updated pending appointment to booked: 94
```

## If lead_id is null in Webhook

If you see `lead_id: null` in the logs, Cal.com isn't passing it. You'll need to:

1. **Configure Cal.com Custom Inputs:**
   - Go to Cal.com Event Type settings
   - Add custom input fields for `lead_id` and `salesperson_id`
   - These will be included in webhook metadata

2. **Or use Cal.com API to pass metadata:**
   - Use Cal.com's embed API with metadata parameter
   - This requires updating the booking button implementation

## Quick Check: Is Webhook Working?

1. **Check server terminal** (where `npm run dev` is running)
2. **Complete a booking** on Cal.com
3. **Look for** `🔥 Incoming Webhook:` message
4. If you see it → Webhook is working!
5. If you don't see it → Webhook might not be configured correctly

## Next Steps

1. ✅ Button click is working (you've confirmed this)
2. ⏳ **Complete a booking on Cal.com** to trigger webhook
3. ⏳ **Watch server terminal** for webhook logs
4. ⏳ **Check database** to see if status updates

The console message you're seeing is **expected** - it's just the button click. The webhook will fire when the booking is actually completed on Cal.com.

