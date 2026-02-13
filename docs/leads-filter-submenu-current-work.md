# Leads submenu — Filter (Current work)

## Summary
- Implementing and refining the filter UI and behavior in the Leads submenu.

## Goal
- Provide users with an inline submenu filter for Leads that supports: search by name/email, status (open/contacted/converted), owner, tag, and date range. Filters should be reflected in the URL/query params and work with server-side and client-side lists.

## Current status
- UI skeleton created for submenu filter (work in progress).
- Filtering logic: planned to use centralized state (React context or query params) so other components (lists, counts) respond.
- Backend endpoint support required for server-side filtering (API query parameters).

## Files to update / inspect
- Frontend:
  - `app/components/leads/LeadsSubmenu.jsx` (submenu filter UI)
  - `app/components/leads/LeadsFilterPanel.jsx` (filter controls)
  - `app/components/tables/UpcomingMeetingsTable.jsx` (reference for data-fetching patterns)
  - `app/hooks/useLeadsFilter.js` (shared hook to sync URL <> state)
- Backend:
  - `pages/api/leads` or `app/api/leads/route.js` (support query params: q, status, owner, tag, from, to, page, per_page)

## Implementation notes
- Use URL query params (e.g., ?q=Acme&status=open&owner=123) so filters are bookmarkable and shareable.
- Debounce text search (250ms) before applying to reduce requests.
- Sync state with router.replace to avoid history spam.
- For tag/owner, use multi-select (store as comma-separated list in query).
- Date range use ISO strings (YYYY-MM-DD).

## Status filter behavior
- The status filter must operate on the `status` column in the `leads_table`.
- Filter options and their exact status values:
  - All -> show all leads
  - New -> status "New"
  - Responded -> status "Responded"
  - Not Responded -> status "Not Responded"
  - Demo Scheduled -> status "Demo Scheduled"
  - Demo Completed -> status "Demo Completed"
  - SRS -> status "SRS"
  - Converted -> status "Converted"
  - Lost Lead -> status "Lost Lead"
  - Junk Lead -> status "Junk Lead"

- Normalization rules:
  - Convert both the lead's `status` value and the selected filter value to lowercase and trim whitespace before comparing.
  - This handles inconsistent casing (e.g., "New", "new") and stray spaces (e.g., "Demo Completed ").
  - "All" should bypass comparisons and return all rows.

- Example client-side matcher:

```javascript
// Returns true if the lead matches the selected status filter.
function matchesStatusFilter(lead, filterValue) {
  if (!filterValue || filterValue === "All") return true;
  const leadStatus = (lead.status || "").toLowerCase().trim();
  const target = filterValue.toLowerCase().trim();
  return leadStatus === target;
}
```

- Backend / API note:
  - When making server-side filter queries, send the normalized lowercase `status` value and have the API perform a case-insensitive comparison (or normalize on the DB side) to ensure consistent results.

## TODO
1. Create `LeadsFilterPanel.jsx` with controls (search, status select, owner select, tags multiselect, date range). [in_progress]
2. Implement `useLeadsFilter` hook to read/write query params and provide typed filter object. [pending]
3. Wire hook into Leads list component and ensure API accepts filter params. [pending]
4. Add unit tests for hook and integration test for URL-sync behavior. [pending]
5. Update API to support combined filters and pagination. [pending]

## Testing / QA
- Manual:
  1. Open Leads page, toggle filters, verify list updates.
  2. Change filters and refresh — state should persist via URL.
  3. Share URL with filters — open in new tab, ensure same results.
  4. Test edge cases: invalid dates, empty owner/tag, long queries.
- Automated:
  - Unit tests for parsing/serializing query params.
  - Integration tests for Leads list with mocked API.

## Notes / Assumptions
- Using Next.js router (client-side) for URL updates.
- Backend will accept query params and return filtered results; if not, implement client-side filtering as fallback.
- Accessibility: ensure filter controls are keyboard accessible and labeled.

If you want, I can: (a) create the `LeadsFilterPanel.jsx` scaffold, (b) implement `useLeadsFilter` hook, or (c) update the API endpoint — tell me which to start with.

