import { supabaseAdmin } from "../supabase/serverClient";
import { parseISO, addMinutes } from "date-fns";

/**
 * Validates the request body for booking reschedule
 */
function validateRequest(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  if (!body.bookingId || typeof body.bookingId !== "string") {
    throw new Error("bookingId is required and must be a string");
  }

  if (!body.start || typeof body.start !== "string") {
    throw new Error("start is required and must be an ISO string");
  }

  if (!body.end || typeof body.end !== "string") {
    throw new Error("end is required and must be an ISO string");
  }

  if (!body.timezone || typeof body.timezone !== "string") {
    throw new Error("timezone is required and must be a string");
  }

  const startDate = parseISO(body.start);
  const endDate = parseISO(body.end);

  if (isNaN(startDate.getTime())) {
    throw new Error("start must be a valid ISO date string");
  }

  if (isNaN(endDate.getTime())) {
    throw new Error("end must be a valid ISO date string");
  }

  if (startDate >= endDate) {
    throw new Error("start must be before end");
  }

  if (startDate < new Date()) {
    throw new Error("start cannot be in the past");
  }

  return { startDate, endDate };
}

/**
 * Fetches existing booking from database
 */
async function fetchBooking(supabase, bookingId) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Booking not found");
    }
    throw new Error(`Failed to fetch booking: ${error.message}`);
  }

  if (data.status !== "scheduled") {
    throw new Error("Only scheduled bookings can be rescheduled");
  }

  return data;
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
      throw new Error("Event type not found");
    }
    throw new Error(`Failed to fetch event type: ${error.message}`);
  }

  return data;
}

/**
 * Checks for booking conflicts using buffered ranges
 * Returns true if conflict exists, false otherwise
 */
async function checkForConflicts(
  supabase,
  eventTypeId,
  bufferedStartUtc,
  bufferedEndUtc,
  excludeBookingId
) {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, start_time, end_time")
    .eq("event_type_id", eventTypeId)
    .eq("status", "scheduled")
    .neq("id", excludeBookingId)
    .lt("start_time", bufferedEndUtc.toISOString())
    .gt("end_time", bufferedStartUtc.toISOString());

  if (error) {
    throw new Error(`Failed to check for conflicts: ${error.message}`);
  }

  return (data || []).length > 0;
}

/**
 * Reschedules a booking with conflict checking
 */
export async function rescheduleBooking(requestBody) {
  const supabase = supabaseAdmin();

  const { startDate, endDate } = validateRequest(requestBody);

  const existingBooking = await fetchBooking(supabase, requestBody.bookingId);

  const eventType = await fetchEventType(supabase, existingBooking.event_type_id);

  const bufferBefore = eventType.buffer_before || 0;
  const bufferAfter = eventType.buffer_after || 0;

  const bufferedStartUtc = addMinutes(startDate, -bufferBefore);
  const bufferedEndUtc = addMinutes(endDate, bufferAfter);

  const hasConflict = await checkForConflicts(
    supabase,
    existingBooking.event_type_id,
    bufferedStartUtc,
    bufferedEndUtc,
    existingBooking.id
  );

  if (hasConflict) {
    throw new Error("New slot is not available");
  }

  const { data, error: updateError } = await supabase
    .from("bookings")
    .update({
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      timezone: requestBody.timezone,
      is_rescheduled: true,
    })
    .eq("id", existingBooking.id)
    .select();

  if (updateError) {
    throw new Error(`Failed to reschedule booking: ${updateError.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("Booking not updated (possibly blocked by RLS)");
  }

  const updatedBooking = data[0];

  const { error: logError } = await supabase
    .from("booking_actions")
    .insert({
      booking_id: updatedBooking.id,
      action: "rescheduled",
      performed_by: null,
    });

  if (logError) {
    console.error("Failed to log booking action:", logError);
  }

  return updatedBooking;
}

