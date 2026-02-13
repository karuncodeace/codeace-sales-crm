/**
 * Slot Generation Module
 * 
 * CRITICAL FIX: Working hours are stored in UTC in the database.
 * 
 * Example:
 * - Business hours: 10:00 AM - 9:00 PM IST
 * - Stored in DB: start_time = "04:30:00", end_time = "15:30:00" (UTC)
 * 
 * Key Principles:
 * 1. Slots ALWAYS start from working_start_utc, NEVER from current time
 * 2. Slots increment by exact slot_duration_minutes (e.g., 30 minutes)
 * 3. Current time is ONLY used for filtering past slots AFTER generation
 * 4. All times are compared in UTC for consistency
 * 
 * Slot Generation Flow:
 * 1. Parse UTC times from database (already in UTC)
 * 2. Generate slots starting from windowStartUtc
 * 3. Increment by durationMinutes (10:00, 10:30, 11:00, etc.)
 * 4. Filter past slots using current time (UTC comparison)
 * 5. Filter booked slots (with buffers)
 * 6. Return slots as UTC ISO strings
 */

import { supabaseAdmin } from "../supabase/serverClient";
import { format, addDays, startOfDay, addMinutes, parseISO } from "date-fns";

/**
 * Validates input parameters for slot generation
 */
function validateInput(eventTypeId, startDate, endDate, timezone) {
  if (!eventTypeId || typeof eventTypeId !== "string") {
    throw new Error("eventTypeId is required and must be a string");
  }

  if (!startDate || typeof startDate !== "string") {
    throw new Error("startDate is required and must be a string (ISO timestamp)");
  }

  if (!endDate || typeof endDate !== "string") {
    throw new Error("endDate is required and must be a string (ISO timestamp)");
  }

  if (!timezone || typeof timezone !== "string") {
    throw new Error("timezone is required and must be a string (e.g., Asia/Kolkata)");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid date range");
  }

  if (start > end) {
    throw new Error("startDate must be before or equal to endDate");
  }

  const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  if (daysDiff > 30) {
    throw new Error("Date range cannot exceed 30 days");
  }

  // Note: We don't validate if startDate is in the past because:
  // 1. Timezone differences can cause dates to appear "in the past" when they're actually today in the user's timezone
  // 2. The slot generation logic will naturally skip past dates when iterating through dates
  // 3. Date ranges often include today, and timezone conversions can make "today" appear as "yesterday" in UTC
  // 4. It's better to generate slots and let the frontend filter out past dates than to block the entire request
  
  const now = new Date();
  const startDateOnly = startOfDay(start);
  const today = startOfDay(now);
  
  // Just log a warning if the start date is significantly in the past (more than 1 day)
  // This helps with debugging without blocking legitimate requests
  const daysInPast = Math.floor((today - startDateOnly) / (1000 * 60 * 60 * 24));
  if (daysInPast > 1) {
    console.warn(`⚠️ startDate is ${daysInPast} days in the past: ${startDate} (today: ${today.toISOString()})`);
    console.warn(`⚠️ This is allowed - slot generation will skip past dates automatically`);
  }

  return { start, end };
}

/**
 * Fetches event type from database
 */
async function fetchEventType(supabase, eventTypeId) {
  const { data, error } = await supabase
    .from("event_types")
    .select("*")
    .eq("id", eventTypeId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error(`Event type ${eventTypeId} not found`);
    }
    throw new Error(`Failed to fetch event type: ${error.message}`);
  }

  if (!data.active) {
    throw new Error(`Event type ${eventTypeId} is not active`);
  }

  return data;
}

/**
 * Fetches user from database
 */
async function fetchUser(supabase, userId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error(`User ${userId} not found`);
    }
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  return data;
}

/**
 * Fetches availability rules - ALL users share the same rules
 * Since all users share the same slots, we simply fetch all rules from the table
 */
