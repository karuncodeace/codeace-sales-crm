# Cal.com Webhook Setup Guide

## ✅ Webhook Status: Enabled

You've enabled `booking.created` in Cal.com. Here's how to verify everything is working:

## 1. Webhook URL Configuration

In your Cal.com webhook settings, use:

**Production:**
```
https://yourdomain.com/api/cal-webhook
```

**Development (using ngrok):**
```
https://your-ngrok-url.ngrok.io/api/cal-webhook
```

## 2. Verify Webhook Endpoint

The webhook endpoint is now **public** (bypasses authentication) so Cal.com can access it.

Test it manually:
```bash
# Test GET (ping test)
curl https://yourdomain.com/api/cal-webhook

# Should return: "Cal.com Webhook OK"
```

## 3. How It Works

### Flow:
1. **User clicks "Book Meeting"** → Creates appointment with `status: "pending"`
2. **User completes booking on Cal.com** → Cal.com sends webhook
3. **Webhook received** → Updates `status: "pending"` → `"booked"`

### What Gets Updated:
- ✅ Status: `"pending"` → `"booked"`
- ✅ `cal_event_id`: Cal.com booking ID
- ✅ `start_time` & `end_time`: Meeting schedule
- ✅ `attendee_name` & `attendee_email`: Who booked
- ✅ `join_url`: Video call link (if available)
- ✅ `location`: Meeting location
- ✅ Lead's `last_activity`: Updated timestamp
- ✅ Auto-creates task: Meeting task in CRM

## 4. Testing the Webhook

### Option 1: Test with Real Booking
1. Click "Book Meeting" on any lead
2. Complete a booking on Cal.com
3. Check server logs for: `🔥 Incoming Webhook:`
4. Check database - status should be `"booked"`

### Option 2: Check Server Logs
When a booking is created, you should see:
```
🔥 Incoming Webhook: {...}
🟢 Handling booking.created
📝 Found existing pending appointment, will update it: {id}
✅ Updated pending appointment to booked: {id}
```

### Option 3: Verify in Database
```sql
-- Check recent appointments
SELECT 
  id,
  lead_id,
  lead_name,
  status,
  start_time,
  cal_event_id,
  created_at,
  updated_at
FROM appointments
WHERE lead_id = 'your-lead-id'
ORDER BY created_at DESC;
```

## 5. Webhook Events Handled

| Event | Status Change | Action |
|-------|--------------|--------|
| `booking.created` | `pending` → `booked` | Updates existing or creates new |
| `booking.rescheduled` | Stays `booked` | Updates time/date |
| `booking.canceled` | `booked` → `canceled` | Marks as canceled |

## 6. Troubleshooting

### Webhook not receiving events?
1. ✅ Verify webhook URL in Cal.com settings
2. ✅ Check webhook is enabled for `booking.created`
3. ✅ Ensure URL is publicly accessible (no auth required)
4. ✅ Check server logs for incoming requests

### Status not updating?
1. ✅ Check server logs for webhook receipt
2. ✅ Verify `lead_id` matches between button click and webhook
3. ✅ Check database for pending appointments
4. ✅ Verify webhook payload contains `lead_id` in metadata

### Check Webhook Payload:
The webhook expects `lead_id` in booking metadata:
```javascript
booking.metadata?.lead_id  // Should match the lead ID
```

If `lead_id` is missing, the webhook will still work but won't update the pending appointment.

## 7. Webhook URL Format

Make sure your Cal.com booking URL includes the metadata:
```
https://cal.com/karun-karthikeyan-8wsv1t/15min?lead_id={lead_id}&salesperson_id={salesperson_id}
```

This ensures the webhook receives the `lead_id` in the booking metadata.

## 8. Monitoring

Watch your server logs for:
- `🔥 Incoming Webhook:` - Webhook received
- `🟢 Handling booking.created` - Processing booking
- `✅ Updated pending appointment` - Success
- `❌ Update Error:` - Error occurred

## Next Steps

1. ✅ Webhook is enabled in Cal.com
2. ✅ Webhook endpoint is public (no auth required)
3. ✅ Handler is ready to process `booking.created`
4. 🧪 **Test it**: Make a booking and verify status updates!

The system is ready! When you make a booking, the status will automatically update from "pending" to "booked".

