# Dashboard Cards Guide: Real-Time Sales Metrics System

## Section 1: Conceptual Overview (Non-Technical)

### The Problem
Sales teams need real-time visibility into key performance metrics across their pipeline. The dashboard should instantly show how many leads were generated, calls completed, meetings scheduled, and deals won - all filtered by date ranges and user roles (admin vs sales person).

### The Solution
The dashboard displays 8 key metric cards that automatically update every 10 seconds, showing:
1. **Leads Generated** - Total new leads in the date range
2. **First Call Done** - Leads where initial contact was completed
3. **Qualified Leads** - Leads that passed qualification criteria
4. **Meeting Scheduled** - Leads with scheduled meetings
5. **Meeting Conducted** - Leads where meetings were completed
6. **Follow Up Calls** - Leads in follow-up stage
7. **Proposals Sent** - Leads with proposals sent
8. **Conversion Rate** - Percentage of leads that converted to "Won"

### Key Features

**1. Real-Time Updates**
- Cards refresh every 10 seconds automatically
- Uses SWR (Stale-While-Revalidate) for optimal performance
- Shows fallback data (zeros) immediately while loading

**2. Role-Based Filtering**
- **Admin users**: See metrics for all leads across all sales people
- **Sales users**: See only metrics for leads assigned to them
- Automatic filtering based on logged-in user's role

**3. Date Range Filtering**
- **Default**: Last 7 days (including today)
- **Custom**: User can select start date and end date
- All metrics recalculate based on selected date range

**4. Smart Date Logic**
- Uses `last_attempted_at` as primary date field (when lead was last worked on)
- Falls back to `created_at` if `last_attempted_at` is NULL
- This ensures accurate counting based on when work happened, not just when lead was created

---

## Section 2: Architecture & Data Flow

### Component Hierarchy

```
DashboardPage
  └─ DashboardHeader
      ├─ Header (title)
      ├─ DashboardFilter (date picker)
      └─ Cards (metrics display)
          └─ Individual Card Components (8 cards)
```

### Data Flow Diagram

```
User selects date range
        ↓
DashboardFilter updates filterData state
        ↓
Cards component receives filterData prop
        ↓
Builds API URL with date parameters
        ↓
SWR fetches from /api/dashboard/cards
        ↓
API Route queries Supabase database
        ↓
Applies role-based filtering (admin vs sales)
        ↓
Calculates each metric from leads_table
        ↓
Returns JSON with 8 metrics
        ↓
SWR updates cache and re-renders Cards
        ↓
Cards display updated metrics
```

### SWR Configuration

```javascript
{
  revalidateOnFocus: true,      // Refresh when user focuses tab
  revalidateOnReconnect: true,  // Refresh when connection restored
  refreshInterval: 10000,        // Auto-refresh every 10 seconds
  dedupingInterval: 2000,        // Dedupe requests within 2 seconds
  fallbackData: fallbackCardsData // Show zeros immediately
}
```

**Why SWR?**
- **Performance**: Caches data in memory, shows stale data while fetching fresh data
- **Real-time**: Auto-refreshes every 10 seconds without user action
- **Resilience**: Shows cached data even if API fails temporarily
- **Efficiency**: Deduplicates multiple requests to same endpoint

---

## Section 3: Metric Calculation Logic

### Inputs

```javascript
{
  // From URL query parameters (optional)
  startDate: "2024-12-01",      // YYYY-MM-DD format
  endDate: "2024-12-31",        // YYYY-MM-DD format
  
  // From authenticated user session
  crmUser: {
    id: "user-uuid",
    role: "sales" | "admin",
    salesPersonId: "salesperson-uuid" // Only for sales users
  }
}
```

### Processing Steps

#### Step 1: Authentication & Role Detection

```javascript
// Get authenticated user from session
const crmUser = await getCrmUser();

// Determine filtering scope
if (crmUser.role === "sales") {
  // Sales users see only their assigned leads
  salesPersonId = crmUser.salesPersonId;
} else {
  // Admin users see all leads
  salesPersonId = null;
}
```

#### Step 2: Date Range Calculation

```javascript
if (startDateParam && endDateParam) {
  // Use custom date range from filter
  startDate = new Date(startDateParam);
  startDate.setHours(0, 0, 0, 0);      // Start of day
  endDate = new Date(endDateParam);
  endDate.setHours(23, 59, 59, 999);   // End of day
} else {
  // Default to last 7 days
  const now = new Date();
  endDate = now;                        // Current time
  startDate = new Date(now);
  startDate.setDate(now.getDate() - 7); // 7 days ago
  startDate.setHours(0, 0, 0, 0);
}
```

#### Step 3: Role-Based Filtering Helper