async function fetchAvailabilityRules(supabase, userId) {
  console.log(`🔍 fetchAvailabilityRules called for userId: ${userId}`);
  console.log(`ℹ️ All users share the same availability rules - fetching all rules`);
              
  // Since all users share the same slots, just fetch all rules
  // This is simpler and more efficient than trying to filter by user_id
  try {
                const { data: allRules, error: allRulesError } = await supabase
                  .from("availability_rules")
                  .select("*")
                  .order("day_of_week", { ascending: true })
                  .order("start_time", { ascending: true });
                
    console.log(`🔍 All rules query result:`, { 
      rulesCount: allRules?.length || 0, 
      error: allRulesError?.message,
      hasError: !!allRulesError
    });
      
      if (allRulesError) {
      console.error(`❌ Error fetching all availability rules:`, allRulesError);
        throw new Error(`Failed to fetch availability rules: ${allRulesError.message}`);
      }
      
    if (!allRules || allRules.length === 0) {
      console.warn(`⚠️ No availability rules found in the database. Slots cannot be generated.`);
      console.warn(`⚠️ Please add availability rules to the availability_rules table.`);
      return [];
    }
    
    console.log(`✅ Using ${allRules.length} shared availability rules for all users`);
    return allRules;
  } catch (err) {
    console.error(`❌ Exception fetching availability rules:`, err.message, err);
    throw err;
  }
}

/**
 * Fetches availability exceptions for a user within date range
 * For sales users, fetches shared availability exceptions from any sales user with rules
 */
async function fetchAvailabilityExceptions(supabase, userId, startDate, endDate) {
  // Extract YYYY-MM-DD from ISO timestamps for database query
  const startDateStr = format(new Date(startDate), "yyyy-MM-dd");
  const endDateStr = format(new Date(endDate), "yyyy-MM-dd");

  let targetUserId = userId;

  try {
    // Check if user has sales role
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    if (!userError && user && user.role === "sales") {
      try {
        // For sales users, find any sales user that has availability rules
        const { data: salesUsers, error: salesUsersError } = await supabase
          .from("users")
          .select("id")
          .eq("role", "sales")
          .order("created_at", { ascending: true });

        if (!salesUsersError && salesUsers && salesUsers.length > 0) {
          // Use the first sales user's exceptions (same logic as rules)
          targetUserId = salesUsers[0].id;
        }
      } catch (err) {
        console.warn("Error fetching sales users for shared exceptions, using user's own:", err.message);
      }
    }
  } catch (err) {
    console.warn("Error checking user role for shared exceptions, using user's own:", err.message);
  }

  const { data, error } = await supabase
    .from("availability_exceptions")
    .select("*")
    .eq("user_id", targetUserId)
    .gte("date", startDateStr)
    .lte("date", endDateStr);

  if (error) {
    throw new Error(`Failed to fetch availability exceptions: ${error.message}`);
  }

  return data || [];
}

/**
 * Converts a UTC time string to UTC Date object
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} timeStr - Time string in HH:mm or HH:mm:ss format (stored as UTC in database)
 * @returns {Date} UTC Date object
 */
