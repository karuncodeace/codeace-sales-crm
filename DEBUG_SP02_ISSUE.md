# Debugging SP-02 Chart Issue

## Problem
SP-02 has made 18 first calls but they're not showing in the Sales Person Performance chart.

## Root Cause Analysis

### Issue 1: Sales Person ID Mismatch
**"SP-02" is likely a display identifier, not the actual database ID.**

The chart uses `sales_persons.id` (UUID) to match with `leads_table.assigned_to`. If "SP-02" is just a name or code, it won't match.

### Issue 2: Field Value Mismatch
The code checks for **exact string match**: `first_call_done === "Done"`

But the field might be stored as:
- Boolean: `true` or `false`
- String: `"done"`, `"DONE"`, `"Yes"`, `"Completed"`
- Number: `1` or `0`

## Debug Queries

### Step 1: Find SP-02's Actual Sales Person ID

```sql
-- Find the sales person with identifier "SP-02"
SELECT 
  id,
  user_id,
  full_name,
  -- Check if there's a code or identifier field
  *
FROM sales_persons
WHERE 
  full_name LIKE '%SP-02%' 
  OR id::text LIKE '%SP-02%'
  OR user_id::text LIKE '%SP-02%';
```

### Step 2: Check Leads Assigned to SP-02

```sql
-- Replace 'YOUR_SP02_UUID' with the actual ID from Step 1
SELECT 
  id,
  assigned_to,
  first_call_done,
  meeting_status,
  status,
  COUNT(*) as count
FROM leads_table
WHERE assigned_to = 'YOUR_SP02_UUID'  -- Replace with actual UUID
GROUP BY id, assigned_to, first_call_done, meeting_status, status;
```

### Step 3: Check Actual Values of first_call_done

```sql
-- See all distinct values of first_call_done for SP-02's leads
SELECT 
  first_call_done,
  COUNT(*) as count,
  typeof(first_call_done) as data_type
FROM leads_table
WHERE assigned_to = 'YOUR_SP02_UUID'  -- Replace with actual UUID
GROUP BY first_call_done;
```

### Step 4: Count Leads with Different first_call_done Values

```sql
-- Count how many leads have each value
SELECT 
  CASE 
    WHEN first_call_done IS NULL THEN 'NULL'
    WHEN first_call_done = true THEN 'true (boolean)'
    WHEN first_call_done = 'true' THEN 'true (string)'
    WHEN first_call_done = 'Done' THEN 'Done (exact match)'
    WHEN first_call_done = 'done' THEN 'done (lowercase)'
    WHEN first_call_done = 'DONE' THEN 'DONE (uppercase)'
    WHEN first_call_done = 'Yes' THEN 'Yes'
    WHEN first_call_done = 1 THEN '1 (number)'
    ELSE first_call_done::text
  END as first_call_status,
  COUNT(*) as lead_count
FROM leads_table
WHERE assigned_to = 'YOUR_SP02_UUID'  -- Replace with actual UUID
GROUP BY first_call_done
ORDER BY lead_count DESC;
```

## Quick Fix Options

### Option 1: Fix the Field Value Check (Recommended)

Update the API to handle multiple formats:

**File**: `app/api/dashboard/salesperson-performance/route.js`
**Line**: 248-251

**Current Code:**
```javascript
// Count calls: first_call_done = "Done"
if (lead.first_call_done === "Done") {
  calculatedMetrics[spId].calls++;
}
```

**Fixed Code:**
```javascript
// Count calls: first_call_done = "Done" (handle multiple formats)
const firstCallDone = String(lead.first_call_done || "").toLowerCase().trim();
if (firstCallDone === "done" || firstCallDone === "true" || lead.first_call_done === true || lead.first_call_done === 1) {
  calculatedMetrics[spId].calls++;
}
```

### Option 2: Fix Data in Database

If the field is stored incorrectly, update it:

```sql
-- Update all first_call_done values to "Done" (if they should be counted)
UPDATE leads_table
SET first_call_done = 'Done'
WHERE 
  assigned_to = 'YOUR_SP02_UUID'  -- Replace with actual UUID
  AND (
    first_call_done = true
    OR first_call_done = 'true'
    OR first_call_done = 'done'
    OR first_call_done = 'DONE'
    OR first_call_done = 'Yes'
    OR first_call_done = 1
  );
```

## Verification Steps

### 1. Test API Response Directly

```bash
# Test the API endpoint
curl http://localhost:3000/api/dashboard/salesperson-performance

# Or in browser console:
fetch('/api/dashboard/salesperson-performance')
  .then(r => r.json())
  .then(data => {
    console.log('Sales Persons:', data.salesPersons);
    console.log('Calls:', data.calls);
    console.log('Meetings:', data.meetings);
    console.log('Conversions:', data.conversions);
  });
```

### 2. Add Debug Logging to API

Add this to `app/api/dashboard/salesperson-performance/route.js` after line 263:

```javascript
// Debug logging
if (salesPersonIds.includes('YOUR_SP02_UUID')) {  // Replace with actual UUID
  console.log('SP-02 Metrics:', calculatedMetrics['YOUR_SP02_UUID']);
  console.log('SP-02 Leads Sample:', allLeads
    .filter(l => l.assigned_to === 'YOUR_SP02_UUID')
    .slice(0, 5)
    .map(l => ({
      id: l.id,
      first_call_done: l.first_call_done,
      type: typeof l.first_call_done
    }))
  );
}
```

### 3. Check Browser Network Tab

1. Open DevTools → Network tab
2. Refresh dashboard
3. Find `/api/dashboard/salesperson-performance` request
4. Check Response tab
5. Look for SP-02's name in `salesPersons` array
6. Check corresponding index in `calls` array

## Most Likely Issues (Priority Order)

1. **Field Value Format**: `first_call_done` is stored as `true` (boolean) or `"done"` (lowercase) instead of `"Done"` (string)
2. **Sales Person ID Mismatch**: "SP-02" identifier doesn't match the UUID in `sales_persons.id`
3. **Leads Not Assigned**: Leads exist but `assigned_to` is NULL or points to different sales person
4. **Case Sensitivity**: Field is `"done"` (lowercase) but code checks for `"Done"` (capitalized)

## Next Steps

1. Run the SQL queries above to identify the actual issue
2. Check the API response in browser DevTools
3. Apply the appropriate fix based on findings
4. Verify the chart updates correctly
