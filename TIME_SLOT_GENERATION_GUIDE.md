# Time Slot Generation Guide: UTC Working Hours to User Timezones

## Section 1: Conceptual Explanation (Non-Technical)

### The Problem
Imagine you're a sales executive in New York (EST, UTC-5) and you want to book a call with a client in Mumbai (IST, UTC+5:30). Your working hours are stored in the database as UTC times (e.g., 09:00-18:00 UTC), but you need to see available slots in your local time, and the client needs to see them in their local time.

### The Solution
We convert the UTC working hours to each user's local timezone, then split those hours into time slots (e.g., 30-minute intervals). We filter out:
- Time slots that have already passed
- Time slots that are already booked
- Time slots outside working hours

### Key Concepts

**1. UTC (Coordinated Universal Time)**
- UTC is the "master clock" - a single reference point for all times
- All times in the database are stored in UTC to avoid confusion
- Example: "09:00 UTC" means 9 AM in London (GMT)

**2. Timezone Conversion**
- When a user in New York views "09:00 UTC", they see "04:00 EST" (5 hours earlier)
- When a user in Mumbai views "09:00 UTC", they see "14:30 IST" (5.5 hours later)
- The same UTC time appears differently to different users

**3. Slot Generation**
- Working hours: 09:00-18:00 UTC (9 hours)
- Slot duration: 30 minutes
- Result: 18 slots per day (9 hours × 2 slots/hour)

**4. Filtering**
- Past slots: If it's 2 PM in your timezone, don't show 1 PM slots
- Booked slots: If someone already booked 3 PM, don't show 3 PM
- Working hours: Only show slots within 09:00-18:00 UTC (converted to your timezone)

---

## Section 2: Technical Logic Flow

### Inputs

```javascript
{
  // Stored in database (UTC)
  working_start_utc: "09:00",        // HH:mm format in UTC
  working_end_utc: "18:00",          // HH:mm format in UTC
  slot_duration_minutes: 30,         // Duration of each slot
  
  // User context
  user_timezone: "America/New_York", // IANA timezone identifier
  selected_date: "2024-12-20",      // YYYY-MM-DD in user's timezone
  
  // Existing data
  existing_bookings: [...],          // Array of booked slots (UTC)
  buffer_before_minutes: 0,          // Buffer before each booking
  buffer_after_minutes: 0            // Buffer after each booking
}
```

### Processing Steps

#### Step 1: Convert UTC Working Hours to User's Local Date/Time

**Goal**: Convert "09:00 UTC" on "2024-12-20" to the user's local timezone

**Process**:
1. Create a UTC datetime: `2024-12-20T09:00:00Z`
2. Convert to user's timezone using IANA timezone database
3. Result: Local datetime in user's timezone

**Example**:
- UTC: `2024-12-20T09:00:00Z`
- User in EST (UTC-5): `2024-12-20T04:00:00-05:00` (4 AM local)
- User in IST (UTC+5:30): `2024-12-20T14:30:00+05:30` (2:30 PM local)

**Edge Case - Day Rollover**:
- UTC: `2024-12-20T09:00:00Z`
- User in PST (UTC-8): `2024-12-20T01:00:00-08:00` (1 AM local, same day)
- User in JST (UTC+9): `2024-12-20T18:00:00+09:00` (6 PM local, same day)
- User in NZDT (UTC+13): `2024-12-21T22:00:00+13:00` (10 PM next day!)

#### Step 2: Generate Time Slots

**Goal**: Split working hours into slots of `slot_duration_minutes` length

**Process**:
1. Start with `working_start_utc` converted to local time
2. Create first slot: `[start_time, start_time + slot_duration_minutes]`
3. Move to next slot: `start_time += slot_duration_minutes`
4. Repeat until `start_time + slot_duration_minutes > working_end_utc`

**Example** (30-minute slots, 09:00-18:00 UTC for EST user):
- Slot 1: `04:00 - 04:30 EST` (09:00-09:30 UTC)
- Slot 2: `04:30 - 05:00 EST` (09:30-10:00 UTC)
- Slot 3: `05:00 - 05:30 EST` (10:00-10:30 UTC)
- ...
- Slot 18: `11:30 - 12:00 EST` (16:30-17:00 UTC)

#### Step 3: Filter Past Slots

**Goal**: Remove slots that have already passed

**Process**:
1. Get current time in UTC
2. For each slot, compare slot start time (UTC) with current time (UTC)
3. Keep only slots where `slot_start_utc > current_time_utc`