function utcTimeToUtcDate(dateStr, timeStr) {
  // Ensure time has seconds
  const timeWithSeconds = timeStr.includes(":") && timeStr.split(":").length === 2 
    ? `${timeStr}:00` 
    : timeStr;
  
  // Parse the datetime components and create UTC date directly
  // The time is already in UTC, so we use Date.UTC()
  const [year, month, day, hour, minute, second] = `${dateStr}T${timeWithSeconds}`
    .match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
    .slice(1)
    .map(Number);
  
  // Create UTC date directly since time is already in UTC
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

/**
 * Converts a local datetime string in a specific timezone to UTC Date object
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} timeStr - Time string in HH:mm or HH:mm:ss format
 * @param {string} timezone - IANA timezone (e.g., "Asia/Kolkata")
 * @returns {Date} UTC Date object
 * @deprecated Use utcTimeToUtcDate if times are stored in UTC
 */
function zonedTimeToUtc(dateStr, timeStr, timezone) {
  // Ensure time has seconds
  const timeWithSeconds = timeStr.includes(":") && timeStr.split(":").length === 2 
    ? `${timeStr}:00` 
    : timeStr;
  
  // Parse the datetime components
  const [year, month, day, hour, minute, second] = `${dateStr}T${timeWithSeconds}`
    .match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/)
    .slice(1)
    .map(Number);
  
  // Create a formatter for the target timezone
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  // Strategy: Find the UTC time that, when formatted in the timezone, gives us the desired local time
  // Start with a reasonable estimate (treat local time as UTC, then adjust)
  let candidateUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  
  // Iteratively adjust until we find the correct UTC time
  // This handles DST and timezone offsets correctly
  for (let i = 0; i < 10; i++) {
    const parts = formatter.formatToParts(candidateUtc);
    const tzYear = parseInt(parts.find((p) => p.type === "year").value);
    const tzMonth = parseInt(parts.find((p) => p.type === "month").value) - 1;
    const tzDay = parseInt(parts.find((p) => p.type === "day").value);
    const tzHour = parseInt(parts.find((p) => p.type === "hour").value);
    const tzMinute = parseInt(parts.find((p) => p.type === "minute").value);
    const tzSecond = parseInt(parts.find((p) => p.type === "second").value);
    
    // Check if this UTC time formats to our desired local time
    if (tzYear === year && tzMonth === month - 1 && tzDay === day && 
        tzHour === hour && tzMinute === minute && tzSecond === second) {
      return candidateUtc;
    }
    
    // Calculate the difference in local time components
    // If actual local time is later than desired, we need an earlier UTC time
    const desiredLocalMs = (hour * 60 + minute * 60 + second) * 1000;
    const actualLocalMs = (tzHour * 60 + tzMinute * 60 + tzSecond) * 1000;
    const localTimeDiffMs = actualLocalMs - desiredLocalMs; // How much actual is ahead of desired
    
    // Also account for day/month/year differences (usually 0, but handle edge cases)
    const dayDiffMs = ((year - tzYear) * 365.25 + 
                       ((month - 1) - tzMonth) * 30.44 + 
                       (day - tzDay)) * 24 * 60 * 60 * 1000;
    
    // Adjust: if actual is ahead, go back; the timezone offset is constant so local diff = UTC diff
    candidateUtc = new Date(candidateUtc.getTime() - localTimeDiffMs - dayDiffMs);
  }
  
  return candidateUtc;
}

/**
 * Fetches existing bookings that overlap with the requested date range
 * For sales users, fetches bookings from ALL sales users' event types to ensure shared slots
 */
async function fetchBookings(supabase, eventTypeId, startDate, endDate, hostUserId = null) {
  const startUtc = new Date(startDate);
  const endUtc = new Date(endDate);

  // Check if this is for a sales user - if so, fetch bookings from ALL sales event types
  let isSalesUser = false;
  if (hostUserId) {
    try {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", hostUserId)
        .single();
      
      if (!userError && user) {
        isSalesUser = user.role === "sales";
      }
    } catch (err) {
      console.warn("Error checking user role, falling back to event-type specific bookings:", err.message);
    }
  }

  if (isSalesUser) {
    try {
      // For sales users, get ALL event types that belong to sales users
      const { data: salesUsers, error: salesUsersError } = await supabase
        .from("users")
        .select("id")
        .eq("role", "sales");

      if (salesUsersError) {
        console.warn("Error fetching sales users, falling back to event-type specific bookings:", salesUsersError.message);
      } else if (salesUsers && salesUsers.length > 0) {
        const salesUserIds = salesUsers.map(u => u.id);
        
        // Get all event types for sales users
        const { data: salesEventTypes, error: eventTypesError } = await supabase
          .from("event_types")
          .select("id")
          .in("user_id", salesUserIds);

        if (eventTypesError) {
          console.warn("Error fetching sales event types, falling back to event-type specific bookings:", eventTypesError.message);
        } else if (salesEventTypes && salesEventTypes.length > 0) {
          const eventTypeIds = salesEventTypes.map(et => et.id);
          
          // Fetch bookings from ALL sales event types
          const { data, error } = await supabase
            .from("bookings")
            .select("*")
            .in("event_type_id", eventTypeIds)
            .eq("status", "scheduled")
            .lte("start_time", endUtc.toISOString())
            .gte("end_time", startUtc.toISOString());

          if (error) {
            console.warn("Error fetching shared bookings, falling back to event-type specific bookings:", error.message);
          } else {
            console.log(`✅ Fetched ${data?.length || 0} bookings from all sales event types for shared slots`);
            return data || [];
          }
        } else {
          console.warn("No sales event types found, falling back to event-type specific bookings");
        }
      } else {
        console.warn("No sales users found, falling back to event-type specific bookings");
      }
    } catch (err) {
      console.warn("Error in shared bookings logic, falling back to event-type specific bookings:", err.message);
    }
  }

  // For non-sales users, or fallback, fetch bookings for this specific event type
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("event_type_id", eventTypeId)
    .eq("status", "scheduled")
    .lte("start_time", endUtc.toISOString())
    .gte("end_time", startUtc.toISOString());

  if (error) {
    throw new Error(`Failed to fetch bookings: ${error.message}`);
  }

  return data || [];
}