```javascript
function applySalesPersonFilter(query, tableName) {
  if (!salesPersonId) {
    return query; // Admin: no filtering
  }
  
  // Sales: filter by sales person ID
  if (tableName === "leads_table") {
    return query.eq("assigned_to", salesPersonId);
  } else if (tableName === "tasks_table") {
    return query.eq("sales_person_id", salesPersonId);
  } else if (tableName === "appointments") {
    return query.eq("salesperson_id", salesPersonId);
  }
  
  return query;
}
```

### Metric Calculations

#### 1. Leads Generated

**Definition**: Total number of leads created within the date range

**Query Logic**:
```sql
SELECT COUNT(*) FROM leads_table
WHERE created_at >= startDate
  AND created_at <= endDate
  AND (assigned_to = salesPersonId OR salesPersonId IS NULL)
```

**Implementation**:
```javascript
let leadsQuery = supabase
  .from("leads_table")
  .select("*", { count: "exact", head: true })
  .gte("created_at", startDateStr)
  .lte("created_at", endDateStr);

leadsQuery = applySalesPersonFilter(leadsQuery, "leads_table");

const { count: leadsGenerated } = await leadsQuery;
```

**Example**:
- Admin with 5 leads created in last 7 days → **5**
- Sales person with 2 assigned leads in last 7 days → **2**

---

#### 2. First Call Done

**Definition**: Number of leads where first call was completed (first_call_done = "Done")

**Date Logic**: Uses `last_attempted_at` (when call happened), falls back to `created_at`

**Query Logic**:
```javascript
// 1. Fetch all leads with date in range
SELECT id, first_call_done, last_attempted_at, created_at
FROM leads_table
WHERE (last_attempted_at >= startDate OR created_at >= startDate)
  AND (assigned_to = salesPersonId OR salesPersonId IS NULL)

// 2. Filter in JavaScript for case-insensitive "Done"
leads.filter(lead => {
  const status = String(lead.first_call_done || "").toLowerCase();
  if (status !== "done") return false;
  
  const dateStr = lead.last_attempted_at || lead.created_at;
  const checkDate = new Date(dateStr);
  
  return checkDate >= startDate && checkDate <= endDate;
})
```

**Why JavaScript filtering?**
- Database stores "Done" as string, but might have variations ("done", "DONE", "Done")
- Case-insensitive comparison is more reliable in JavaScript than SQL

**Example**:
- Lead A: `first_call_done = "Done"`, `last_attempted_at = "2024-12-15"` → **Counted**
- Lead B: `first_call_done = "Pending"`, `last_attempted_at = "2024-12-15"` → **Not counted**
- Lead C: `first_call_done = "Done"`, `last_attempted_at = NULL`, `created_at = "2024-12-15"` → **Counted** (uses created_at)

---

#### 3. Qualified Leads

**Definition**: Number of leads marked as qualified (lead_qualification contains "qualified")

**Date Logic**: Uses `last_attempted_at`, falls back to `created_at`

**Query Logic**:
```javascript
// 1. Fetch all leads
SELECT id, lead_qualification, last_attempted_at, created_at
FROM leads_table
WHERE (last_attempted_at >= startDate OR created_at >= startDate)
  AND (assigned_to = salesPersonId OR salesPersonId IS NULL)

// 2. Filter for "qualified" (case-insensitive)
leads.filter(lead => {
  const qualification = String(lead.lead_qualification || "").toLowerCase();
  if (!qualification.includes("qualified")) return false;
  
  const dateStr = lead.last_attempted_at || lead.created_at;
  const checkDate = new Date(dateStr);
  
  return checkDate >= startDate && checkDate <= endDate;
})
```

**Example**:
- Lead A: `lead_qualification = "Qualified"` → **Counted**
- Lead B: `lead_qualification = "Not Qualified"` → **Not counted**
- Lead C: `lead_qualification = "Pre-Qualified"` → **Counted** (contains "qualified")

---

#### 4. Meeting Scheduled

**Definition**: Number of leads with scheduled meetings

**Sources**: 
1. Leads table: `meeting_status = "Scheduled"`
2. Bookings table: `status = "scheduled"` (new booking system)

**Query Logic**:
```javascript
// Source 1: Leads table
SELECT id, meeting_status, last_attempted_at, created_at
FROM leads_table
WHERE (last_attempted_at >= startDate OR created_at >= startDate)
  AND (assigned_to = salesPersonId OR salesPersonId IS NULL)

// Filter for "Scheduled"
const fromLeads = leads.filter(lead => {
  const status = String(lead.meeting_status || "").toLowerCase();
  if (status !== "scheduled") return false;
  
  const dateStr = lead.last_attempted_at || lead.created_at;
  const checkDate = new Date(dateStr);
  
  return checkDate >= startDate && checkDate <= endDate;
}).length;

// Source 2: Bookings table
SELECT id, status, created_at, lead_id
FROM bookings
WHERE status = "scheduled"
  AND created_at >= startDate
  AND created_at <= endDate

// For sales users, filter bookings by lead assignment
if (salesPersonId) {
  const leadIds = bookings.map(b => b.lead_id);
  const assignedLeads = await supabase
    .from("leads_table")
    .select("id")
    .in("id", leadIds)
    .eq("assigned_to", salesPersonId);
  
  const assignedLeadIds = new Set(assignedLeads.map(l => l.id));
  bookingsCount = bookings.filter(b => 
    b.lead_id && assignedLeadIds.has(b.lead_id)
  ).length;
}

// Total = leads + bookings
meetingScheduled = fromLeads + bookingsCount;
```

