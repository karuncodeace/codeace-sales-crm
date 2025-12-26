# Revenue & Sales Performance Dashboard

## Overview
Admin-only dashboard for setting targets and viewing sales performance analytics with period-based insights.

## Features

### 🔐 Access Control
- **Admin Only**: Page is restricted to admin users
- **Auto-redirect**: Non-admin users are automatically redirected to dashboard
- **Server-side validation**: API routes verify admin role before processing requests

### 📊 Components

#### 1. Target Setup Panel
- **Collapsible card** for setting period-based targets
- **Period Selection**: Weekly / Monthly / Quarterly
- **Funnel Targets**: Leads, Calls, Meetings, Prospects, Proposals, Converted
- **Revenue Target**: Monthly revenue target in ₹
- **Validation**: Prevents negative values
- **Auto-save**: Saves targets to database with success/error feedback

#### 2. KPI Summary Cards
- **Revenue KPIs**:
  - Total Revenue (Actual)
  - Revenue Target
  - Achievement Percentage
  - Remaining Amount
- **Funnel KPIs**:
  - Leads (Actual / Target)
  - Calls (Actual / Target)
  - Meetings (Actual / Target)
  - Prospects (Actual / Target)
  - Proposals (Actual / Target)
  - Converted (Actual / Target)
- **Color Coding**:
  - 🟢 Green: ≥ 100% achievement
  - 🟠 Orange: 70-99% achievement
  - 🔴 Red: < 70% achievement

#### 3. Charts Section
Three interactive charts using ApexCharts:
1. **Revenue vs Target**: Bar chart comparing actual vs target revenue
2. **Funnel Performance**: Bar chart showing actual vs target for all funnel stages
3. **Achievement Percentage**: Color-coded bar chart showing achievement % for all metrics

## Setup Instructions

### 1. Database Setup
Run the SQL script to create the `revenue_targets` table:

```bash
# Execute in Supabase SQL Editor
scripts/create-revenue-targets-table.sql
```

### 2. API Routes
- `/api/revenue/targets` - GET/POST for managing targets
- `/api/revenue/kpis` - GET for fetching KPI data

### 3. Access
Navigate to `/revenue` in the application. Only admin users can access this page.

## Data Calculation

### Actual Values
- **Leads**: Count of leads created in period
- **Calls**: Count of leads with `first_call_done = true` in period
- **Meetings**: Count of appointments created in period
- **Prospects**: Count of leads with `status = "Qualified"` in period
- **Proposals**: Count of leads with `status = "Proposal"` in period
- **Converted**: Count of leads with `total_score > 20` or `status = "Converted"` in period
- **Revenue**: Currently calculated as `converted * 50000` (₹50k per conversion)
  - **Note**: Update this calculation in `/api/revenue/kpis/route.js` if you have a revenue field in your leads table

### Period Calculation
- **Weekly**: Last 7 days from current date
- **Monthly**: Full month (1st to last day)
- **Quarterly**: Full quarter (3 months)

## File Structure

```
app/revenue/
├── page.js                          # Main revenue page with admin check
├── components/
│   ├── TargetSetupPanel.jsx         # Target input panel
│   ├── RevenueKPICards.jsx         # KPI cards component
│   └── RevenueCharts.jsx           # Charts component
└── README.md                        # This file

app/api/revenue/
├── targets/
│   └── route.js                     # GET/POST targets API
└── kpis/
    └── route.js                     # GET KPIs API

scripts/
└── create-revenue-targets-table.sql # Database migration
```

## Customization

### Revenue Calculation
To use actual revenue from your database, update the revenue calculation in `/api/revenue/kpis/route.js`:

```javascript
// Replace this line:
const actualRevenue = actualConverted * 50000;

// With your actual revenue query:
const { data: revenueData } = await supabase
  .from("your_revenue_table")
  .select("amount")
  .gte("date", startDateStr)
  .lte("date", endDateStr);
const actualRevenue = revenueData?.reduce((sum, r) => sum + r.amount, 0) || 0;
```

### Adding More Metrics
1. Add target field to `revenue_targets` table
2. Update API routes to include new metric
3. Add KPI card in `RevenueKPICards.jsx`
4. Update charts if needed

## Notes

- The dashboard uses SWR for data fetching with 30-second refresh intervals
- All API routes verify admin role server-side
- Targets are stored per period with unique `period_id`
- The UI supports both dark and light themes