/**
 * Checks if a slot overlaps with any booking (including buffers)
 */
function isSlotBlocked(slotStartUtc, slotEndUtc, bookings, bufferBefore, bufferAfter) {
  for (const booking of bookings) {
    const bookingStart = parseISO(booking.start_time);
    const bookingEnd = parseISO(booking.end_time);

    const blockedStart = addMinutes(bookingStart, -bufferBefore);
    const blockedEnd = addMinutes(bookingEnd, bufferAfter);

    if (slotStartUtc < blockedEnd && slotEndUtc > blockedStart) {
      return true;
    }
  }
  return false;
}

/**
 * Generates slots for a single availability window
 * 
 * CRITICAL: Slots ALWAYS start from windowStartUtc (working start time), never from current time.
 * Current time is only used for filtering AFTER slots are generated.
 * 
 * @param {Date} windowStartUtc - Working start time in UTC (e.g., 04:30 UTC = 10:00 IST)
 * @param {Date} windowEndUtc - Working end time in UTC (e.g., 15:30 UTC = 21:00 IST)
 * @param {number} durationMinutes - Slot duration (e.g., 30 minutes)
 * @param {number} bufferBefore - Buffer before bookings in minutes
 * @param {number} bufferAfter - Buffer after bookings in minutes
 * @param {Array} bookings - Existing bookings to check conflicts
 * @param {Date} currentTimeUtc - Current time in UTC (used only for filtering past slots)
 * @returns {Array} Array of slot objects with start/end in UTC ISO format
 */
function generateSlotsForWindow(
  windowStartUtc,
  windowEndUtc,
  durationMinutes,
  bufferBefore,
  bufferAfter,
  bookings,
  currentTimeUtc = new Date()
) {
  const slots = [];
  
  // CRITICAL: Always start slot generation from windowStartUtc (working start time)
  // Never start from current time - current time is only used for filtering
  let currentSlotStart = new Date(windowStartUtc);

  // Generate slots in clean increments of durationMinutes
  // Starting from the exact working start time
  // CRITICAL: Loop continues while slot START is before windowEndUtc
  // This ensures we include the last possible slot that fits within the window
  while (currentSlotStart < windowEndUtc) {
    const slotEnd = addMinutes(currentSlotStart, durationMinutes);

    // Stop if slot extends beyond working hours
    // This check ensures we don't create slots that go past windowEndUtc
    if (slotEnd > windowEndUtc) {
      // DEBUG: Log why we're stopping
      console.log(`  ⚠️ Slot generation stopped:`, {
        currentSlotStartUTC: currentSlotStart.toISOString(),
        slotEndUTC: slotEnd.toISOString(),
        windowEndUtc: windowEndUtc.toISOString(),
        reason: `Slot end (${slotEnd.toISOString()}) exceeds window end (${windowEndUtc.toISOString()})`,
      });
      break;
    }

    // CRITICAL FIX: Buffer check should only skip slots if the ACTUAL slot (not buffer) extends beyond window
    // Buffers are used for conflict checking, but shouldn't prevent valid slots from being generated
    // A slot is valid if its actual start/end times fit within the window
    // Buffers extending beyond the window are acceptable - they're just used for conflict detection
    
    // Check if the ACTUAL slot fits within the window (buffers can extend beyond)
    if (currentSlotStart < windowStartUtc || slotEnd > windowEndUtc) {
      // Only skip if the actual slot extends beyond working hours
      // Buffers extending beyond are OK - they're just for conflict checking
      currentSlotStart = addMinutes(currentSlotStart, durationMinutes);
      continue;
    }
    
    // Calculate buffers for conflict checking (but don't use them to filter slots)
    const bufferedSlotStart = addMinutes(currentSlotStart, -bufferBefore);
    const bufferedSlotEnd = addMinutes(slotEnd, bufferAfter);
    
    // DEBUG: Log if buffers extend beyond window (for information, but don't skip slot)
    if (bufferedSlotStart < windowStartUtc || bufferedSlotEnd > windowEndUtc) {
      console.log(`  ℹ️ Slot buffers extend beyond window (acceptable):`, {
        slotStartUTC: currentSlotStart.toISOString(),
        slotEndUTC: slotEnd.toISOString(),
        bufferedStartUTC: bufferedSlotStart.toISOString(),
        bufferedEndUTC: bufferedSlotEnd.toISOString(),
        windowStartUTC: windowStartUtc.toISOString(),
        windowEndUTC: windowEndUtc.toISOString(),
        note: "Buffers extending beyond window are OK - slot will still be generated",
      });
    }

    // FILTER: Remove past slots (compare in UTC)
    // Current time is ONLY used here for filtering, never for slot generation
    if (currentSlotStart <= currentTimeUtc) {
      // Skip past slots - but continue generating from working start time
      currentSlotStart = addMinutes(currentSlotStart, durationMinutes);
      continue;
    }

    // Check if slot conflicts with existing bookings (including buffers)
    if (!isSlotBlocked(currentSlotStart, slotEnd, bookings, bufferBefore, bufferAfter)) {
      slots.push({
        start: currentSlotStart.toISOString(),
        end: slotEnd.toISOString(),
      });
    }

    // Move to next slot: increment by exact slot duration
    // This ensures clean boundaries: 10:00, 10:30, 11:00, 11:30, etc.
    currentSlotStart = addMinutes(currentSlotStart, durationMinutes);
  }

  return slots;
}