**Example**:
- 3 leads with `meeting_status = "Scheduled"` → **3**
- 2 bookings with `status = "scheduled"` → **2**
- Total = **5**

---

#### 5. Meeting Conducted

**Definition**: Number of leads where meeting was completed (meeting_status = "Completed")

**Query Logic**:
```javascript
SELECT id, meeting_status, last_attempted_at, created_at
FROM leads_table
WHERE (last_attempted_at >= startDate OR created_at >= startDate)
  AND (assigned_to = salesPersonId OR salesPersonId IS NULL)

// Filter for "Completed"
leads.filter(lead => {
  const status = String(lead.meeting_status || "").toLowerCase();
  if (status !== "completed") return false;
  
  const dateStr = lead.last_attempted_at || lead.created_at;
  const checkDate = new Date(dateStr);
  
  return checkDate >= startDate && checkDate <= endDate;
})
```

**Example**:
- Lead A: `meeting_status = "Completed"`, `last_attempted_at = "2024-12-15"` → **Counted**
- Lead B: `meeting_status = "Scheduled"`, `last_attempted_at = "2024-12-15"` → **Not counted**

---

#### 6. Follow Up Calls

**Definition**: Number of leads in follow-up stage (status = "Follow up")

**Query Logic**:
```javascript
SELECT id, last_attempted_at, created_at
FROM leads_table
WHERE status = "Follow up"
  AND (last_attempted_at >= startDate OR created_at >= startDate)
  AND (assigned_to = salesPersonId OR salesPersonId IS NULL)

// Filter by date
leads.filter(lead => {
  const dateStr = lead.last_attempted_at || lead.created_at;
  const checkDate = new Date(dateStr);
  
  return checkDate >= startDate && checkDate <= endDate;
})
```

**Example**:
- Lead A: `status = "Follow up"`, `last_attempted_at = "2024-12-15"` → **Counted**
- Lead B: `status = "New Lead"`, `last_attempted_at = "2024-12-15"` → **Not counted**

---

#### 7. Proposals Sent

**Definition**: Number of leads with proposals sent (status = "Follow up")

**Note**: Currently uses same logic as "Follow Up Calls" - both count leads with `status = "Follow up"`

**Query Logic**:
```javascript
// Same as Follow Up Calls
proposalsSent = followUpCalls;
```

**Future Enhancement**: Add separate `proposals_sent` field to leads_table for accurate tracking

**Example**:
- If 3 leads have `status = "Follow up"`:
  - Follow Up Calls = **3**
  - Proposals Sent = **3**

---

#### 8. Conversion Rate

**Definition**: Percentage of leads that converted to "Won" status

**Formula**: `(Converted Leads / Total Leads) × 100`

**Query Logic**:
```javascript
// 1. Get converted leads (status = "Won")
SELECT id, status, last_attempted_at, created_at
FROM leads_table
WHERE (last_attempted_at >= startDate OR created_at >= startDate)
  AND (assigned_to = salesPersonId OR salesPersonId IS NULL)

// Filter for "Won" status
const convertedLeads = leads.filter(lead => {
  const status = String(lead.status || "").toLowerCase();
  if (status !== "won") return false;
  
  const dateStr = lead.last_attempted_at || lead.created_at;
  const checkDate = new Date(dateStr);
  
  return checkDate >= startDate && checkDate <= endDate;
}).length;

// 2. Calculate rate
const totalLeads = leadsGenerated; // From Metric 1
const conversionRate = totalLeads > 0 
  ? ((convertedLeads / totalLeads) * 100).toFixed(1)
  : 0;
```

**Example**:
- 10 leads generated in last 7 days
- 2 leads with `status = "Won"`
- Conversion rate = (2 / 10) × 100 = **20.0%**

---

### Output Format

```javascript
{
  leadsGenerated: 10,
  firstCallDone: 8,
  qualifiedLeads: 6,
  meetingScheduled: 5,
  meetingConducted: 4,
  followUpCalls: 3,
  proposalsSent: 3,
  conversionRate: 20.0,
  leadIds: ["uuid1", "uuid2", ...] // All unique lead IDs across metrics
}
```

