# Test Webhook Manually

## Problem: Webhook Not Receiving Events

If the webhook isn't being triggered, test it manually:

## Option 1: Test Webhook Endpoint Directly

### Using curl:
```bash
curl -X POST http://localhost:3000/api/cal-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "booking.created",
    "booking": {
      "id": "test-booking-123",
      "title": "15min Meeting",
      "start": "2024-12-15T10:00:00Z",
      "end": "2024-12-15T10:15:00Z",
      "metadata": {
        "lead_id": "LD-103",
        "salesperson_id": "2cf547d6-ccd0-4bcd-8222-86f075e5c110"
      },
      "attendee": {
        "name": "Test User",
        "email": "test@example.com"
      },
      "location": null
    }
  }'
```

### Using Browser Console:
```javascript
fetch('/api/cal-webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event: 'booking.created',
    booking: {
      id: 'test-booking-123',
      title: '15min Meeting',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 15*60*1000).toISOString(),
      metadata: {
        lead_id: 'LD-103',
        salesperson_id: '2cf547d6-ccd0-4bcd-8222-86f075e5c110'
      },
      attendee: {
        name: 'Test User',
        email: 'test@example.com'
      }
    }
  })
})
.then(res => res.json())
.then(data => console.log('Webhook response:', data))
.catch(err => console.error('Error:', err));
```

## Option 2: Check Cal.com Webhook Configuration

1. Go to Cal.com Settings → Webhooks
2. Verify:
   - ✅ Webhook URL is correct: `https://yourdomain.com/api/cal-webhook`
   - ✅ `booking.created` event is enabled
   - ✅ Webhook is active/enabled
3. Click "Test Webhook" button in Cal.com
4. Check your server terminal for the test webhook

## Option 3: Verify Webhook URL is Accessible

```bash
# Test if endpoint is accessible
curl https://yourdomain.com/api/cal-webhook

# Should return: "Cal.com Webhook OK"
```

## Option 4: Check if Webhook is Being Sent

1. Go to Cal.com Dashboard
2. Check "Webhook Logs" or "Event Logs"
3. See if webhooks are being sent
4. Check if they're failing or succeeding

## Common Issues

### Issue 1: Webhook URL Not Accessible
- **Solution**: Make sure your server is running and URL is correct
- **Check**: Test with curl or browser

### Issue 2: Cal.com Not Sending lead_id
- **Problem**: URL parameters (`?lead_id=...`) might not be in webhook
- **Solution**: The code now tries multiple fallback methods to match appointments

### Issue 3: Webhook Not Configured
- **Solution**: Go to Cal.com and add/verify webhook configuration

## Debug Steps

1. ✅ Test webhook endpoint manually (see Option 1)
2. ✅ Check Cal.com webhook settings
3. ✅ Verify webhook URL is accessible
4. ✅ Check server terminal for any errors
5. ✅ Complete a real booking and watch server logs