/**
 * Main slot generation function
 */
export async function generateSlots(eventTypeId, startDate, endDate, inviteeTimezone) {
  // Use admin client to bypass RLS policies
  // This is necessary because slot generation needs to access availability rules,
  // event types, users, and bookings regardless of the current user's permissions
  // This ensures slots work correctly in production where RLS might be more restrictive
  const supabase = supabaseAdmin();

  const { start: startDateObj, end: endDateObj } = validateInput(
    eventTypeId,
    startDate,
    endDate,
    inviteeTimezone
  );

  const eventType = await fetchEventType(supabase, eventTypeId);

  // Determine the host user id to use for availability and bookings.
  // Some event_types rows may have a null user_id (shared event types). In that case,
  // fall back to the first sales user found so slot generation can continue.
  let hostUserId = eventType.user_id || null;
  if (!hostUserId) {
    try {
      const { data: fallbackUser, error: fallbackErr } = await supabase
        .from("users")
        .select("id")
        .eq("role", "sales")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fallbackErr) {
        console.warn("⚠️ Failed to find fallback sales user for shared event type:", fallbackErr.message);
      } else if (fallbackUser && fallbackUser.id) {
        hostUserId = fallbackUser.id;
        console.log(`ℹ️ Using fallback sales user ${hostUserId} for event type ${eventTypeId} (event_types.user_id was null)`);
      } else {
        console.warn("⚠️ No sales user found to fallback to for shared event type; slot generation may produce no slots.");
      }
    } catch (err) {
      console.warn("⚠️ Exception while finding fallback sales user:", err.message);
    }
  }

  const hostUser = hostUserId ? await fetchUser(supabase, hostUserId) : null;
  let availabilityRules = await fetchAvailabilityRules(supabase, hostUserId);
  const availabilityExceptions = await fetchAvailabilityExceptions(
    supabase,
    hostUserId,
    startDate,
    endDate
  );
  // Pass hostUserId to fetchBookings so it can check if user is sales and fetch shared bookings
  const bookings = await fetchBookings(supabase, eventTypeId, startDate, endDate, hostUserId);

  // Log detailed information for debugging production issues
  console.log(`🔍 Slot generation debug info:`, {
    eventTypeId,
    hostUserId: eventType.user_id,
    hostUserRole: hostUser?.role,
    hostUserEmail: hostUser?.email,
    availabilityRulesCount: availabilityRules.length,
    availabilityExceptionsCount: availabilityExceptions.length,
    bookingsCount: bookings.length,
    dateRange: { startDate, endDate },
    timezone: inviteeTimezone
  });
  
  // If no rules found, try one more time with a simple query to check if table exists
  if (availabilityRules.length === 0) {
    console.log(`🔍 No rules found, attempting simple fallback query...`);
    try {
      const { data: fallbackRules, error: fallbackError } = await supabase
        .from("availability_rules")
        .select("*")
        .limit(100);
      
      console.log(`🔍 Fallback query result:`, { 
        rulesCount: fallbackRules?.length || 0, 
        error: fallbackError?.message,
        hasError: !!fallbackError
      });
      
      if (!fallbackError && fallbackRules && fallbackRules.length > 0) {
        console.log(`✅ Found ${fallbackRules.length} rules via fallback query, using them`);
        // Update the availabilityRules variable
        availabilityRules = fallbackRules;
      } else if (fallbackError) {
        console.error(`❌ Fallback query error:`, fallbackError);
      }
    } catch (err) {
      console.error(`❌ Fallback query exception:`, err);
    }
  }

  // Log warning if no availability rules found
  if (availabilityRules.length === 0) {
    const userRole = hostUser?.role || "unknown";
    if (userRole === "sales") {
      console.warn(`⚠️ No shared availability rules found for sales users. Slots cannot be generated without availability rules.`);
      console.warn(`Please add availability rules to the availability_rules table for the first sales user.`);
      console.warn(`Debug: eventType.user_id=${eventType.user_id}, hostUser.role=${userRole}`);
    } else {
      console.warn(`⚠️ No availability rules found for user ${eventType.user_id}. Slots cannot be generated without availability rules.`);
      console.warn(`Please add availability rules to the availability_rules table for user_id: ${eventType.user_id}`);
    }
  }

  const durationMinutes = eventType.duration_minutes;
  const bufferBefore = eventType.buffer_before || 0;
  const bufferAfter = eventType.buffer_after || 0;

  const exceptionMap = new Map();
  for (const exception of availabilityExceptions) {
    exceptionMap.set(exception.date, exception.is_available);
  }

  const rulesByDay = new Map();
  for (const rule of availabilityRules) {
    if (!rulesByDay.has(rule.day_of_week)) {
      rulesByDay.set(rule.day_of_week, []);
    }
    rulesByDay.get(rule.day_of_week).push(rule);
  }
  
  console.log(`🔍 Rules by day:`, Object.fromEntries(rulesByDay));

  const allSlots = [];
  let currentDate = startDateObj;

  while (currentDate <= endDateObj) {
    const dateString = format(currentDate, "yyyy-MM-dd");
    const dayOfWeek = currentDate.getDay();

    const exception = exceptionMap.get(dateString);
    if (exception === false) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    const dayRules = rulesByDay.get(dayOfWeek) || [];
    if (dayRules.length === 0) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    for (const rule of dayRules) {
      // CRITICAL: Working hours are stored in UTC in the database
      // Example: start_time = "04:30:00" UTC = 10:00 AM IST
      //          end_time = "15:30:00" UTC = 9:00 PM IST
      // We parse these UTC times directly, then convert to user's timezone for display
      
      // Ensure time format is correct (handle HH:mm or HH:mm:ss)
      const startTime = rule.start_time.includes(":") && rule.start_time.split(":").length === 2
        ? rule.start_time
        : rule.start_time.split(":").slice(0, 2).join(":");
      const endTime = rule.end_time.includes(":") && rule.end_time.split(":").length === 2
        ? rule.end_time
        : rule.end_time.split(":").slice(0, 2).join(":");

      // Parse UTC times directly (times are already stored in UTC)
      // Example: dateString = "2024-12-20", startTime = "04:00:00"
      // Result: windowStartUtc = 2024-12-20T04:00:00Z (UTC)
      const windowStartUtc = utcTimeToUtcDate(dateString, startTime);
      const windowEndUtc = utcTimeToUtcDate(dateString, endTime);
      
      // DEBUG: Log the exact window being used for slot generation
      console.log(`🔍 Availability window for ${dateString} (day ${dayOfWeek}):`, {
        ruleId: rule.id,
        startTimeFromDB: startTime,
        endTimeFromDB: endTime,
        windowStartUtc: windowStartUtc.toISOString(),
        windowEndUtc: windowEndUtc.toISOString(),
        windowDurationHours: (windowEndUtc - windowStartUtc) / (1000 * 60 * 60),
      });

      // Handle day rollover: if end time is before start time, end is next day
      if (windowEndUtc <= windowStartUtc) {
        // End time is on the next day (e.g., 22:00 UTC to 06:00 UTC next day)
        const nextDay = addDays(currentDate, 1);
        const nextDayString = format(nextDay, "yyyy-MM-dd");
        const windowEndUtcNextDay = utcTimeToUtcDate(nextDayString, endTime);
        
        // Generate slots for current day (from start to end of day)
        const endOfDayUtc = new Date(Date.UTC(
          windowStartUtc.getUTCFullYear(),
          windowStartUtc.getUTCMonth(),
          windowStartUtc.getUTCDate(),
          23, 59, 59, 999
        ));
        
        const slotsToday = generateSlotsForWindow(
          windowStartUtc,
          endOfDayUtc,
          durationMinutes,
          bufferBefore,
          bufferAfter,
          bookings,
          new Date() // Current time for filtering past slots
        );
        allSlots.push(...slotsToday);
        
        // Generate slots for next day (from start of day to end)
        const startOfNextDayUtc = new Date(Date.UTC(
          windowEndUtcNextDay.getUTCFullYear(),
          windowEndUtcNextDay.getUTCMonth(),
          windowEndUtcNextDay.getUTCDate(),
          0, 0, 0, 0
        ));
        
        const slotsNextDay = generateSlotsForWindow(
          startOfNextDayUtc,
          windowEndUtcNextDay,
          durationMinutes,
          bufferBefore,
          bufferAfter,
          bookings,
          new Date() // Current time for filtering past slots
        );
        allSlots.push(...slotsNextDay);
        
        continue;
      }

      // Generate slots for this availability window
      // Slots will start from windowStartUtc (working start time), not current time
      // Current time is only used internally for filtering past slots
      const windowSlots = generateSlotsForWindow(
        windowStartUtc,
        windowEndUtc,
        durationMinutes,
        bufferBefore,
        bufferAfter,
        bookings,
        new Date() // Current time in UTC - used ONLY for filtering past slots
      );

      // DEBUG: Log generated slots for this window
      if (windowSlots.length > 0) {
        const firstSlot = new Date(windowSlots[0].start);
        const lastSlot = new Date(windowSlots[windowSlots.length - 1].start);
        console.log(`  ✅ Generated ${windowSlots.length} slots:`, {
          firstSlotUTC: firstSlot.toISOString(),
          lastSlotUTC: lastSlot.toISOString(),
          expectedEndUTC: windowEndUtc.toISOString(),
          matchesExpectedEnd: lastSlot.getTime() + (durationMinutes * 60 * 1000) === windowEndUtc.getTime(),
        });
      } else {
        console.log(`  ⚠️ No slots generated for this window (all filtered or blocked)`);
      }

      allSlots.push(...windowSlots);
    }

    currentDate = addDays(currentDate, 1);
  }

  // Sort slots by start time (earliest first)
  allSlots.sort((a, b) => new Date(a.start) - new Date(b.start));

  // FINAL SAFETY CHECK: Filter out any past slots (compare in UTC)
  // This is a redundant check - generateSlotsForWindow already filters past slots,
  // but this ensures no past slots slip through due to edge cases
  const nowUtc = new Date();
  const validSlots = allSlots.filter(slot => {
    const slotStartUtc = new Date(slot.start);
    return slotStartUtc > nowUtc; // Only keep future slots
  });

  // Log slot generation summary for debugging
  if (validSlots.length > 0) {
    const firstSlot = new Date(validSlots[0].start);
    const lastSlot = new Date(validSlots[validSlots.length - 1].start);
    
    // Format times in user's timezone for logging
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: inviteeTimezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    
    console.log(`✅ Generated ${validSlots.length} slots (${allSlots.length - validSlots.length} past slots filtered)`);
    console.log(`   First slot: ${formatter.format(firstSlot)} ${inviteeTimezone}`);
    console.log(`   Last slot: ${formatter.format(lastSlot)} ${inviteeTimezone}`);
  } else {
    console.warn(`⚠️ No valid slots generated after filtering`);
  }

  return validSlots;
}

