# Sales Person Performance Chart - Data Flow Analysis

## Overview
This document analyzes the complete data flow for the "Sales Person Performance" KPI chart in the Sales CRM dashboard. The chart displays three metrics per sales person: **Calls**, **Meetings**, and **Conversions**.

---

## 1. Files Involved

### Frontend Components
- **`app/components/charts/salesperson-barchart.js`**
  - Chart component: `SalesPersonComparisonChart`
  - Renders the bar chart using ApexCharts
  - Fetches data via SWR hook

- **`app/dashboard/page.js`**
  - Dashboard page that renders the chart
  - Pre-fetches data on mount (line 77: `<SalesPersonComparisonChart />`)

### Backend API
- **`app/api/dashboard/salesperson-performance/route.js`**
  - API endpoint: `GET /api/dashboard/salesperson-performance`
  - Fetches and calculates all KPI metrics
  - Returns: `{ calls: [], meetings: [], conversions: [], salesPersons: [] }`

### Supporting Files
- **`lib/swr/fetcher.js`** - SWR fetcher function for API calls
- **`lib/crm/auth.js`** - `getCrmUser()` function for role-based access
- **`lib/supabase/serverClient.js`** - Supabase client instances

---

## 2. Data Flow: Database → Chart

### Step-by-Step Flow

```
Database Tables
    ↓
Supabase Queries (API Route)
    ↓
Data Transformation & Aggregation (Backend)
    ↓
JSON Response (API)
    ↓
SWR Hook (Frontend)
    ↓
Chart Component State
    ↓
ApexCharts Rendering
```

---

## 3. Database Tables Used

### Primary Tables

1. **`sales_persons`**
   - Columns accessed: `id`, `user_id`, `full_name`, `call_attended`, `meetings_attended`, `total_conversions`
   - Purpose: Get list of sales persons
   - Note: Performance columns (`call_attended`, `meetings_attended`, `total_conversions`) are **NOT used** in calculations (they exist but are ignored)

2. **`leads_table`**
   - Columns accessed: `id`, `assigned_to`, `first_call_done`, `meeting_status`, `status`
   - Purpose: **This is where all metrics are calculated from**
   - Aggregation: Done in backend JavaScript (not SQL)

3. **`users`**
   - Columns accessed: `id`, `name`, `email`, `role`
   - Purpose: Fallback for sales person names if `sales_persons` table is empty

---

## 4. How Metrics Are Calculated

### Calculation Location
**All calculations happen in the Backend API** (`app/api/dashboard/salesperson-performance/route.js`), specifically in **JavaScript**, not SQL.

### Calculation Logic (Lines 219-265)

#### Step 1: Fetch Leads for Each Sales Person
```javascript
// Line 228-231
const { data: allLeads } = await adminClient
  .from("leads_table")
  .select("id, assigned_to, first_call_done, meeting_status, status")
  .in("assigned_to", salesPersonIds);
```

#### Step 2: Initialize Metrics Object
```javascript
// Lines 235-241
salesPersonIds.forEach(spId => {
  calculatedMetrics[spId] = {
    calls: 0,
    meetings: 0,
    conversions: 0,
  };
});
```

#### Step 3: Count Metrics by Iterating Through Leads
```javascript
// Lines 244-263
allLeads.forEach(lead => {
  const spId = lead.assigned_to;
  
  // CALLS: Count if first_call_done === "Done"
  if (lead.first_call_done === "Done") {
    calculatedMetrics[spId].calls++;
  }
  
  // MEETINGS: Count if meeting_status === "completed" (case-insensitive)
  const meetingStatus = String(lead.meeting_status || "").toLowerCase();
  if (meetingStatus === "completed") {
    calculatedMetrics[spId].meetings++;
  }
  
  // CONVERSIONS: Count if status === "Won"
  if (lead.status === "Won") {
    calculatedMetrics[spId].conversions++;
  }
});
```

### Metric Definitions

#### **Calls**
- **Source**: `leads_table.first_call_done`
- **Condition**: `first_call_done === "Done"` (exact string match)
- **Calculation**: Count of leads where `first_call_done = "Done"` per sales person
- **Location**: Lines 248-251

#### **Meetings**
- **Source**: `leads_table.meeting_status`
- **Condition**: `meeting_status.toLowerCase() === "completed"` (case-insensitive)
- **Calculation**: Count of leads where `meeting_status = "Completed"` (any case) per sales person
- **Location**: Lines 253-257

#### **Conversions**
- **Source**: `leads_table.status`
- **Condition**: `status === "Won"` (exact string match)
- **Calculation**: Count of leads where `status = "Won"` per sales person
- **Location**: Lines 259-262

