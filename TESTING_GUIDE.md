# Cal.com Booking System - Testing Guide

## Prerequisites Checklist

### 1. Install Package
```bash
npm install @calcom/embed-react
```

### 2. Create Supabase Table
Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cal_event_id TEXT,
  title TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  location TEXT,
  join_url TEXT,
  status TEXT DEFAULT 'booked',
  lead_id TEXT,
  lead_name TEXT,
  salesperson_id TEXT,
  attendee_name TEXT,
  attendee_email TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Verify Cal.com Link
Make sure your Cal.com link is correct: `karun-karthikeyan-8wsv1t/15min`

## Step-by-Step Testing

### Step 1: Start Your Development Server
```bash
npm run dev
```

### Step 2: Navigate to Leads Page
1. Open your browser and go to `http://localhost:3000/leads`
2. Make sure you're logged in

### Step 3: Test Kanban View
1. Switch to **Kanban view** (if not already)
2. Find any lead card
3. Look for the **"Book Meeting"** button at the bottom of the card
4. Click the button

**Expected Result:**
- A modal should open with a backdrop blur
- The modal should show "Book a Meeting" header
- Cal.com calendar should load inside the modal

### Step 4: Test Table View
1. Switch to **Table view**
2. Click the **three dots (⋮)** in the Actions column for any lead
3. Click **"Book Meeting"** from the dropdown

**Expected Result:**
- Same modal should open as in Kanban view

### Step 5: Test Booking Flow
1. In the opened modal, wait for Cal.com calendar to load (you'll see a loading spinner)
2. The calendar should show available time slots
3. Select a date and time slot
4. Fill in the booking form (name and email should be pre-filled from the lead)
5. Complete the booking

**Expected Result:**
- Modal should close automatically
- A **green success toast** should appear: "Meeting booked successfully!"
- The booking should be saved to your Supabase `appointments` table

### Step 6: Verify Database Entry
1. Go to your Supabase Dashboard
2. Navigate to **Table Editor** → **appointments**
3. Check the latest entry

**What to Verify:**
- ✅ `lead_id` matches the lead you booked for
- ✅ `lead_name` is correct
- ✅ `salesperson_id` matches your logged-in user ID
- ✅ `start_time` and `end_time` are set
- ✅ `attendee_name` and `attendee_email` are filled
- ✅ `raw_payload` contains the full Cal.com booking data
- ✅ `status` is "booked"

## Troubleshooting

### Issue: Modal doesn't open
**Check:**
- Open browser console (F12)
- Look for any JavaScript errors
- Verify `BookingModal` component is imported correctly

### Issue: Calendar doesn't load
**Check:**
- Browser console for errors
- Network tab - verify `embed.js` script loads from `https://app.cal.com/embed/embed.js`
- Check if Cal.com link is correct: `karun-karthikeyan-8wsv1t/15min`
- Verify you have internet connection

### Issue: Booking not saved to database
**Check:**
1. Open browser console (F12) → Network tab
2. Look for POST request to `/api/cal-booking`
3. Check the response:
   - If 200: Booking was saved successfully
   - If 400/500: Check the error message
4. Verify Supabase table exists and has correct columns
5. Check Supabase logs for any errors

### Issue: Toast notification doesn't appear
**Check:**
- Verify `Toast` component is rendered in `leadsTable.jsx`
- Check browser console for errors
- Verify `onBookingComplete` callback is being called

### Issue: "Export Cal doesn't exist" error
**Solution:** Already fixed! The code now uses `getCalApi` instead of `Cal` component.

## Console Debugging

### Enable Detailed Logging
The code already includes console logs. Check your browser console for:

1. **When modal opens:**
   ```
   Cal.com event: {...}
   ```

2. **When booking is successful:**
   ```
   Booking successful: {...}
   Booking saved successfully: {...}
   ```

3. **If there's an error:**
   ```
   Error saving booking: ...
   ```

## Manual API Testing

You can test the API endpoint directly:

```bash
curl -X POST http://localhost:3000/api/cal-booking \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "test-lead-123",
    "lead_name": "Test Lead",
    "salesperson_id": "test-salesperson-123",
    "booking_payload": {
      "data": {
        "id": "test-booking-123",
        "title": "15min Meeting",
        "start": "2024-01-15T10:00:00Z",
        "end": "2024-01-15T10:15:00Z",
        "attendee": {
          "name": "Test User",
          "email": "test@example.com"
        }
      }
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "cal_event_id": "test-booking-123",
    "title": "15min Meeting",
    ...
  }
}
```

## Quick Test Checklist

- [ ] Package installed: `npm install @calcom/embed-react`
- [ ] Supabase table created
- [ ] "Book Meeting" button visible on lead cards
- [ ] Modal opens when button clicked
- [ ] Cal.com calendar loads in modal
- [ ] Can select a time slot
- [ ] Booking form pre-fills with lead info
- [ ] Can complete a booking
- [ ] Success toast appears
- [ ] Booking saved to database
- [ ] Database entry has all correct fields

## Next Steps After Testing

If everything works:
1. ✅ System is ready for production
2. Consider adding error boundaries for better error handling
3. Add loading states for better UX
4. Consider adding a list view of booked appointments

If something doesn't work:
1. Check the troubleshooting section above
2. Review browser console errors
3. Check Supabase logs
4. Verify all environment variables are set correctly

