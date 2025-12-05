# Real-Time Cal.com Webhook Testing Guide

## 🎯 What You Have

### 1. **Cal.com v3 Webhook Handler** (`/api/cal-webhook/route.js`)
   - ✅ Fully supports Cal.com v3 webhook format
   - ✅ Handles `BOOKING_CREATED`, `BOOKING_CANCELLED`, and other events
   - ✅ Extracts data from `payload.responses` and `payload.customInputs`
   - ✅ Updates pending appointments to "booked" status
   - ✅ Creates new appointments if no pending one exists
   - ✅ Resolves `salesperson_id` to avoid foreign key errors
   - ✅ Comprehensive logging for debugging

### 2. **Book Meeting Button** (`/components/buttons/bookMeetingbtn.jsx`)
   - ✅ Creates "pending" appointment when clicked
   - ✅ Opens Cal.com booking page in new tab
   - ✅ Saves booking click data to database

### 3. **Test Script** (`test-webhook.ps1`)
   - ✅ PowerShell script for local testing
   - ✅ Simulates Cal.com webhook payload

---

## 🧪 How to Test in Real-Time

### **Step 1: Verify Your Webhook Endpoint is Accessible**

#### For Local Development:
1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Test the endpoint:
   ```powershell
   # PowerShell
   Invoke-WebRequest -Uri "http://localhost:3000/api/cal-webhook" -Method GET
   
   # Should return: "Cal.com Webhook OK"
   ```

#### For Production:
1. Deploy your app to Vercel (or your hosting platform)
2. Test the endpoint:
   ```powershell
   Invoke-WebRequest -Uri "https://yourdomain.com/api/cal-webhook" -Method GET
   ```

---

### **Step 2: Configure Cal.com Webhook**

1. **Go to Cal.com Dashboard:**
   - Navigate to: https://cal.com/settings/webhooks
   - Or: Settings → Webhooks

2. **Add New Webhook:**
   - Click "Add Webhook" or "Create Webhook"
   - **Webhook URL:** 
     - Production: `https://yourdomain.com/api/cal-webhook`
     - Local (with ngrok): `https://your-ngrok-url.ngrok.io/api/cal-webhook`

3. **Select Events:**
   - ✅ `BOOKING_CREATED` (Required)
   - ✅ `BOOKING_CANCELLED` (Optional)
   - ✅ `BOOKING_RESCHEDULED` (Optional)

4. **Save the Webhook**

5. **Test the Webhook:**
   - Cal.com has a "Test" button - click it
   - Check your server logs for the test webhook

---

### **Step 3: Set Up Local Testing (Optional - for Development)**

If testing locally, you need to expose your local server:

#### Option A: Using ngrok (Recommended)
```bash
# Install ngrok: https://ngrok.com/download
# Then run:
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this in Cal.com webhook URL: https://abc123.ngrok.io/api/cal-webhook
```

#### Option B: Using localtunnel
```bash
npm install -g localtunnel
lt --port 3000

# Copy the URL and use it in Cal.com webhook settings
```

---

### **Step 4: Configure Cal.com Event Type to Pass Custom Data**

For the webhook to receive `lead_id` and `salesperson_id`, you need to configure Cal.com:

#### Method 1: Using URL Parameters (Current Setup)
Your booking button already includes these in the URL:
```
https://cal.com/karun-karthikeyan-8wsv1t/15min?lead_id=LD-103&salesperson_id=...
```

However, Cal.com v3 might not automatically pass URL parameters in webhook. You need:

#### Method 2: Using Cal.com Custom Inputs (Recommended)

1. **Go to Cal.com Event Type Settings:**
   - Navigate to: https://cal.com/event-types
   - Click on your "15min" event type
   - Go to "Advanced" or "Additional Settings"

2. **Add Custom Input Fields:**
   - Add a hidden field: `lead_id`
   - Add a hidden field: `salesperson_id`
   - These will be passed in `payload.responses.lead_id.value`

3. **Or Use Metadata:**
   - In your booking embed/button, pass metadata:
   ```javascript
   cal("inline", {
     elementOrSelector: calRef.current,
     calLink: "karun-karthikeyan-8wsv1t/15min",
     config: {
       metadata: {
         lead_id: leadId,
         salesperson_id: salespersonId
       }
     }
   });
   ```

---

### **Step 5: Real-Time Testing Flow**

#### **Test Scenario 1: Complete Booking Flow**

1. **Click "Book Meeting" Button:**
   - Go to your CRM
   - Click "Book Meeting" on any lead
   - Check browser console: Should see "Booking click saved successfully"
   - Check database: Should have appointment with `status: "pending"`

