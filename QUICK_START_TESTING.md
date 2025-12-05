# Quick Start: Real-Time Webhook Testing

## 🚀 5-Minute Setup

### 1. Start Your Server
```bash
npm run dev
```

### 2. Test Webhook Endpoint (Verify It Works)
```powershell
# PowerShell
Invoke-WebRequest -Uri "http://localhost:3000/api/cal-webhook" -Method GET
```

### 3. Configure Cal.com Webhook

**Go to:** https://cal.com/settings/webhooks

**Add Webhook:**
- **URL:** `https://yourdomain.com/api/cal-webhook` (or ngrok URL for local)
- **Events:** Select `BOOKING_CREATED`
- **Save**

### 4. Test Real Booking

1. **In Your CRM:**
   - Click "Book Meeting" on any lead
   - Browser console shows: "Booking click saved successfully"

2. **On Cal.com:**
   - Complete the booking form
   - Confirm the booking

3. **Watch Your Server Terminal:**
   - You should see: `🔥 Incoming Cal.com v3 Webhook`
   - Then: `✅ Successfully updated pending appointment to booked`

4. **Check Database:**
   - Status should be: `"booked"`
   - `start_time` and `end_time` should be populated

---

## ✅ Success Checklist

- [ ] Server running (`npm run dev`)
- [ ] Webhook endpoint accessible (GET returns 200)
- [ ] Cal.com webhook configured
- [ ] `BOOKING_CREATED` event enabled
- [ ] Clicked "Book Meeting" → Pending appointment created
- [ ] Completed booking on Cal.com → Webhook received
- [ ] Status updated to "booked" in database

---

## 🐛 Quick Troubleshooting

**No webhook received?**
- Check Cal.com webhook URL is correct
- Verify webhook is enabled
- Check server is running

**Status not updating?**
- Check server logs for errors
- Verify `lead_id` is in webhook payload
- Check database connection

**Need help?** Check `REAL_TIME_TESTING_GUIDE.md` for detailed instructions.