---

## 5. Complete Data Transformation Pipeline

### Backend API Processing (route.js)

#### Phase 1: Fetch Sales Persons (Lines 22-200)
1. Check user role (`getCrmUser()`)
2. Query `sales_persons` table:
   - Admin: All sales persons
   - Sales: Only their own record
3. Fallback to `users` table if `sales_persons` is empty
4. Build `userNamesMap` for name resolution

#### Phase 2: Calculate Metrics (Lines 219-265)
1. Fetch all leads assigned to sales persons using admin client
2. Initialize `calculatedMetrics` object with zeros
3. Loop through each lead and increment counters:
   - Calls: `first_call_done === "Done"`
   - Meetings: `meeting_status.toLowerCase() === "completed"`
   - Conversions: `status === "Won"`

#### Phase 3: Map to Performance Data (Lines 277-301)
```javascript
const performanceData = salesPersons.map((salesPerson) => {
  const calculated = calculatedMetrics[salesPerson.id] || {};
  
  return {
    name: salesPersonName,
    calls: calculated.calls !== undefined ? calculated.calls : 0,
    meetings: calculated.meetings !== undefined ? calculated.meetings : 0,
    conversions: calculated.conversions !== undefined ? calculated.conversions : 0,
  };
});
```

#### Phase 4: Sort and Extract Arrays (Lines 303-314)
1. Sort by total performance (calls + meetings + conversions) descending
2. Extract separate arrays:
   - `calls`: Array of numbers
   - `meetings`: Array of numbers
   - `conversions`: Array of numbers
   - `salesPersons`: Array of names

#### Phase 5: Return JSON Response (Lines 316-321)
```javascript
return Response.json({
  calls: [0, 0, 0, ...],        // Array of numbers
  meetings: [0, 0, 0, ...],     // Array of numbers
  conversions: [0, 0, 0, ...],  // Array of numbers
  salesPersons: ["Name1", "Name2", ...]  // Array of strings
});
```

### Frontend Processing (salesperson-barchart.js)

#### Step 1: Fetch Data (Lines 24-34)
```javascript
const { data = fallbackData, error } = useSWR(
  "/api/dashboard/salesperson-performance",
  fetcher,
  {
    fallbackData: { calls: [], meetings: [], conversions: [], salesPersons: [] }
  }
);
```

#### Step 2: Transform Data (Lines 140-143)
```javascript
const callsData = Array.isArray(data.calls) 
  ? data.calls.map(val => Number(val) || 0) 
  : [];
const meetingsData = Array.isArray(data.meetings) 
  ? data.meetings.map(val => Number(val) || 0) 
  : [];
const conversionsData = Array.isArray(data.conversions) 
  ? data.conversions.map(val => Number(val) || 0) 
  : [];
const categories = Array.isArray(data.salesPersons) 
  ? data.salesPersons 
  : [];
```

#### Step 3: Create Chart Series (Lines 145-149)
```javascript
const chartSeries = [
  { name: "Calls", data: callsData },
  { name: "Meetings", data: meetingsData },
  { name: "Conversions", data: conversionsData },
];
```

#### Step 4: Render Chart (Lines 258-265)
```javascript
<ApexChart
  options={chartOptions}
  series={chartSeries}
  type="bar"
  height={400}
/>
```

---

## 6. Why Chart Might Be Empty or Flat

### Potential Issues

#### Issue 1: No Sales Persons Found
- **Location**: Lines 154-200 in API route
- **Cause**: `sales_persons` table is empty or query fails
- **Result**: Returns empty arrays `{ calls: [], meetings: [], conversions: [], salesPersons: [] }`
- **Frontend**: Shows "No sales person data available" message (line 199-230)

#### Issue 2: No Leads Assigned
- **Location**: Lines 228-231 in API route
- **Cause**: No leads in `leads_table` with `assigned_to` matching sales person IDs
- **Result**: `calculatedMetrics` remains all zeros
- **Frontend**: Chart renders with all bars at zero

#### Issue 3: Wrong Field Values
- **Calls**: `first_call_done` must be exactly `"Done"` (case-sensitive)
  - If value is `"done"`, `"DONE"`, `"Yes"`, `true`, or `1` → **Not counted**
- **Meetings**: `meeting_status` must be `"completed"` (case-insensitive)
  - If value is `"scheduled"`, `"pending"`, `"cancelled"` → **Not counted**
- **Conversions**: `status` must be exactly `"Won"` (case-sensitive)
  - If value is `"won"`, `"WON"`, `"Closed Won"`, `"Converted"` → **Not counted**

