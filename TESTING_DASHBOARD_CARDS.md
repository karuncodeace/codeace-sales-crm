# Testing Guide: Dashboard Cards (Last 7 Days)

## Overview
The dashboard cards now track metrics based on `last_attempted_at` timestamp, which is automatically updated when specific fields are modified in the `leads_table`.

## Fields Tracked
The following fields trigger `last_attempted_at` update:
1. **first_call_done** - When set to "Done"
2. **lead_qualification** - When set to "qualified" or "Qualified"
3. **meeting_status** - When set to "Scheduled" or "Completed"
4. **status** - When set to "Follow up"

## Testing Steps

### Step 1: Verify Database Schema
First, ensure the `last_attempted_at` column exists in your `leads_table`:

```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads_table' 
AND column_name = 'last_attempted_at';

-- If it doesn't exist, create it:
ALTER TABLE leads_table 
ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMP WITH TIME ZONE;
```

### Step 2: Test "First Call Done"

#### Via API (Recommended):
```bash
# Update a lead's first_call_done field
curl -X PATCH http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "id": "YOUR_LEAD_ID",
    "first_call_done": "Done"
  }'
```

#### Via UI:
1. Go to the Leads page
2. Open any lead
3. Update the `first_call_done` field to "Done" (if you have a UI for this)
4. Or use the edit lead modal to update this field

#### Verify:
```bash
# Check the API response
curl http://localhost:3000/api/dashboard/cards

# Should return:
# {
#   "firstCallDone": 1,  // or more if you updated multiple leads
#   ...
# }
```

### Step 3: Test "Qualified Leads"

#### Via API:
```bash
# Update lead_qualification field
curl -X PATCH http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "id": "YOUR_LEAD_ID",
    "lead_qualification": "Lead is Qualified"
  }'
```

#### Verify:
- Check dashboard cards API - `qualifiedLeads` count should increase
- Check database: `last_attempted_at` should be set to current timestamp

### Step 4: Test "Meeting Scheduled"

#### Via API:
```bash
# Update meeting_status to "Scheduled"
curl -X PATCH http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "id": "YOUR_LEAD_ID",
    "meeting_status": "Scheduled"
  }'
```

#### Verify:
- Dashboard should show count in "Meeting Scheduled" card
- `last_attempted_at` should be updated in database

### Step 5: Test "Meeting Conducted"

#### Via API:
```bash
# Update meeting_status to "Completed"
curl -X PATCH http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "id": "YOUR_LEAD_ID",
    "meeting_status": "Completed"
  }'
```

### Step 6: Test "Follow Up Calls" and "Proposals Sent"

#### Via API:
```bash
# Update status to "Follow up"
curl -X PATCH http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "id": "YOUR_LEAD_ID",
    "status": "Follow up"
  }'
```

**Note:** Both "Follow Up Calls" and "Proposals Sent" use the same status "Follow up" - this is as per your requirements.

## Database Verification

### Check if `last_attempted_at` is being set:
```sql
SELECT 
  id,
  lead_name,
  first_call_done,
  lead_qualification,
  meeting_status,
  status,
  last_attempted_at,
  created_at
FROM leads_table
WHERE last_attempted_at IS NOT NULL
ORDER BY last_attempted_at DESC
LIMIT 10;
```

### Check leads updated in last 7 days:
```sql
SELECT 
  id,
  lead_name,
  first_call_done,
  lead_qualification,
  meeting_status,
  status,
  last_attempted_at
FROM leads_table
WHERE last_attempted_at >= NOW() - INTERVAL '7 days'
ORDER BY last_attempted_at DESC;
```

## Testing Scenarios

### Scenario 1: Update Multiple Fields
1. Update `first_call_done` to "Done" → `last_attempted_at` should be set
2. Update `lead_qualification` to "qualified" → `last_attempted_at` should be updated again
3. Check dashboard - both counts should reflect

