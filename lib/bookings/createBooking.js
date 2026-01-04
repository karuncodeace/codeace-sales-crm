import { supabaseServer } from "../supabase/serverClient";
import { parseISO, addMinutes } from "date-fns";
import { createCalendarEventWithMeet } from "../google/createCalendarEvent";

/**
 * Validates the request body for booking creation
 */
function validateRequest(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  if (!body.eventTypeId || typeof body.eventTypeId !== "string") {
    throw new Error("eventTypeId is required and must be a string");
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

  if (!body.invitee || typeof body.invitee !== "object") {
    throw new Error("invitee is required and must be an object");
  }

  if (!body.invitee.name || typeof body.invitee.name !== "string") {
    throw new Error("invitee.name is required and must be a string");
  }

  if (!body.invitee.email || typeof body.invitee.email !== "string") {
    throw new Error("invitee.email is required and must be a string");
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
      throw new Error("Event type not available");
    }
    throw new Error(`Failed to fetch event type: ${error.message}`);
  }

  if (!data.active) {
    throw new Error("Event type not available");
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
      throw new Error(`Host user not found`);
    }
    throw new Error(`Failed to fetch user: ${error.message}`);
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
  excludeBookingId = null
) {
  let query = supabase
    .from("bookings")
    .select("id, start_time, end_time")
    .eq("event_type_id", eventTypeId)
    .eq("status", "scheduled")
    .lt("start_time", bufferedEndUtc.toISOString())
    .gt("end_time", bufferedStartUtc.toISOString());

  if (excludeBookingId) {
    query = query.neq("id", excludeBookingId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to check for conflicts: ${error.message}`);
  }

  return (data || []).length > 0;
}

/**
 * Creates a booking with atomic conflict checking
 */
export async function createBooking(requestBody) {
  const supabase = await supabaseServer();

  const { startDate, endDate } = validateRequest(requestBody);

  const eventType = await fetchEventType(supabase, requestBody.eventTypeId);
  const hostUser = await fetchUser(supabase, eventType.user_id);

  const bufferBefore = eventType.buffer_before || 0;
  const bufferAfter = eventType.buffer_after || 0;

  const bufferedStartUtc = addMinutes(startDate, -bufferBefore);
  const bufferedEndUtc = addMinutes(endDate, bufferAfter);

  const hasConflict = await checkForConflicts(
    supabase,
    requestBody.eventTypeId,
    bufferedStartUtc,
    bufferedEndUtc
  );

  if (hasConflict) {
    throw new Error("Selected slot is no longer available");
  }

  const bookingData = {
    event_type_id: requestBody.eventTypeId,
    host_user_id: eventType.user_id,
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    timezone: requestBody.timezone,
    status: "scheduled",
    invitee_name: requestBody.invitee.name,
    invitee_email: requestBody.invitee.email,
    invitee_phone: requestBody.invitee.phone || null,
    lead_id: requestBody.lead_id || null,
    invitiee_contact_name: requestBody.invitiee_contact_name || null,
  };

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert(bookingData)
    .select()
    .single();

  if (bookingError) {
    if (bookingError.code === "23505") {
      throw new Error("Selected slot is no longer available");
    }
    throw new Error(`Failed to create booking: ${bookingError.message}`);
  }

  const { error: logError } = await supabase
    .from("booking_actions")
    .insert({
      booking_id: booking.id,
      action: "created",
      performed_by: eventType.user_id,
    });

  if (logError) {
    console.error("Failed to log booking action:", logError);
  }

  // Create Google Calendar event with Meet link
  let calendarEventId = null;
  let meetingLink = null;

  // Check if Google Service Account credentials are configured
  console.log("🔍 Checking Google Calendar integration...");
  console.log("Environment variable exists:", !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON_2);
  
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON_2) {
    console.warn(
      "⚠️ GOOGLE_SERVICE_ACCOUNT_JSON_2 not configured. Skipping Google Calendar integration."
    );
    console.warn("⚠️ To enable Google Calendar integration, set GOOGLE_SERVICE_ACCOUNT_JSON_2 in your .env.local file");
  } else {
    console.log("✅ GOOGLE_SERVICE_ACCOUNT_JSON_2 found, proceeding with calendar integration");
    try {
      console.log("🔄 Creating Google Calendar event for booking:", booking.id);
      const calendarEvent = await createCalendarEventWithMeet({
        summary: eventType.name || "Discovery Call",
        description: `Scheduled via CRM - ${requestBody.invitee.name}`,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        timezone: requestBody.timezone,
        inviteeEmail: requestBody.invitee.email,
        inviteeName: requestBody.invitee.name,
        bookingId: booking.id,
      });

      calendarEventId = calendarEvent.eventId;
      meetingLink = calendarEvent.meetingLink;

      console.log("✅ Google Calendar event created:", {
        eventId: calendarEventId,
        meetingLink: meetingLink,
      });

      // Update booking with calendar event ID and meeting link
      const updateData = {};
      if (calendarEventId) {
        updateData.calendar_event_id = calendarEventId;
      }
      if (meetingLink) {
        updateData.meeting_link = meetingLink;
      }

      // Always update if we have at least one field to update
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("bookings")
          .update(updateData)
          .eq("id", booking.id);

        if (updateError) {
          console.error(
            "❌ Failed to update booking with calendar event data:",
            {
              error: updateError.message,
              code: updateError.code,
              details: updateError.details,
              bookingId: booking.id,
            }
          );
          // Log error but don't fail the booking - it's already created
        } else {
          // Update the returned booking object
          if (calendarEventId) booking.calendar_event_id = calendarEventId;
          if (meetingLink) booking.meeting_link = meetingLink;
          console.log("✅ Successfully saved meeting_link to bookings table:", {
            bookingId: booking.id,
            meetingLink: meetingLink,
            calendarEventId: calendarEventId,
          });
        }
      } else {
        console.warn(
          "⚠️ No calendar event data to save (both eventId and meetingLink are null)"
        );
      }
    } catch (calendarError) {
      // Log detailed error but don't fail the booking creation
      console.error("❌ Failed to create Google Calendar event:", {
        error: calendarError.message,
        stack: calendarError.stack,
        bookingId: booking.id,
        details:
          calendarError.response?.data || calendarError.response?.statusText,
      });
      // Booking is still created successfully, just without calendar integration
    }
  }

  return booking;
}