#### Issue 4: User Role Issues
- **Location**: Lines 10-20, 31-50 in API route
- **Cause**: 
  - No authenticated user → Returns empty arrays
  - Sales user without `salesPersonId` → Returns empty arrays
- **Result**: Empty chart

#### Issue 5: RLS (Row Level Security) Blocking
- **Location**: Lines 82-142 in API route
- **Cause**: Supabase RLS policies blocking access to `leads_table`
- **Mitigation**: Code uses `supabaseAdmin()` client to bypass RLS (line 221)
- **Note**: If admin client fails, metrics remain zero

#### Issue 6: Data Type Mismatch
- **Location**: Lines 311-313 in API route
- **Cause**: Values not properly converted to numbers
- **Mitigation**: Code uses `Number(p.calls) || 0` to ensure numeric values
- **Frontend**: Also converts with `Number(val) || 0` (lines 140-142)

#### Issue 7: Empty Arrays Passed to Chart
- **Location**: Lines 140-143 in chart component
- **Cause**: API returns empty arrays or invalid data structure
- **Result**: Chart renders with no bars (empty categories array)
- **Check**: `categories.length === 0` triggers empty state (line 199)

---

## 7. Exact Variables and Functions

### Backend API Variables

| Variable | Type | Purpose | Location |
|----------|------|---------|----------|
| `crmUser` | Object | Current user with role and salesPersonId | Line 10 |
| `salesPersons` | Array | List of sales person records | Line 24 |
| `salesPersonIds` | Array | Array of sales person IDs | Line 222 |
| `allLeads` | Array | All leads assigned to sales persons | Line 228 |
| `calculatedMetrics` | Object | Metrics per sales person ID | Line 224 |
| `performanceData` | Array | Final mapped performance data | Line 277 |
| `calls` | Array<Number> | Calls array for chart | Line 311 |
| `meetings` | Array<Number> | Meetings array for chart | Line 312 |
| `conversions` | Array<Number> | Conversions array for chart | Line 313 |
| `salesPersonsNames` | Array<String> | Sales person names for x-axis | Line 314 |

### Frontend Chart Variables

| Variable | Type | Purpose | Location |
|----------|------|---------|----------|
| `data` | Object | SWR response data | Line 24 |
| `fallbackData` | Object | Empty fallback data | Line 16 |
| `callsData` | Array<Number> | Processed calls array | Line 140 |
| `meetingsData` | Array<Number> | Processed meetings array | Line 141 |
| `conversionsData` | Array<Number> | Processed conversions array | Line 142 |
| `categories` | Array<String> | Sales person names for x-axis | Line 143 |
| `chartSeries` | Array | ApexCharts series configuration | Line 145 |
| `chartOptions` | Object | ApexCharts options | Line 151 |

### Key Functions

| Function | Purpose | Location |
|----------|---------|----------|
| `getCrmUser()` | Get authenticated user with role | `lib/crm/auth.js` |
| `supabaseServer()` | Get Supabase client | `lib/supabase/serverClient.js` |
| `supabaseAdmin()` | Get admin Supabase client (bypasses RLS) | `lib/supabase/serverClient.js` |
| `fetcher()` | SWR fetcher function | `lib/swr/fetcher.js` |
| `useSWR()` | React hook for data fetching | `swr` library |

---

## 8. Aggregation Summary

### Where Aggregation Happens
- **Location**: Backend API (`route.js`)
- **Method**: JavaScript `forEach` loop (not SQL `GROUP BY`)
- **Lines**: 244-263

### Aggregation Logic
```javascript
// For each lead:
// 1. Get sales person ID from lead.assigned_to
// 2. Check conditions for each metric
// 3. Increment counter in calculatedMetrics[spId]
```

### No SQL Aggregation
- The code does **NOT** use SQL `GROUP BY`, `COUNT()`, or `SUM()`
- All counting happens in JavaScript after fetching all leads
- This means: **All leads are fetched into memory, then counted**

---

## 9. Data Structure Examples

### API Response Structure
```json
{
  "calls": [5, 3, 8, 2],
  "meetings": [2, 1, 4, 1],
  "conversions": [1, 0, 2, 0],
  "salesPersons": ["John Doe", "Jane Smith", "Bob Johnson", "Alice Brown"]
}
```

### Chart Series Structure
```javascript
[
  { name: "Calls", data: [5, 3, 8, 2] },
  { name: "Meetings", data: [2, 1, 4, 1] },
  { name: "Conversions", data: [1, 0, 2, 0] }
]
```

### ApexCharts Categories
```javascript
xaxis: {
  categories: ["John Doe", "Jane Smith", "Bob Johnson", "Alice Brown"]
}
```

---