### Scenario 2: Update Same Field Twice
1. Update `first_call_done` to "Done" → `last_attempted_at` = timestamp1
2. Wait a few seconds
3. Update `first_call_done` to "Done" again → `last_attempted_at` = timestamp2 (newer)
4. Dashboard should only count once (both have same value, but timestamp is updated)

### Scenario 3: Test Past 7 Days Filter
1. Update a lead's `first_call_done` to "Done" today → Should appear in dashboard
2. Manually set `last_attempted_at` to 8 days ago in database:
   ```sql
   UPDATE leads_table 
   SET last_attempted_at = NOW() - INTERVAL '8 days'
   WHERE id = 'YOUR_LEAD_ID';
   ```
3. Refresh dashboard → Should NOT appear in count (outside 7-day window)

## API Endpoints for Testing

### Get Dashboard Cards Data:
```bash
GET http://localhost:3000/api/dashboard/cards
```

### Update Lead Fields:
```bash
PATCH http://localhost:3000/api/leads
Content-Type: application/json

{
  "id": "LEAD_ID",
  "first_call_done": "Done",
  "lead_qualification": "Lead is Qualified",
  "meeting_status": "Scheduled",
  "status": "Follow up"
}
```

## Expected Results

After updating fields, the dashboard cards should show:

1. **First Call Done**: Count of leads with `first_call_done = "Done"` AND `last_attempted_at` within last 7 days
2. **Qualified Leads**: Count of leads with `lead_qualification` containing "qualified" AND `last_attempted_at` within last 7 days
3. **Meeting Scheduled**: Count of leads with `meeting_status = "Scheduled"` AND `last_attempted_at` within last 7 days
4. **Meeting Conducted**: Count of leads with `meeting_status = "Completed"` AND `last_attempted_at` within last 7 days
5. **Follow Up Calls**: Count of leads with `status = "Follow up"` AND `last_attempted_at` within last 7 days
6. **Proposals Sent**: Count of leads with `status = "Follow up"` AND `last_attempted_at` within last 7 days

## Troubleshooting

### Issue: Count is still 0 after updating
**Check:**
1. Verify `last_attempted_at` column exists in database
2. Check if the field value matches exactly (case-sensitive for some fields):
   - `first_call_done` must be exactly "Done"
   - `meeting_status` must be exactly "Scheduled" or "Completed"
   - `status` must be exactly "Follow up"
3. Verify `last_attempted_at` was set: Check database directly
4. Check browser console for API errors
5. Verify the date range: `last_attempted_at` must be within last 7 days

### Issue: Count includes old data
**Solution:** Old leads (updated before this change) won't have `last_attempted_at` set. Only new updates will be tracked.

### Issue: Field update doesn't trigger `last_attempted_at`
**Check:**
1. Ensure you're using the PATCH endpoint at `/api/leads`
2. Verify the field value actually changed (not setting same value)
3. Check API response for errors

## Quick Test Script

Save this as `test-dashboard.sh`:

```bash
#!/bin/bash

LEAD_ID="YOUR_LEAD_ID_HERE"
API_URL="http://localhost:3000/api"

echo "Testing Dashboard Cards..."

echo "\n1. Getting current dashboard data..."
curl -s "$API_URL/dashboard/cards" | jq '.'

echo "\n2. Updating first_call_done to 'Done'..."
curl -X PATCH "$API_URL/leads" \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$LEAD_ID\", \"first_call_done\": \"Done\"}"

sleep 2

echo "\n3. Getting updated dashboard data..."
curl -s "$API_URL/dashboard/cards" | jq '.firstCallDone'

echo "\n4. Updating lead_qualification..."
curl -X PATCH "$API_URL/leads" \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$LEAD_ID\", \"lead_qualification\": \"Lead is Qualified\"}"

sleep 2

echo "\n5. Getting updated dashboard data..."
curl -s "$API_URL/dashboard/cards" | jq '.qualifiedLeads'

echo "\nTest complete!"
```

Make it executable: `chmod +x test-dashboard.sh`
Run it: `./test-dashboard.sh`

