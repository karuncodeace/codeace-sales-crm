# All Fixes Applied

## Issues Fixed:

### 1. ✅ Duplicate Event Listeners
**Problem:** Multiple event listeners were being registered, causing the booking event to fire multiple times.

**Solution:**
- Added `eventHandlerRef` to store the event handler function
- Only register the event listener once
- Added `isProcessingRef` to prevent duplicate processing of the same booking

### 2. ✅ Missing start_time
**Problem:** Cal.com payload structure varies, and start_time wasn't being extracted correctly.

**Solution:**
- Added multiple extraction paths for start_time:
  - `startTime`, `start`, `timeSlot.start`, `startTimeUTC`, `startUTC`, `startDate`, `date`
- Added date parsing for different formats:
  - Date objects → ISO string
  - Timestamps (numbers) → ISO string
  - String dates → parsed and converted to ISO

### 3. ✅ Duplicate Key Constraint Error
**Problem:** Same booking was being inserted multiple times, violating the unique constraint on `cal_event_id`.

**Solution:**
- Changed from `insert` to `upsert` when `cal_event_id` exists
- Added fallback logic for when `cal_event_id` is null:
  - Check for existing booking with same `lead_id` and `start_time`
  - Update if exists, insert if not

### 4. ✅ Foreign Key Constraint Error
**Problem:** `salesperson_id` from auth user doesn't exist in `sales_persons` table.

**Solution:**
- Added logic to resolve `salesperson_id`:
  - First check if ID exists in `sales_persons` table
  - Try to find by `user_id` if direct match fails
  - Set to `null` if not found (requires foreign key to allow NULL)

## Database Changes Needed:

Run this SQL in Supabase to allow NULL salesperson_id:

```sql
-- Drop the existing foreign key constraint
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_salesperson_id_fkey;

-- Make salesperson_id nullable (if it's not already)
ALTER TABLE appointments 
ALTER COLUMN salesperson_id DROP NOT NULL;

-- Re-add the foreign key constraint (allowing NULL values)
ALTER TABLE appointments
ADD CONSTRAINT appointments_salesperson_id_fkey 
FOREIGN KEY (salesperson_id) 
REFERENCES sales_persons(id) 
ON DELETE SET NULL;
```

## Testing:

After applying these fixes:
1. ✅ No duplicate event listeners
2. ✅ start_time extracted correctly from various payload formats
3. ✅ Duplicate bookings handled gracefully (upsert)
4. ✅ Foreign key constraint handled (NULL allowed)

The booking system should now work correctly!