**Example**:
- Current time: `2024-12-20T14:00:00Z` (2 PM UTC)
- Slot: `2024-12-20T13:00:00Z` (1 PM UTC) → **Filter out** (past)
- Slot: `2024-12-20T15:00:00Z` (3 PM UTC) → **Keep** (future)

#### Step 4: Filter Booked Slots

**Goal**: Remove slots that overlap with existing bookings

**Process**:
1. For each slot, check if it overlaps with any booking
2. Overlap check: `slot_start < booking_end && slot_end > booking_start`
3. Also account for buffers: `slot_start < (booking_end + buffer_after) && slot_end > (booking_start - buffer_before)`
4. Remove overlapping slots

**Example**:
- Existing booking: `2024-12-20T10:00:00Z - 2024-12-20T10:30:00Z`
- Slot 1: `2024-12-20T09:30:00Z - 2024-12-20T10:00:00Z` → **Keep** (no overlap)
- Slot 2: `2024-12-20T10:00:00Z - 2024-12-20T10:30:00Z` → **Filter out** (exact overlap)
- Slot 3: `2024-12-20T10:15:00Z - 2024-12-20T10:45:00Z` → **Filter out** (partial overlap)
- Slot 4: `2024-12-20T10:30:00Z - 2024-12-20T11:00:00Z` → **Keep** (no overlap)

#### Step 5: Convert Slots Back to UTC for Storage/API

**Goal**: Store slots in UTC for consistency

**Process**:
1. Each slot is displayed in user's local timezone
2. When user selects a slot, convert selected time back to UTC
3. Store booking in UTC in database

**Example**:
- User selects: `2024-12-20T05:00:00-05:00` (5 AM EST)
- Convert to UTC: `2024-12-20T10:00:00Z` (10 AM UTC)
- Store in database: `start_time: "2024-12-20T10:00:00Z"`

### Outputs

```javascript
[
  {
    start: "2024-12-20T09:00:00Z",  // UTC ISO string
    end: "2024-12-20T09:30:00Z",    // UTC ISO string
    // Displayed to user as: "04:00 - 04:30 EST"
  },
  {
    start: "2024-12-20T09:30:00Z",
    end: "2024-12-20T10:00:00Z",
    // Displayed to user as: "04:30 - 05:00 EST"
  },
  // ... more slots
]
```

---

## Section 3: Pseudocode

```pseudocode
FUNCTION generateTimeSlots(
  working_start_utc: String,      // "09:00"
  working_end_utc: String,         // "18:00"
  slot_duration_minutes: Integer,  // 30
  user_timezone: String,           // "America/New_York"
  selected_date: String,            // "2024-12-20"
  existing_bookings: Array,         // [{start: "2024-12-20T10:00:00Z", end: "..."}]
  buffer_before: Integer,          // 0
  buffer_after: Integer            // 0
) RETURNS Array<Slot>

  // Step 1: Convert UTC working hours to user's local timezone
  utc_start_datetime = CREATE_DATETIME(selected_date, working_start_utc, "UTC")
  utc_end_datetime = CREATE_DATETIME(selected_date, working_end_utc, "UTC")
  
  local_start_datetime = CONVERT_TIMEZONE(utc_start_datetime, user_timezone)
  local_end_datetime = CONVERT_TIMEZONE(utc_end_datetime, user_timezone)
  
  // Handle day rollover: if local date differs from UTC date, adjust
  IF GET_DATE(local_start_datetime) != selected_date THEN
    local_start_datetime = ADJUST_TO_DATE(local_start_datetime, selected_date)
  END IF
  
  IF GET_DATE(local_end_datetime) != selected_date THEN
    local_end_datetime = ADJUST_TO_DATE(local_end_datetime, selected_date)
  END IF
  
  // Step 2: Generate slots
  slots = []
  current_slot_start = local_start_datetime
  
  WHILE current_slot_start < local_end_datetime DO
    current_slot_end = ADD_MINUTES(current_slot_start, slot_duration_minutes)
    
    // Skip if slot extends beyond working hours
    IF current_slot_end > local_end_datetime THEN
      BREAK
    END IF
    
    // Convert slot back to UTC for comparison
    slot_start_utc = CONVERT_TO_UTC(current_slot_start, user_timezone)
    slot_end_utc = CONVERT_TO_UTC(current_slot_end, user_timezone)
    
    // Step 3: Filter past slots
    current_time_utc = GET_CURRENT_TIME_UTC()
    IF slot_start_utc <= current_time_utc THEN
      current_slot_start = current_slot_end
      CONTINUE  // Skip this slot
    END IF
    
    // Step 4: Filter booked slots
    is_blocked = FALSE
    FOR EACH booking IN existing_bookings DO
      booking_start = PARSE_ISO(booking.start_time)
      booking_end = PARSE_ISO(booking.end_time)
      
      // Apply buffers
      blocked_start = SUBTRACT_MINUTES(booking_start, buffer_before)
      blocked_end = ADD_MINUTES(booking_end, buffer_after)
      
      // Check overlap
      IF slot_start_utc < blocked_end AND slot_end_utc > blocked_start THEN
        is_blocked = TRUE
        BREAK
      END IF
    END FOR
    
    // Add slot if not blocked
    IF NOT is_blocked THEN
      slots.APPEND({
        start: slot_start_utc.toISOString(),
        end: slot_end_utc.toISOString()
      })
    END IF
    
    current_slot_start = current_slot_end
  END WHILE
  
  RETURN slots
END FUNCTION
```

