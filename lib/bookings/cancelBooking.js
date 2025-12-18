import { supabaseAdmin } from "../supabase/serverClient";

/**
 * Validates the request body for booking cancellation
 */
function validateRequest(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  if (!body.bookingId || typeof body.bookingId !== "string") {
    throw new Error("bookingId is required and must be a string");
  }

  return true;
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
    throw new Error("Only scheduled bookings can be cancelled");
  }

  return data;
}

/**
 * Cancels a booking
 */
export async function cancelBooking(requestBody) {
  const supabase = supabaseAdmin();

  validateRequest(requestBody);

  const existingBooking = await fetchBooking(supabase, requestBody.bookingId);

  const { data, error: updateError } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
    })
    .eq("id", existingBooking.id)
    .select();

  if (updateError) {
    throw new Error(`Failed to cancel booking: ${updateError.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("Booking not updated (possibly blocked by RLS)");
  }

  const updatedBooking = data[0];

  const { error: logError } = await supabase
    .from("booking_actions")
    .insert({
      booking_id: updatedBooking.id,
      action: "cancelled",
      performed_by: null,
    });

  if (logError) {
    console.error("Failed to log booking action:", logError);
  }

  return updatedBooking;
}