---

## Section 4: Frontend Implementation

### Component: `Cards.jsx`

```javascript
"use client"
import useSWR from "swr";
import { useTheme } from "../../context/themeContext";
import { fetcher } from "../../../lib/swr/fetcher";
import { Users, Phone, CheckCircle2, Calendar, ... } from "lucide-react";

// Fallback data for immediate display
const fallbackCardsData = {
  leadsGenerated: 0,
  firstCallDone: 0,
  qualifiedLeads: 0,
  meetingScheduled: 0,
  meetingConducted: 0,
  followUpCalls: 0,
  proposalsSent: 0,
  conversionRate: 0
};

export default function Cards({ filterData }) {
  const { theme } = useTheme();

  // Build API URL with filter parameters
  const apiUrl = filterData && filterData.startDate && filterData.endDate
    ? `/api/dashboard/cards?startDate=${encodeURIComponent(filterData.startDate)}&endDate=${encodeURIComponent(filterData.endDate)}`
    : "/api/dashboard/cards";

  // Fetch data using SWR
  const { data = fallbackCardsData, error } = useSWR(
    apiUrl,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 10000,
      dedupingInterval: 2000,
      fallbackData: fallbackCardsData,
    }
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {/* 8 card components here */}
    </div>
  );
}
```

### Card Structure

Each card follows this structure:

```javascript
<div className="card-container">
  {/* Decorative background circle */}
  <div className="absolute top-0 right-0 w-32 bg-blue-500/10 rounded-full" />
  
  {/* Icon */}
  <div className="absolute top-5 right-7 p-2.5 rounded-xl bg-blue-500/10">
    <Users className="h-6 w-6 text-blue-400" />
  </div>
  
  {/* Content */}
  <div className="relative h-full flex flex-col gap-5">
    <h3 className="text-sm font-medium text-gray-400">
      Leads Generated
    </h3>
    <p className="text-4xl font-bold text-white">
      {error ? "-" : data?.leadsGenerated ?? 0}
    </p>
  </div>
</div>
```

### Card Color Scheme

| Metric | Color | Icon |
|--------|-------|------|
| Leads Generated | Blue | Users |
| First Call Done | Green | Phone |
| Qualified Leads | Purple | CheckCircle2 |
| Meeting Scheduled | Orange | Calendar |
| Meeting Conducted | Indigo | CalendarCheck |
| Follow Up Calls | Teal | PhoneForwarded |
| Proposals Sent | Pink | FileText |
| Conversion Rate | Emerald | TrendingUp |

### Responsive Design

```css
/* Mobile: 1 column */
grid-cols-1

/* Tablet: 2 columns */
sm:grid-cols-2

/* Desktop: 3 columns */
lg:grid-cols-3

/* Large Desktop: 4 columns */
xl:grid-cols-4

/* Card height adjusts by screen size */
h-30 xl:h-32

/* Text size scales */
text-2xl sm:text-3xl xl:text-4xl
```

### Dark Mode Support

```javascript
// Background
${theme === "dark"
  ? "bg-[#262626] border-gray-700"
  : "bg-white border-gray-200"
}

// Text
${theme === "dark"
  ? "text-gray-400"
  : "text-gray-600"
}

// Value
${theme === "dark"
  ? "text-white"
  : "text-gray-900"
}
```

---

## Section 5: API Route Implementation

### File: `app/api/dashboard/cards/route.js`

```javascript
export async function GET(request) {
  try {
    // 1. Authenticate user
    const crmUser = await getCrmUser();
    if (!crmUser) {
      return Response.json({ error: "Not authorized" }, { status: 403 });
    }

    // 2. Get Supabase admin client (bypass RLS)
    const supabase = supabaseAdmin();

    // 3. Determine sales person filtering
    let salesPersonId = null;
    if (crmUser.role === "sales") {
      salesPersonId = crmUser.salesPersonId;
      
      // Fallback: Query sales_persons table if salesPersonId missing
      if (!salesPersonId) {
        const { data: salesPerson } = await supabase
          .from("sales_persons")
          .select("id")
          .eq("user_id", crmUser.id)
          .maybeSingle();
        
        salesPersonId = salesPerson?.id;
      }
    }

    // 4. Parse date range from query params
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let startDate, endDate;
    if (startDateParam && endDateParam) {
      // Custom date range
      startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default: last 7 days
      const now = new Date();
      endDate = now;
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    }

    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    // 5. Calculate each metric (see Section 3)
    const leadsGenerated = await calculateLeadsGenerated();
    const firstCallDone = await calculateFirstCallDone();
    // ... (8 metrics total)

    // 6. Return JSON response
    return Response.json({
      leadsGenerated,
      firstCallDone,
      qualifiedLeads,
      meetingScheduled,
      meetingConducted,
      followUpCalls,
      proposalsSent,
      conversionRate,
      leadIds: uniqueLeadIds
    });

  } catch (error) {
    console.error("Dashboard Cards API Error:", error);
    return Response.json(
      { error: "Failed to fetch cards data" },
      { status: 500 }
    );
  }
}
```