---

## Section 4: Example with Real Times

### Scenario
- **Sales Rep**: Located in **UTC** (London, GMT+0)
- **Client**: Located in **IST** (Mumbai, UTC+5:30)
- **Working Hours**: `09:00 UTC - 18:00 UTC`
- **Slot Duration**: `30 minutes`
- **Selected Date**: `2024-12-20`
- **Current Time**: `2024-12-20T14:00:00Z` (2 PM UTC)

### Step-by-Step Calculation

#### For Sales Rep (UTC timezone)

**Step 1: Convert UTC to Local Time**
- `09:00 UTC` → `09:00 UTC` (same, no conversion needed)
- `18:00 UTC` → `18:00 UTC` (same)

**Step 2: Generate Slots**
```
Slot 1:  09:00 UTC - 09:30 UTC
Slot 2:  09:30 UTC - 10:00 UTC
Slot 3:  10:00 UTC - 10:30 UTC
...
Slot 18: 17:30 UTC - 18:00 UTC
```

**Step 3: Filter Past Slots**
- Current time: `14:00 UTC`
- Slots 1-10 (09:00-14:00 UTC): **Filtered out** (past)
- Slots 11-18 (14:00-18:00 UTC): **Kept** (future)

**Step 4: Filter Booked Slots**
- Assume slot 12 (14:30-15:00 UTC) is booked
- Remaining slots: 11, 13, 14, 15, 16, 17, 18

**Result for Sales Rep**:
```
Available slots (displayed as UTC):
- 14:00 - 14:30 UTC
- 15:00 - 15:30 UTC
- 15:30 - 16:00 UTC
- 16:00 - 16:30 UTC
- 16:30 - 17:00 UTC
- 17:00 - 17:30 UTC
- 17:30 - 18:00 UTC
```

#### For Client (IST timezone)

**Step 1: Convert UTC to Local Time**
- `09:00 UTC` → `14:30 IST` (09:00 + 5:30 = 14:30)
- `18:00 UTC` → `23:30 IST` (18:00 + 5:30 = 23:30)

**Step 2: Generate Slots**
```
Slot 1:  14:30 IST - 15:00 IST  (09:00-09:30 UTC)
Slot 2:  15:00 IST - 15:30 IST  (09:30-10:00 UTC)
Slot 3:  15:30 IST - 16:00 IST  (10:00-10:30 UTC)
...
Slot 18: 23:00 IST - 23:30 IST  (17:30-18:00 UTC)
```

**Step 3: Filter Past Slots**
- Current time: `14:00 UTC` = `19:30 IST`
- Slots 1-11 (14:30-19:30 IST): **Filtered out** (past)
- Slots 12-18 (19:30-23:30 IST): **Kept** (future)

**Step 4: Filter Booked Slots**
- Same booking: `14:30-15:00 UTC` = `20:00-20:30 IST`
- Slot 12 (19:30-20:00 IST): **Kept** (no overlap)
- Slot 13 (20:00-20:30 IST): **Filtered out** (exact overlap)
- Slot 14 (20:30-21:00 IST): **Kept** (no overlap)

**Result for Client**:
```
Available slots (displayed as IST):
- 19:30 - 20:00 IST
- 20:30 - 21:00 IST
- 21:00 - 21:30 IST
- 21:30 - 22:00 IST
- 22:00 - 22:30 IST
- 22:30 - 23:00 IST
- 23:00 - 23:30 IST
```

