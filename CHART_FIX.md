# Chart Rendering Fix

## Issue
Charts were not rendering even when the backend returned `intent: "analytics_visual"` responses.

## Root Cause
The proxy route (`app/api/ai-insights/route.js`) was only passing through `answer`, `intent`, and `source` fields. It was **not forwarding the chart data fields** (`chart_type`, `title`, `x_axis`, `y_axis`, `data`) that are required for chart rendering.

## Fix Applied

### 1. Updated Proxy Route (`app/api/ai-insights/route.js`)
**Before:**
```javascript
return Response.json({
  answer: data.answer || data.response || data.message,
  intent: data.intent,
  source: "ai_insights"
});
```

**After:**
```javascript
const response = {
  answer: data.answer || data.response || data.message,
  intent: data.intent,
  source: "ai_insights"
};

// If this is an analytics visualization response, include all chart data
if (data.intent === "analytics_visual") {
  response.chart_type = data.chart_type;
  response.title = data.title;
  response.x_axis = data.x_axis;
  response.y_axis = data.y_axis;
  response.data = data.data;
}

return Response.json(response);
```

### 2. Enhanced Debug Logging (`app/components/ui/ChatBot.jsx`)
Added comprehensive logging to track:
- Chart data in API response
- Chart data preparation
- Bot message creation with chart data

## How to Test

1. **Ensure Flask backend is running** on `http://localhost:5001`
2. **Ask an analytics question** that should trigger a chart:
   - "Show me sales trends over time"
   - "Compare leads by status"
   - "What's the distribution of leads by source?"
3. **Check browser console** for debug logs:
   - `API Response:` - Should show `intent: "analytics_visual"` and chart fields
   - `Chart data prepared:` - Should show all chart configuration
   - `Bot message created:` - Should show `hasChartData: true`
4. **Verify chart renders** in the chat UI

## Expected Backend Response Format

For charts to render, Flask backend must return:
```json
{
  "intent": "analytics_visual",
  "chart_type": "line" | "bar" | "pie",
  "title": "Chart Title",
  "x_axis": "labelKey",
  "y_axis": "valueKey",
  "data": [
    { "labelKey": "A", "valueKey": 10 },
    { "labelKey": "B", "valueKey": 20 }
  ],
  "answer": "Optional text explanation"
}
```

## Debugging Steps

If charts still don't render:

1. **Open browser console** (F12)
2. **Send an analytics question**
3. **Check console logs:**
   - Does `API Response` show `intent: "analytics_visual"`?
   - Does `Chart data prepared` show all fields?
   - Does `Bot message created` show `hasChartData: true`?
4. **Check Network tab:**
   - Verify `/api/ai-insights` response includes all chart fields
5. **Verify Recharts is installed:**
   ```bash
   npm list recharts
   ```
   If not installed:
   ```bash
   npm install recharts
   ```

## Files Modified

- ✅ `app/api/ai-insights/route.js` - Now passes through all chart data fields
- ✅ `app/components/ui/ChatBot.jsx` - Enhanced debug logging

## Status

✅ **Fixed** - Charts should now render when backend returns `analytics_visual` intent with chart data.