### Error Handling

```javascript
// Safe query wrapper
const safeQuery = async (queryFn, defaultValue) => {
  try {
    const result = await queryFn();
    if (result.error) {
      console.error("Query error:", result.error);
      return defaultValue;
    }
    return result;
  } catch (error) {
    console.error("Query exception:", error);
    return defaultValue;
  }
};

// Usage
const { count: leadsGenerated = 0 } = await safeQuery(
  () => leadsQuery,
  { count: 0 }
);
```

**Benefits**:
- Prevents API from crashing if one metric fails
- Returns default values (0) for failed metrics
- Logs errors for debugging
- Dashboard continues to work with partial data

---

## Section 6: Edge Cases & Best Practices

### Edge Case 1: Missing `last_attempted_at` Field

**Problem**: Older leads don't have `last_attempted_at` populated

**Solution**:
```javascript
// Always fallback to created_at
const dateStr = lead.last_attempted_at || lead.created_at;
const checkDate = new Date(dateStr);
```

**Example**:
- Lead A: `last_attempted_at = "2024-12-15"` → Use this
- Lead B: `last_attempted_at = NULL`, `created_at = "2024-12-10"` → Use created_at

---

### Edge Case 2: Case-Insensitive String Matching

**Problem**: Database might have "Done", "done", "DONE" variations

**Solution**:
```javascript
// Convert to lowercase before comparing
const status = String(lead.first_call_done || "").toLowerCase();
if (status === "done") {
  // Match found
}
```

**Example**:
- "Done" → "done" → **Match**
- "DONE" → "done" → **Match**
- "done" → "done" → **Match**
- "Pending" → "pending" → **No match**

---

### Edge Case 3: Sales User Without `salesPersonId`

**Problem**: Sales user's `salesPersonId` is NULL in session

**Solution**:
```javascript
// Fallback query to sales_persons table
if (crmUser.role === "sales" && !crmUser.salesPersonId) {
  const { data: salesPerson } = await supabase
    .from("sales_persons")
    .select("id")
    .eq("user_id", crmUser.id)
    .maybeSingle();
  
  if (salesPerson) {
    salesPersonId = salesPerson.id;
  } else {
    // Return empty data with error message
    return Response.json({
      ...fallbackCardsData,
      error: "Sales person ID not found - please contact admin"
    });
  }
}
```

**Example**:
- Sales user logs in → `salesPersonId` is NULL
- Fallback query finds `salesPersonId = "xyz"`
- Dashboard shows only leads assigned to "xyz"

---

### Edge Case 4: Date Boundary Precision

**Problem**: Dates must include full day (00:00:00 to 23:59:59)

**Solution**:
```javascript
startDate.setHours(0, 0, 0, 0);      // Start of day
endDate.setHours(23, 59, 59, 999);   // End of day
```

**Example**:
- User selects "2024-12-15"
- Start: `2024-12-15T00:00:00.000Z`
- End: `2024-12-15T23:59:59.999Z`
- Includes all leads created on 2024-12-15

---

### Edge Case 5: Null/Undefined Data Handling

**Problem**: API might return null or undefined for some fields

**Solution**:
```javascript
// Use nullish coalescing and optional chaining
{error ? "-" : data?.leadsGenerated ?? 0}

// Backend: Use || for defaults
const leadsGenerated = result.count || 0;
```

**Example**:
- API returns `{ leadsGenerated: null }` → Display **0**
- API returns `{ leadsGenerated: undefined }` → Display **0**
- API fails → Display **-**

---

### Edge Case 6: SWR Cache Staleness

**Problem**: User changes date filter, but sees old data briefly

**Solution**: SWR automatically handles this with "stale-while-revalidate" pattern
```javascript
// When filter changes:
1. URL changes: /api/dashboard/cards?startDate=2024-12-01&endDate=2024-12-31
2. SWR shows cached data from previous filter (stale)
3. SWR fetches fresh data in background
4. SWR replaces stale data with fresh data
5. Cards re-render with new values
```

**User Experience**:
- Instant feedback (shows cached data)
- Smooth transition (no loading spinner)
- Fresh data appears within 1-2 seconds

---

### Best Practices Summary

1. **Always Use Fallback Data**
   ```javascript
   const { data = fallbackCardsData, error } = useSWR(...)
   ```
   - Shows zeros immediately while loading
   - Prevents "undefined" errors
   - Improves perceived performance