### Key Observation
Both users see the **same available slots** (in terms of UTC times), but displayed in their respective local times:
- Sales Rep: `14:00-14:30 UTC`
- Client: `19:30-20:00 IST` (same slot, different display)

---

## Section 5: Edge Cases & Best Practices

### Edge Case 1: Day Rollover Due to Timezone Conversion

**Problem**: UTC working hours might fall on a different calendar day in user's timezone.

**Example**:
- Working hours: `22:00 UTC - 06:00 UTC` (next day)
- User in PST (UTC-8): `14:00 PST - 22:00 PST` (same day)
- User in JST (UTC+9): `07:00 JST - 15:00 JST` (next day)

**Solution**:
```javascript
// When converting UTC to local time, check if date changed
const localStart = convertToLocal(utcStart, userTimezone);
const localEnd = convertToLocal(utcEnd, userTimezone);

// If working hours span midnight UTC, they might span multiple days locally
// Generate slots for each day separately
if (getDate(localStart) !== getDate(localEnd)) {
  // Split into two windows: same-day and next-day
  generateSlotsForDay(getDate(localStart), localStart, endOfDay(localStart));
  generateSlotsForDay(getDate(localEnd), startOfDay(localEnd), localEnd);
}
```

**Best Practice**: Always generate slots per calendar day in the user's timezone, not UTC.

### Edge Case 2: Daylight Saving Time (DST)

**Problem**: Timezone offsets change during DST transitions (e.g., EST → EDT).

**Example**:
- March 10, 2024: EST (UTC-5) → EDT (UTC-4) transition
- `09:00 UTC` on March 9: `04:00 EST`
- `09:00 UTC` on March 10: `05:00 EDT` (1 hour difference!)

**Solution**:
```javascript
// Use IANA timezone database (handles DST automatically)
const formatter = new Intl.DateTimeFormat('en', {
  timeZone: 'America/New_York',  // Automatically handles EST/EDT
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

// Never manually calculate offsets - always use timezone libraries
// Libraries like date-fns-tz, moment-timezone, or Intl API handle DST correctly
```

**Best Practice**: 
- Always use IANA timezone identifiers (`America/New_York`, not `EST` or `UTC-5`)
- Use timezone-aware libraries (date-fns-tz, moment-timezone, or native Intl API)
- Never hardcode offsets

### Edge Case 3: Same-Day vs Next-Day Bookings

**Problem**: A slot might be "today" in one timezone but "tomorrow" in another.

**Example**:
- Current time: `2024-12-20T23:00:00Z` (11 PM UTC)
- Slot: `2024-12-21T01:00:00Z` (1 AM UTC next day)
- User in EST: Current = `2024-12-20T18:00:00-05:00` (6 PM), Slot = `2024-12-20T20:00:00-05:00` (8 PM same day)
- User in JST: Current = `2024-12-21T08:00:00+09:00` (8 AM), Slot = `2024-12-21T10:00:00+09:00` (10 AM same day)

**Solution**:
```javascript
// Always compare times in UTC for "past" filtering
const currentTimeUtc = new Date().toISOString();
const slotStartUtc = slot.start; // Already in UTC

if (slotStartUtc <= currentTimeUtc) {
  // Filter out - slot is in the past
  return false;
}

// But display dates in user's local timezone
const slotDateLocal = formatInTimezone(slotStartUtc, userTimezone, 'yyyy-MM-dd');
const selectedDateLocal = selectedDate; // Already in user's timezone

if (slotDateLocal === selectedDateLocal) {
  // Show this slot
}
```

**Best Practice**: 
- Filter "past" slots using UTC comparison
- Display dates using user's local timezone
- Group slots by local date for UI display

### Edge Case 4: Partial Slot Overlap with Buffers

**Problem**: A slot might partially overlap with a booking's buffer zone.

**Example**:
- Booking: `10:00-10:30 UTC`
- Buffer: `15 minutes before/after`
- Blocked zone: `09:45-10:45 UTC`
- Slot 1: `09:30-10:00 UTC` → **Blocked** (overlaps buffer)
- Slot 2: `10:00-10:30 UTC` → **Blocked** (exact overlap)
- Slot 3: `10:30-11:00 UTC` → **Blocked** (overlaps buffer)
- Slot 4: `11:00-11:30 UTC` → **Available** (no overlap)