2. **Complete Booking on Cal.com:**
   - Fill in the booking form on Cal.com
   - Select date/time
   - Confirm the booking

3. **Watch Server Logs:**
   - Open your server terminal (where `npm run dev` is running)
   - You should see:
     ```
     🔥 Incoming Cal.com v3 Webhook: {...}
     📋 Webhook Event Details:
       - triggerEvent: BOOKING_CREATED
     📋 Extracted Fields:
       - lead_id: LD-103
       - salesperson_id: ...
     🔍 Searching for pending appointments...
     📝 Found existing pending appointment, will update it: 94
     ✅ Successfully updated pending appointment to booked: 94
     ```

4. **Verify in Database:**
   ```sql
   SELECT 
     id,
     lead_id,
     status,
     start_time,
     end_time,
     cal_event_id,
     created_at,
     updated_at
   FROM appointments
   WHERE lead_id = 'LD-103'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - Status should be: `"booked"`
   - `start_time` and `end_time` should be populated
   - `cal_event_id` should be updated

---

### **Step 6: Monitor Real-Time Webhooks**

#### **Option 1: Watch Server Terminal**
Keep your terminal open and watch for webhook logs in real-time.

#### **Option 2: Check Vercel Logs (Production)**
1. Go to Vercel Dashboard
2. Select your project
3. Click "Logs" tab
4. Filter by "cal-webhook" or search for "🔥 Incoming Cal.com"

#### **Option 3: Check Supabase Logs**
1. Go to Supabase Dashboard
2. Navigate to Logs → API Logs
3. See database queries in real-time

---

## 🔍 Troubleshooting Real-Time Testing

### **Problem: Webhook Not Received**

**Check:**
1. ✅ Webhook URL is correct in Cal.com settings
2. ✅ Webhook is enabled/active
3. ✅ `BOOKING_CREATED` event is selected
4. ✅ Server is running (for local) or deployed (for production)
5. ✅ Webhook endpoint is publicly accessible

**Test:**
```powershell
# Test if endpoint is accessible
Invoke-WebRequest -Uri "https://yourdomain.com/api/cal-webhook" -Method GET
```

### **Problem: Webhook Received But Status Not Updating**

**Check Server Logs:**
- Look for error messages
- Check if `lead_id` is being extracted correctly
- Verify database connection

**Common Issues:**
- `lead_id` is `null` → Cal.com not passing custom data
- Foreign key error → `salesperson_id` doesn't exist (should be handled now)
- Database connection error → Check Supabase credentials

### **Problem: lead_id is null in Webhook**

**Solution:**
- Configure Cal.com custom inputs (see Step 4)
- Or use Cal.com metadata in embed
- Or extract from booking description/notes

---

## 📊 What to Monitor

### **Success Indicators:**
- ✅ Status code 200 in webhook response
- ✅ `🔥 Incoming Cal.com v3 Webhook` in logs
- ✅ `✅ Successfully updated/created appointment` in logs
- ✅ Status changes from "pending" to "booked" in database
- ✅ `start_time` and `end_time` populated

### **Error Indicators:**
- ❌ Status code 500 in webhook response
- ❌ `❌ Update Error` or `❌ Insert Error` in logs
- ❌ Status stuck on "pending"
- ❌ No webhook logs at all

---

## 🚀 Quick Test Checklist

- [ ] Server is running (`npm run dev`)
- [ ] Webhook endpoint is accessible (test with GET request)
- [ ] Cal.com webhook is configured with correct URL
- [ ] `BOOKING_CREATED` event is enabled
- [ ] Click "Book Meeting" button → Creates pending appointment
- [ ] Complete booking on Cal.com → Webhook fires
- [ ] Check server logs → See webhook processing
- [ ] Check database → Status updated to "booked"

---

## 💡 Pro Tips

1. **Use ngrok for local testing** - Easiest way to test webhooks locally
2. **Keep server terminal open** - Watch logs in real-time
3. **Test with real bookings** - More reliable than test webhooks
4. **Check Cal.com webhook logs** - See if webhooks are being sent
5. **Use browser console** - See button click logs
6. **Monitor database** - Verify data is being saved correctly

---

## 📝 Example Real-Time Test

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start ngrok (if testing locally)
ngrok http 3000

# Browser: 
# 1. Go to your CRM
# 2. Click "Book Meeting" on a lead
# 3. Complete booking on Cal.com
# 4. Watch Terminal 1 for webhook logs
# 5. Check database for updated status
```

Your webhook is ready for real-time testing! 🎉