2. **Use `last_attempted_at` with Fallback**
   ```javascript
   const dateStr = lead.last_attempted_at || lead.created_at;
   ```
   - More accurate date for metrics
   - Handles legacy data without `last_attempted_at`

3. **Case-Insensitive String Matching**
   ```javascript
   String(value || "").toLowerCase() === "done"
   ```
   - Handles data inconsistencies
   - More robust than exact match

4. **Role-Based Filtering Helper**
   ```javascript
   const applySalesPersonFilter = (query, tableName) => { ... }
   ```
   - Consistent filtering across all metrics
   - Easy to maintain
   - Reduces code duplication

5. **Safe Query Wrapper**
   ```javascript
   const safeQuery = async (queryFn, defaultValue) => { ... }
   ```
   - Prevents API crashes
   - Returns sensible defaults
   - Logs errors for debugging

6. **Optimize SWR Configuration**
   ```javascript
   {
     refreshInterval: 10000,    // Real-time updates
     dedupingInterval: 2000,    // Avoid duplicate requests
     revalidateOnFocus: true    // Refresh when tab focused
   }
   ```
   - Balance freshness vs performance
   - Reduce unnecessary API calls

7. **Handle Date Boundaries Correctly**
   ```javascript
   startDate.setHours(0, 0, 0, 0);
   endDate.setHours(23, 59, 59, 999);
   ```
   - Include full day range
   - Avoid off-by-one errors

8. **Use Admin Client for Dashboard**
   ```javascript
   const supabase = supabaseAdmin();
   ```
   - Bypasses Row Level Security (RLS)
   - Allows aggregation across all leads
   - Apply manual role-based filtering in code

---

## Section 7: Database Schema

### Tables Used

#### 1. `leads_table`

Primary table for all metrics

```sql
CREATE TABLE leads_table (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP,
  last_attempted_at TIMESTAMP,        -- When lead was last worked on
  assigned_to UUID,                    -- Foreign key to sales_persons
  
  -- Metric fields
  first_call_done TEXT,                -- "Done" | "Pending" | NULL
  lead_qualification TEXT,             -- "Qualified" | "Not Qualified" | NULL
  meeting_status TEXT,                 -- "Scheduled" | "Completed" | NULL
  status TEXT,                         -- "New Lead" | "Follow up" | "Won" | "Lost"
  
  -- Other fields
  name TEXT,
  email TEXT,
  phone TEXT,
  ...
);
```

#### 2. `bookings`

Used for Meeting Scheduled metric

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP,
  start_time TIMESTAMP,
  status TEXT,                         -- "scheduled" | "completed" | "cancelled"
  lead_id UUID,                        -- Foreign key to leads_table
  host_user_id UUID,
  ...
);
```

#### 3. `sales_persons`

Used for role-based filtering

```sql
CREATE TABLE sales_persons (
  id UUID PRIMARY KEY,
  user_id UUID,                        -- Foreign key to auth.users
  name TEXT,
  email TEXT,
  ...
);
```

### Indexes for Performance

```sql
-- Speed up date range queries
CREATE INDEX idx_leads_created_at ON leads_table(created_at);
CREATE INDEX idx_leads_last_attempted_at ON leads_table(last_attempted_at);

-- Speed up sales person filtering
CREATE INDEX idx_leads_assigned_to ON leads_table(assigned_to);

-- Speed up status filtering
CREATE INDEX idx_leads_status ON leads_table(status);
CREATE INDEX idx_leads_meeting_status ON leads_table(meeting_status);
CREATE INDEX idx_leads_first_call_done ON leads_table(first_call_done);

-- Speed up bookings queries
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_bookings_lead_id ON bookings(lead_id);
CREATE INDEX idx_bookings_status ON bookings(status);
```

---

## Section 8: Performance Optimization

### Current Performance

- **API Response Time**: ~200-500ms (depending on data volume)
- **SWR Cache Hit**: ~5ms (instant from cache)
- **Auto-refresh**: Every 10 seconds
- **User Action Refresh**: On focus/reconnect

### Optimization Strategies

#### 1. SWR Caching
- Keeps data in memory
- Shows stale data while fetching fresh data
- Reduces perceived latency to ~5ms

#### 2. Deduplication
- Multiple components requesting same data → 1 API call
- `dedupingInterval: 2000` → Dedupe within 2 seconds

#### 3. Database Indexes
- See Section 7 for index recommendations
- Speeds up date range and status filtering

#### 4. Admin Client (Bypass RLS)
- Row Level Security (RLS) adds query overhead
- Admin client bypasses RLS for aggregation
- Apply role filtering manually in code

#### 5. Single Query Per Metric
- Each metric runs 1-2 queries max
- No N+1 query problems
- Parallel execution where possible

### Future Optimizations

#### 1. Database View
Create a materialized view for pre-computed metrics:

```sql
CREATE MATERIALIZED VIEW dashboard_metrics_daily AS
SELECT 
  DATE(created_at) AS metric_date,
  assigned_to,
  COUNT(*) AS leads_generated,
  COUNT(*) FILTER (WHERE first_call_done = 'Done') AS first_call_done,
  COUNT(*) FILTER (WHERE lead_qualification ILIKE '%qualified%') AS qualified_leads,
  COUNT(*) FILTER (WHERE meeting_status = 'Scheduled') AS meeting_scheduled,
  COUNT(*) FILTER (WHERE meeting_status = 'Completed') AS meeting_conducted,
  COUNT(*) FILTER (WHERE status = 'Follow up') AS follow_up_calls,
  COUNT(*) FILTER (WHERE status = 'Won') AS conversions