**Solution**:
```javascript
function isSlotBlocked(slotStart, slotEnd, booking, bufferBefore, bufferAfter) {
  const blockedStart = subtractMinutes(booking.start, bufferBefore);
  const blockedEnd = addMinutes(booking.end, bufferAfter);
  
  // Overlap check: slot overlaps if slotStart < blockedEnd AND slotEnd > blockedStart
  return slotStart < blockedEnd && slotEnd > blockedStart;
}
```

**Best Practice**: Always apply buffers when checking for conflicts, not just exact overlaps.

### Edge Case 5: Working Hours That Span Midnight

**Problem**: Working hours might be `22:00 UTC - 06:00 UTC` (next day).

**Example**:
- Working hours: `22:00 UTC - 06:00 UTC` (8 hours, spans midnight)
- This represents night shift or global team coverage

**Solution**:
```javascript
// Handle midnight crossover
if (workingStartUtc > workingEndUtc) {
  // Working hours span midnight
  // Generate slots for:
  // 1. From start to end of day
  slots1 = generateSlots(workingStartUtc, "23:59:59", slotDuration);
  // 2. From start of next day to end
  slots2 = generateSlots("00:00:00", workingEndUtc, slotDuration);
  return [...slots1, ...slots2];
}
```

**Best Practice**: Check if `start > end` to detect midnight crossover, then split into two windows.

### Edge Case 6: Very Short Working Windows

**Problem**: Working hours might be shorter than slot duration.

**Example**:
- Working hours: `09:00-09:15 UTC` (15 minutes)
- Slot duration: `30 minutes`
- Result: No slots can be generated

**Solution**:
```javascript
const workingDurationMinutes = (workingEnd - workingStart) / (1000 * 60);
if (workingDurationMinutes < slotDurationMinutes) {
  return []; // No slots possible
}
```

**Best Practice**: Validate that working hours are at least as long as slot duration.

### Best Practices Summary

1. **Always Store Times in UTC**
   - Database: Store all timestamps as UTC ISO strings
   - API: Accept and return UTC ISO strings
   - Frontend: Convert to local timezone only for display

2. **Use IANA Timezone Identifiers**
   - ✅ `America/New_York` (handles DST automatically)
   - ❌ `EST` or `UTC-5` (doesn't handle DST)

3. **Use Timezone-Aware Libraries**
   - ✅ `date-fns-tz`, `moment-timezone`, or native `Intl` API
   - ❌ Manual offset calculations

4. **Compare Times in UTC**
   - Past/future checks: Use UTC
   - Overlap checks: Use UTC
   - Display: Use local timezone

5. **Handle Edge Cases Explicitly**
   - Day rollover
   - DST transitions
   - Midnight crossover
   - Short working windows

6. **Test Across Multiple Timezones**
   - Test with UTC, EST, PST, IST, JST, etc.
   - Test during DST transitions
   - Test with edge cases (midnight, day boundaries)

7. **Log Timezone Conversions**
   - Log UTC times and local times for debugging
   - Include timezone identifiers in logs
   - Track DST transitions

---

## Implementation Checklist

- [ ] Convert UTC working hours to user's local timezone
- [ ] Handle day rollover when converting timezones
- [ ] Generate slots based on `slot_duration_minutes`
- [ ] Filter out past slots (compare in UTC)
- [ ] Filter out booked slots (check overlaps with buffers)
- [ ] Handle DST transitions correctly
- [ ] Handle midnight crossover in working hours
- [ ] Validate working hours >= slot duration
- [ ] Return slots as UTC ISO strings
- [ ] Display slots in user's local timezone
- [ ] Group slots by local date for UI
- [ ] Test with multiple timezones
- [ ] Test during DST transitions
- [ ] Log timezone conversions for debugging

---

## Quick Reference: Common Timezone Conversions

| UTC Time | EST (UTC-5) | PST (UTC-8) | IST (UTC+5:30) | JST (UTC+9) |
|----------|-------------|-------------|----------------|-------------|
| 00:00    | 19:00 (prev) | 16:00 (prev) | 05:30          | 09:00       |
| 09:00    | 04:00       | 01:00       | 14:30          | 18:00       |
| 12:00    | 07:00       | 04:00       | 17:30          | 21:00       |
| 18:00    | 13:00       | 10:00       | 23:30          | 03:00 (next) |
| 23:00    | 18:00       | 15:00       | 04:30 (next)   | 08:00 (next) |

**Note**: DST affects EST/PST (becomes EDT/PDT, UTC-4/UTC-7), so offsets change seasonally.
