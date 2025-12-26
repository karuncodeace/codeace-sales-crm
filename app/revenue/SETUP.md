# Sales Targets & Revenue Transactions Setup Guide

## Overview
This guide covers the setup and usage of the sales targets, revenue transactions, and daily metrics tracking system.

## Database Setup

### Step 1: Create Tables
Run the SQL script to create all required tables:

```sql
-- Execute in Supabase SQL Editor
scripts/create-sales-tables.sql
```

This creates:
- `sales_targets` - Stores period-based sales targets (Admin only)
- `revenue_transactions` - Records revenue transactions (Admin only)
- `sales_metrics_daily` - System-generated daily metrics (Read-only)

### Step 2: Create Functions
Run the SQL script to set up the metrics update function:

```sql
-- Execute in Supabase SQL Editor
scripts/create-sales-metrics-functions.sql
```

This creates:
- `upsert_daily_metrics()` function for manually updating daily metrics

**Note:** Automatic triggers have been removed. `sales_metrics_daily` must be updated manually via:
- Scheduled background jobs
- API calls using the `upsert_daily_metrics()` function
- Manual data entry

## API Endpoints

### 1. Sales Targets

#### POST `/api/admin/sales-targets`
Create or update sales targets (Admin only)

**Request Body:**
```json
{
  "period_type": "monthly",
  "period_start": "2025-07-01",
  "period_end": "2025-07-31",
  "targets": {
    "leads": 500,
    "calls": 350,
    "meetings": 200,
    "prospects": 120,
    "proposals": 80,
    "converted": 40
  },
  "target_revenue": 1000000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sales target saved successfully",
  "data": { ... }
}
```

#### GET `/api/admin/sales-targets`
Fetch sales targets (Admin only)

**Query Parameters:**
- `period_type` (optional) - Filter by period type
- `period_start` (optional) - Filter by period start date

### 2. Revenue Transactions

#### POST `/api/admin/revenue`
Create revenue transaction (Admin only)

**Request Body:**
```json
{
  "lead_id": "uuid",
  "sales_person_id": "SP-03",
  "amount": 45000,
  "status": "closed",
  "closed_date": "2025-07-15"
}
```

**Validation Rules:**
- `amount` must be > 0
- `status` must be one of: "pending", "closed", "cancelled"
- If `status` is "closed", `closed_date` is required
- `lead_id` must be a valid UUID

**Response:**
```json
{
  "success": true,
  "message": "Revenue transaction created successfully",
  "data": { ... }
}
```

#### GET `/api/admin/revenue`
Fetch revenue transactions (Admin only)

**Query Parameters:**
- `lead_id` (optional) - Filter by lead ID
- `sales_person_id` (optional) - Filter by sales person
- `status` (optional) - Filter by status
- `start_date` (optional) - Filter by closed date (from)
- `end_date` (optional) - Filter by closed date (to)

## Frontend Components

### SalesTargetForm
Component for creating/updating sales targets.

**Usage:**
```jsx
import SalesTargetForm from "./components/SalesTargetForm";

<SalesTargetForm
  onSuccess={(data) => {
    console.log("Target saved:", data);
    // Refresh data, close modal, etc.
  }}
  onCancel={() => {
    // Close modal, reset form, etc.
  }}
/>
```

### RevenueTransactionForm
Component for creating revenue transactions.

**Usage:**
```jsx
import RevenueTransactionForm from "./components/RevenueTransactionForm";

<RevenueTransactionForm
  leadId="optional-lead-id"
  onSuccess={(data) => {
    console.log("Transaction created:", data);
    // Refresh data, close modal, etc.
  }}
  onCancel={() => {
    // Close modal, reset form, etc.
  }}
/>
```

## Security

### Access Control
- All API routes verify admin role server-side
- Uses Supabase Service Role for writes (bypasses RLS)
- RLS policies provide additional security layer
- Client-side forms are for UX only; server validates all inputs

### Validation
- Numeric fields validated (no negative values)
- Date formats validated
- Required fields enforced
- Foreign key constraints enforced
- Business rules enforced (e.g., closed_date required when status is closed)

## Data Flow

### Sales Targets
1. Admin fills form → Frontend validates
2. POST to `/api/admin/sales-targets`
3. Server validates admin role
4. Server validates input data
5. Upsert to `sales_targets` table using service role
6. Return success/error response

### Revenue Transactions
1. Admin fills form → Frontend validates
2. POST to `/api/admin/revenue`
3. Server validates admin role
4. Server validates input data
5. Insert to `revenue_transactions` table using service role
6. If status is "closed", trigger daily metrics update
7. Return success/error response

### Daily Metrics (Manual)
1. Metrics must be updated manually via:
   - Scheduled background jobs that aggregate data
   - API calls to update specific metrics
   - Manual data entry through admin interface
2. Use the `upsert_daily_metrics()` function or direct API calls
3. Metrics are aggregated from source tables (leads_table, appointments, etc.)

## Integration with Revenue Dashboard

The revenue dashboard can now read from:
- `sales_targets` - For target values
- `sales_metrics_daily` - For actual daily metrics
- `revenue_transactions` - For revenue data

Update the `/api/revenue/kpis` route to aggregate from `sales_metrics_daily` instead of querying individual tables.

## Troubleshooting

### Metrics Not Updating
1. Check that triggers are created: `scripts/create-sales-metrics-functions.sql`
2. Verify `upsert_daily_metrics()` function exists
3. Check trigger logs in Supabase dashboard

### Permission Errors
1. Verify user role is "admin" in `users` table
2. Check RLS policies are enabled
3. Verify API is using service role for writes

### Validation Errors
1. Check request payload matches expected format
2. Verify all required fields are present
3. Check numeric values are positive
4. Verify date formats are YYYY-MM-DD

## Next Steps

1. Update revenue dashboard to use new tables
2. Add charts/graphs showing trends over time
3. Add export functionality for reports
4. Add bulk import for historical data
5. Add notifications when targets are exceeded