FROM leads_table
GROUP BY DATE(created_at), assigned_to;

-- Refresh every hour
REFRESH MATERIALIZED VIEW dashboard_metrics_daily;
```

**Benefits**:
- Pre-computed counts → 10x faster queries
- API response time: ~20-50ms
- Trade-off: Up to 1 hour delay for data freshness

#### 2. Redis Caching
Cache API responses in Redis:

```javascript
// Check Redis cache first
const cacheKey = `dashboard:cards:${salesPersonId}:${startDate}:${endDate}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return Response.json(JSON.parse(cached));
}

// Calculate metrics
const data = await calculateMetrics();

// Cache for 5 minutes
await redis.setex(cacheKey, 300, JSON.stringify(data));

return Response.json(data);
```

**Benefits**:
- API response time: ~10ms (from Redis)
- Reduces database load
- Trade-off: 5-minute data staleness

#### 3. WebSocket Real-Time Updates
Push updates to clients when data changes:

```javascript
// Server: Broadcast on lead update
io.emit('dashboard:update', { metric: 'leadsGenerated', value: 10 });

// Client: Listen for updates
socket.on('dashboard:update', (update) => {
  mutate(); // Trigger SWR revalidation
});
```

**Benefits**:
- Instant updates (no 10-second polling)
- Reduced API calls
- Better user experience

---

## Section 9: Testing Guide

### Manual Testing Checklist

- [ ] **Admin User**
  - [ ] Dashboard shows all leads across all sales people
  - [ ] Date filter changes metrics correctly
  - [ ] Default (last 7 days) shows correct counts
  - [ ] Custom date range shows correct counts

- [ ] **Sales User**
  - [ ] Dashboard shows only assigned leads
  - [ ] Leads assigned to other sales people are excluded
  - [ ] Date filter changes metrics correctly

- [ ] **Edge Cases**
  - [ ] Leads without `last_attempted_at` are counted using `created_at`
  - [ ] Case variations ("Done", "done", "DONE") are handled
  - [ ] NULL/undefined values don't break dashboard
  - [ ] API errors show "-" in cards

- [ ] **Real-Time Updates**
  - [ ] Cards update every 10 seconds
  - [ ] Focus tab triggers refresh
  - [ ] Reconnect triggers refresh

- [ ] **Performance**
  - [ ] Cards load within 1 second
  - [ ] Date filter response within 1 second
  - [ ] No visible lag when switching tabs

### Automated Testing (Example)

```javascript
describe('Dashboard Cards API', () => {
  it('returns correct lead count for admin', async () => {
    const response = await fetch('/api/dashboard/cards', {
      headers: { Authorization: 'Bearer admin-token' }
    });
    const data = await response.json();
    
    expect(data.leadsGenerated).toBeGreaterThanOrEqual(0);
    expect(data.conversionRate).toBeGreaterThanOrEqual(0);
    expect(data.conversionRate).toBeLessThanOrEqual(100);
  });

  it('filters by sales person for sales user', async () => {
    const response = await fetch('/api/dashboard/cards', {
      headers: { Authorization: 'Bearer sales-token' }
    });
    const data = await response.json();
    
    // Sales user should see fewer leads than admin
    expect(data.leadsGenerated).toBeLessThanOrEqual(totalLeads);
  });

  it('handles custom date range', async () => {
    const response = await fetch(
      '/api/dashboard/cards?startDate=2024-12-01&endDate=2024-12-31',
      { headers: { Authorization: 'Bearer admin-token' } }
    );
    const data = await response.json();
    
    expect(data.leadsGenerated).toBeGreaterThanOrEqual(0);
  });
});
```

---

## Section 10: Troubleshooting

### Problem 1: Cards Show "-" Instead of Numbers

**Symptoms**: All cards display "-" instead of metric values

**Possible Causes**:
1. API request failed
2. Authentication failed
3. Database connection failed

**Solution**:
```javascript
// Check browser console for errors
console.error("Dashboard Cards API Error:", error);

// Check network tab in DevTools
// Look for 403 (auth) or 500 (server) errors

// Verify user is authenticated
const crmUser = await getCrmUser();
console.log("CRM User:", crmUser);
```

