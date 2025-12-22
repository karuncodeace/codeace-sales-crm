import { supabaseServer } from "../supabase/serverClient";
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

  if (start < new Date()) {
    const today = startOfDay(new Date());
    if (start < today) {
      throw new Error("startDate cannot be in the past");
    }
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
 * Fetches availability rules for a user
 */
async function fetchAvailabilityRules(supabase, userId) {
  const { data, error } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("user_id", userId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch availability rules: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetches availability exceptions for a user within date range
 */
async function fetchAvailabilityExceptions(supabase, userId, startDate, endDate) {
  // Extract YYYY-MM-DD from ISO timestamps for database query
  const startDateStr = format(new Date(startDate), "yyyy-MM-dd");
  const endDateStr = format(new Date(endDate), "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("availability_exceptions")
    .select("*")
    .eq("user_id", userId)
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
 */
async function fetchBookings(supabase, eventTypeId, startDate, endDate) {
  const startUtc = new Date(startDate);
  const endUtc = new Date(endDate);

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
  const supabase = await supabaseServer();

  const { start: startDateObj, end: endDateObj } = validateInput(
    eventTypeId,
    startDate,
    endDate,
    inviteeTimezone
  );

  const eventType = await fetchEventType(supabase, eventTypeId);
  const hostUser = await fetchUser(supabase, eventType.user_id);
  const availabilityRules = await fetchAvailabilityRules(supabase, eventType.user_id);
  const availabilityExceptions = await fetchAvailabilityExceptions(
    supabase,
    eventType.user_id,
    startDate,
    endDate
  );
  const bookings = await fetchBookings(supabase, eventTypeId, startDate, endDate);

  // Log warning if no availability rules found
  if (availabilityRules.length === 0) {
    console.warn(`⚠️ No availability rules found for user ${eventType.user_id}. Slots cannot be generated without availability rules.`);
    console.warn(`Please add availability rules to the availability_rules table for user_id: ${eventType.user_id}`);
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

