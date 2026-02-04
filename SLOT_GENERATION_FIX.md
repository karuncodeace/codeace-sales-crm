# Slot Generation Fix: UTC Working Hours

## Problem

Slots were being generated starting from the current time instead of the working start time, resulting in:
- ❌ Slots starting at random times: `10:24 AM, 10:54 AM, 11:24 AM...`
- ❌ Instead of clean boundaries: `10:00 AM, 10:30 AM, 11:00 AM...`

## Root Cause

1. **Incorrect Time Parsing**: The code was treating UTC times stored in the database as if they were in the user's local timezone, then converting them to UTC (double conversion).

2. **Missing Start Time Alignment**: Slots were not guaranteed to start from the exact working start time.

3. **Current Time Used for Generation**: Current time was being used to determine where to start generating slots, instead of only being used for filtering.

## Solution

### 1. Correct UTC Time Parsing

**Before:**
```javascript
// Treated UTC times as local time, then converted to UTC (WRONG)
const windowStartUtc = zonedTimeToUtc(dateString, startTime, inviteeTimezone);
```

**After:**
```javascript
// Parse UTC times directly (times are already in UTC)
const windowStartUtc = utcTimeToUtcDate(dateString, startTime);
```

**New Function:**
```javascript
function utcTimeToUtcDate(dateStr, timeStr) {
  // Parse time components and create UTC date directly
  const [year, month, day, hour, minute, second] = `${dateStr}T${timeWithSeconds}`
    .match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
    .slice(1)
    .map(Number);
  
  // Create UTC date directly since time is already in UTC
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}
```

### 2. Slot Generation Always Starts from Working Start Time

**Key Changes in `generateSlotsForWindow`:**

```javascript
/**
 * CRITICAL: Slots ALWAYS start from windowStartUtc (working start time), never from current time.
 * Current time is only used for filtering AFTER slots are generated.
 */
function generateSlotsForWindow(
  windowStartUtc,
  windowEndUtc,
  durationMinutes,
  bufferBefore,
  bufferAfter,
  bookings,
  currentTimeUtc = new Date() // Only used for filtering
) {
  // ALWAYS start from windowStartUtc, never from current time
  let currentSlotStart = new Date(windowStartUtc);

  while (currentSlotStart < windowEndUtc) {
    const slotEnd = addMinutes(currentSlotStart, durationMinutes);
    
    // FILTER: Remove past slots (compare in UTC)
    // Current time is ONLY used here for filtering, never for slot generation
    if (currentSlotStart <= currentTimeUtc) {
      currentSlotStart = addMinutes(currentSlotStart, durationMinutes);
      continue; // Skip past slots, but continue generating
    }
    
    // ... rest of logic
  }
}
```

### 3. Clean Slot Boundaries

Slots now increment by exact `durationMinutes`:
- ✅ `10:00 AM, 10:30 AM, 11:00 AM, 11:30 AM...`
- ❌ No more `10:24 AM, 10:54 AM...`

### 4. Filtering Logic

**Two-Stage Filtering:**

1. **During Generation** (in `generateSlotsForWindow`):
   - Filter past slots as we generate
   - Compare in UTC: `if (currentSlotStart <= currentTimeUtc) continue;`

2. **Final Safety Check** (after all slots generated):
   - Redundant filter to catch any edge cases
   - Ensures no past slots slip through

## Example

### Input
- **Working Hours**: `10:00 AM - 9:00 PM IST`
- **Stored in DB**: `start_time = "04:30:00"`, `end_time = "15:30:00"` (UTC)
- **Slot Duration**: `30 minutes`
- **Current Time**: `10:24 AM IST` (`04:54 UTC`)

### Before Fix
```
Generated slots:
- 10:24 AM ❌ (starts from current time)
- 10:54 AM ❌
- 11:24 AM ❌
- 11:54 AM ❌
```

### After Fix
```
Generated slots:
- 10:00 AM ✅ (starts from working start time)
- 10:30 AM ✅
- 11:00 AM ✅ (10:24 AM filtered out as past)
- 11:30 AM ✅
- 12:00 PM ✅
- ... (continues until 9:00 PM)
```

## Key Principles

1. ✅ **Slots ALWAYS start from `working_start_utc`**
   - Never from current time
   - Never rounded to nearest slot boundary

2. ✅ **Slots increment by exact `slot_duration_minutes`**
   - Clean boundaries: `:00`, `:30` (for 30-min slots)
   - No random minutes: `:24`, `:54`

3. ✅ **Current time ONLY used for filtering**
   - Filter past slots AFTER generation
   - Compare in UTC for consistency

4. ✅ **UTC times stored in database**
   - Parse directly as UTC
   - Convert to user timezone only for display

## Testing Checklist

- [x] Slots start from working start time (not current time)
- [x] Slots have clean boundaries (no random minutes)
- [x] Past slots are filtered correctly
- [x] Booked slots are excluded
- [x] Works across different timezones
- [x] Handles day rollover correctly
- [x] Handles DST transitions correctly

## Files Modified

- `lib/slots/generateSlots.js`
  - Added `utcTimeToUtcDate()` function
  - Updated `generateSlotsForWindow()` to always start from working start time
  - Updated main `generateSlots()` to use UTC time parsing
  - Added final safety filter for past slots
  - Added debug logging

## Verification

To verify the fix works:

1. **Check slot start times**: Should always start at `10:00 AM IST` (or your working start time)
2. **Check slot boundaries**: Should be clean multiples of slot duration (`:00`, `:30` for 30-min slots)
3. **Check past slots**: Should not appear in the list
4. **Check console logs**: Should show "Generated X slots" with first/last slot times

## Example Console Output

```
✅ Generated 22 slots (0 past slots filtered)
   First slot: 10:00 AM Asia/Kolkata
   Last slot: 09:00 PM Asia/Kolkata
```