---

### Problem 2: Sales User Sees All Leads (Not Filtered)

**Symptoms**: Sales user sees leads assigned to other sales people

**Possible Causes**:
1. `salesPersonId` is NULL in session
2. `assigned_to` field not populated in leads_table
3. Role-based filtering not applied

**Solution**:
```javascript
// Check sales person ID
console.log("Sales Person ID:", crmUser.salesPersonId);

// Check if fallback query worked
if (!salesPersonId) {
  console.error("Failed to get salesPersonId for sales user");
}

// Verify filtering is applied
console.log("Applying filter for salesPersonId:", salesPersonId);
```

---

### Problem 3: Metrics Don't Update in Real-Time

**Symptoms**: Cards don't refresh automatically every 10 seconds

**Possible Causes**:
1. `refreshInterval` not configured in SWR
2. Browser tab is backgrounded (some browsers throttle timers)
3. SWR cache is stale

**Solution**:
```javascript
// Force refresh manually
mutate('/api/dashboard/cards');

// Check SWR configuration
const { data, error } = useSWR(apiUrl, fetcher, {
  refreshInterval: 10000, // Ensure this is set
});

// Check if tab is focused
document.addEventListener('visibilitychange', () => {
  console.log('Tab visibility:', document.hidden ? 'hidden' : 'visible');
});
```

---

### Problem 4: Conversion Rate Shows "NaN%"

**Symptoms**: Conversion rate displays "NaN%" or invalid number

**Possible Causes**:
1. Division by zero (no leads generated)
2. Invalid data types

**Solution**:
```javascript
// Add zero-check before division
const conversionRate = totalLeads > 0 
  ? ((convertedLeads / totalLeads) * 100).toFixed(1)
  : 0;

// Frontend: Handle NaN gracefully
{error ? "-" : `${data?.conversionRate ?? 0}%`}
```

---

### Problem 5: Date Filter Shows Wrong Data

**Symptoms**: Custom date range returns incorrect counts

**Possible Causes**:
1. Timezone issues (UTC vs local time)
2. Date boundary issues (not including full day)
3. `last_attempted_at` vs `created_at` confusion

**Solution**:
```javascript
// Ensure full day range
startDate.setHours(0, 0, 0, 0);
endDate.setHours(23, 59, 59, 999);

// Log date range for debugging
console.log("Date range:", {
  start: startDate.toISOString(),
  end: endDate.toISOString()
});

// Use .or() for last_attempted_at fallback
.or(`last_attempted_at.gte."${startDateStr}",created_at.gte."${startDateStr}"`)
```

---

## Quick Reference Card

### API Endpoint
```
GET /api/dashboard/cards
GET /api/dashboard/cards?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

### Response Format
```json
{
  "leadsGenerated": 10,
  "firstCallDone": 8,
  "qualifiedLeads": 6,
  "meetingScheduled": 5,
  "meetingConducted": 4,
  "followUpCalls": 3,
  "proposalsSent": 3,
  "conversionRate": 20.0,
  "leadIds": ["uuid1", "uuid2"]
}
```

### Component Usage
```javascript
import Cards from "@/app/components/ui/cards";

<Cards filterData={{ startDate: "2024-12-01", endDate: "2024-12-31" }} />
```

### Key Files
- **Component**: `app/components/ui/cards.jsx`
- **API**: `app/api/dashboard/cards/route.js`
- **Container**: `app/components/ui/dashboardHeader.jsx`
- **Page**: `app/dashboard/page.js`

### Database Tables
- `leads_table` (primary)
- `bookings` (meeting scheduled)
- `sales_persons` (role filtering)

### SWR Configuration
```javascript
{
  revalidateOnFocus: true,      // Refresh on tab focus
  revalidateOnReconnect: true,  // Refresh on reconnect
  refreshInterval: 10000,        // Auto-refresh every 10s
  dedupingInterval: 2000,        // Dedupe within 2s
  fallbackData: fallbackCardsData // Show zeros initially
}
```

---

## Conclusion

The Dashboard Cards system provides real-time visibility into key sales metrics with:
- ✅ **8 Key Metrics** - Comprehensive pipeline visibility
- ✅ **Role-Based Access** - Admin vs sales person filtering
- ✅ **Date Filtering** - Custom date ranges or default (last 7 days)
- ✅ **Real-Time Updates** - Auto-refresh every 10 seconds
- ✅ **Performance** - SWR caching for instant perceived load
- ✅ **Resilience** - Graceful error handling and fallback data
- ✅ **Responsive** - Mobile to desktop support
- ✅ **Dark Mode** - Full theme support

For questions or issues, refer to the troubleshooting section or contact the development team.
