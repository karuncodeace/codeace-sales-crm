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
 * Converts a local datetime string in a specific timezone to UTC Date object
 * @param {string} dateStr - Date string in YYYY-MM-DD format
 * @param {string} timeStr - Time string in HH:mm or HH:mm:ss format
 * @param {string} timezone - IANA timezone (e.g., "Asia/Kolkata")
 * @returns {Date} UTC Date object
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
 */
function generateSlotsForWindow(
  windowStartUtc,
  windowEndUtc,
  durationMinutes,
  bufferBefore,
  bufferAfter,
  bookings
) {
  const slots = [];
  let currentSlotStart = windowStartUtc;

  while (currentSlotStart < windowEndUtc) {
    const slotEnd = addMinutes(currentSlotStart, durationMinutes);

    if (slotEnd > windowEndUtc) {
      break;
    }

    const bufferedSlotStart = addMinutes(currentSlotStart, -bufferBefore);
    const bufferedSlotEnd = addMinutes(slotEnd, bufferAfter);

    if (bufferedSlotStart < windowStartUtc || bufferedSlotEnd > windowEndUtc) {
      currentSlotStart = addMinutes(currentSlotStart, durationMinutes);
      continue;
    }

    if (!isSlotBlocked(currentSlotStart, slotEnd, bookings, bufferBefore, bufferAfter)) {
      slots.push({
        start: currentSlotStart.toISOString(),
        end: slotEnd.toISOString(),
      });
    }

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
  const hostUser = await fetchUser(supabase, eventType.user_id);
  let availabilityRules = await fetchAvailabilityRules(supabase, eventType.user_id);
  const availabilityExceptions = await fetchAvailabilityExceptions(
    supabase,
    eventType.user_id,
    startDate,
    endDate
  );
  // Pass hostUserId to fetchBookings so it can check if user is sales and fetch shared bookings
  const bookings = await fetchBookings(supabase, eventTypeId, startDate, endDate, eventType.user_id);

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
      // Availability times are in LOCAL time (invitee's timezone)
      // Convert them from local time to UTC
      
      // Ensure time format is correct (handle HH:mm or HH:mm:ss)
      const startTime = rule.start_time.includes(":") && rule.start_time.split(":").length === 2
        ? rule.start_time
        : rule.start_time.split(":").slice(0, 2).join(":");
      const endTime = rule.end_time.includes(":") && rule.end_time.split(":").length === 2
        ? rule.end_time
        : rule.end_time.split(":").slice(0, 2).join(":");

      // Convert local time in invitee's timezone to UTC
      const windowStartUtc = zonedTimeToUtc(dateString, startTime, inviteeTimezone);
      const windowEndUtc = zonedTimeToUtc(dateString, endTime, inviteeTimezone);

      if (windowStartUtc >= windowEndUtc) {
        continue;
      }

      const windowSlots = generateSlotsForWindow(
        windowStartUtc,
        windowEndUtc,
        durationMinutes,
        bufferBefore,
        bufferAfter,
        bookings
      );

      allSlots.push(...windowSlots);
    }

    currentDate = addDays(currentDate, 1);
  }

  allSlots.sort((a, b) => new Date(a.start) - new Date(b.start));

  return allSlots;
}