## 10. Common Issues Checklist

### ✅ Check These First

1. **Sales Persons Exist?**
   - Query: `SELECT * FROM sales_persons;`
   - If empty → Chart will be empty

2. **Leads Assigned?**
   - Query: `SELECT COUNT(*) FROM leads_table WHERE assigned_to IS NOT NULL;`
   - If zero → All metrics will be zero

3. **Field Values Match?**
   - Calls: `SELECT DISTINCT first_call_done FROM leads_table;` → Must see `"Done"`
   - Meetings: `SELECT DISTINCT meeting_status FROM leads_table;` → Must see `"completed"` (any case)
   - Conversions: `SELECT DISTINCT status FROM leads_table;` → Must see `"Won"`

4. **User Authentication?**
   - Check if `getCrmUser()` returns valid user
   - Check if `crmUser.role` is `"admin"` or `"sales"`
   - Check if `crmUser.salesPersonId` exists for sales users

5. **RLS Policies?**
   - Check Supabase RLS policies on `leads_table`
   - Code uses admin client, but if it fails, metrics will be zero

6. **Data Types?**
   - Ensure `first_call_done` is string `"Done"` (not boolean)
   - Ensure `meeting_status` is string (case-insensitive)
   - Ensure `status` is string `"Won"` (not number or other format)

---

## 11. Summary: Where Each Metric Comes From

### **Calls**
- **Database Table**: `leads_table`
- **Column**: `first_call_done`
- **Condition**: `first_call_done === "Done"` (exact match, case-sensitive)
- **Calculation**: Count per `assigned_to` (sales person ID)
- **Location**: API route lines 248-251
- **Aggregation**: JavaScript `forEach` loop

### **Meetings**
- **Database Table**: `leads_table`
- **Column**: `meeting_status`
- **Condition**: `meeting_status.toLowerCase() === "completed"` (case-insensitive)
- **Calculation**: Count per `assigned_to` (sales person ID)
- **Location**: API route lines 253-257
- **Aggregation**: JavaScript `forEach` loop

### **Conversions**
- **Database Table**: `leads_table`
- **Column**: `status`
- **Condition**: `status === "Won"` (exact match, case-sensitive)
- **Calculation**: Count per `assigned_to` (sales person ID)
- **Location**: API route lines 259-262
- **Aggregation**: JavaScript `forEach` loop

---

## 12. Why Chart is Currently Empty/Flat

### Most Likely Causes (in order of probability):

1. **No leads with matching field values**
   - `first_call_done` is not exactly `"Done"`
   - `meeting_status` is not `"completed"` (any case)
   - `status` is not exactly `"Won"`

2. **No leads assigned to sales persons**
   - `leads_table.assigned_to` is `NULL` or doesn't match `sales_persons.id`

3. **No sales persons in database**
   - `sales_persons` table is empty
   - Query fails due to RLS or permissions

4. **User authentication issues**
   - `getCrmUser()` returns `null`
   - Sales user without `salesPersonId`

5. **Data fetched but not rendered**
   - Arrays are empty `[]` instead of `[0, 0, 0]`
   - `categories.length === 0` triggers empty state

---

## 13. Debugging Steps

### Step 1: Check API Response
```bash
# Test API endpoint directly
curl http://localhost:3000/api/dashboard/salesperson-performance
```

Expected response:
```json
{
  "calls": [0, 0, 0],
  "meetings": [0, 0, 0],
  "conversions": [0, 0, 0],
  "salesPersons": ["Name1", "Name2", "Name3"]
}
```

### Step 2: Check Database
```sql
-- Check sales persons
SELECT id, full_name FROM sales_persons;

-- Check leads with assigned_to
SELECT assigned_to, COUNT(*) 
FROM leads_table 
WHERE assigned_to IS NOT NULL 
GROUP BY assigned_to;

-- Check field values
SELECT 
  first_call_done,
  meeting_status,
  status,
  COUNT(*) as count
FROM leads_table
GROUP BY first_call_done, meeting_status, status;
```

### Step 3: Check Frontend Console
- Open browser DevTools → Network tab
- Look for `/api/dashboard/salesperson-performance` request
- Check response payload
- Check for JavaScript errors

### Step 4: Add Console Logs
Add to API route (line 263):
```javascript
console.log("Calculated Metrics:", calculatedMetrics);
console.log("Performance Data:", performanceData);
```

---

## End of Analysis

This document provides a complete trace of the data flow from database to chart rendering. All calculations happen in the backend API using JavaScript, not SQL aggregation. The chart will be empty if:
- No sales persons exist
- No leads are assigned
- Field values don't match exact conditions
- User authentication fails
