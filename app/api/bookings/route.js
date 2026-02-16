import { NextResponse } from "next/server";
import { createBooking } from "../../../lib/bookings/createBooking";
import { supabaseServer, supabaseAdmin } from "../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../lib/crm/auth";

// Get all bookings from the bookings table
export async function GET() {
  try {
    // Get CRM user for authentication check only
    const crmUser = await getCrmUser();
    
    // If no CRM user found, return empty array instead of 403 to prevent loading loops
    if (!crmUser) {
      console.warn("No CRM user found - returning empty bookings array");
      return NextResponse.json([]);
    }
    
    // Use admin client to bypass RLS and get ALL bookings
    const supabase = supabaseAdmin();
    
    // Fetch ALL bookings from the table (no filtering)
    console.log("🔍 Bookings API: Fetching ALL bookings", { 
      userId: crmUser.id, 
      role: crmUser.role,
      email: crmUser.email 
    });
    
    // Fetch ALL bookings - explicitly remove any limits
    const { data, error, count } = await supabase
      .from("bookings")
      .select("*", { count: "exact" })
      .order("start_time", { ascending: true });
    
    if (error) {
      console.error("Bookings GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log("✅ Bookings API: Query result", { 
      dataCount: data?.length || 0,
      totalCount: count || 0,
      returnedBookingIds: data?.map(b => ({ id: b.id, invitee_name: b.invitee_name, status: b.status, is_rescheduled: b.is_rescheduled })) || []
    });
    
    // If count doesn't match data length, there might be a limit issue
    if (count !== null && count !== data?.length) {
      console.warn(`⚠️ Bookings API: Count mismatch! Total in DB: ${count}, Returned: ${data?.length}`);
    }
    
    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Bookings GET exception:", {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    });

    // Handle client-abort/AbortError separately to avoid noisy 500s
    if (err && (err.name === "AbortError" || err.type === "aborted")) {
      return NextResponse.json({ error: "Request aborted by client" }, { status: 499 });
    }

    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Safely parse JSON and handle client aborts explicitly
    let body;
    try {
      body = await request.json();
    } catch (err) {
      // request.json() can throw an AbortError if the client disconnected
      if (err && (err.name === "AbortError" || err.type === "aborted")) {
        console.warn("POST request aborted by client while reading body");
        return NextResponse.json({ error: "Request aborted by client" }, { status: 499 });
      }
      throw err;
    }

    // Double-check signal after parsing
    if (request.signal && request.signal.aborted) {
      console.warn("POST request signal already aborted after parsing body");
      return NextResponse.json({ error: "Request aborted by client" }, { status: 499 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const booking = await createBooking(body);

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("Bookings API error:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });

    // Client-abort handling
    if (error && (error.name === "AbortError" || error.type === "aborted")) {
      return NextResponse.json({ error: "Request aborted by client" }, { status: 499 });
    }

    if (
      error.message === "Selected slot is no longer available" ||
      error.message === "Event type not available" ||
      error.message.includes("required") ||
      error.message.includes("must be")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error.message === "Host user not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH: Update meeting completion status
export async function PATCH(request) {
  try {
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Parse body safely to handle client disconnects / AbortError
    let body;
    try {
      body = await request.json();
    } catch (err) {
      if (err && (err.name === "AbortError" || err.type === "aborted")) {
        console.warn("PATCH request aborted by client while reading body");
        return NextResponse.json({ error: "Request aborted by client" }, { status: 499 });
      }
      throw err;
    }

    if (request.signal && request.signal.aborted) {
      console.warn("PATCH request signal already aborted after parsing body");
      return NextResponse.json({ error: "Request aborted by client" }, { status: 499 });
    }

    const { bookingId, meeting_completion_status, is_email_required } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    // At least one field must be provided for update
    if (meeting_completion_status === undefined && is_email_required === undefined) {
      return NextResponse.json({ 
        error: "At least one of 'meeting_completion_status' or 'is_email_required' must be provided" 
      }, { status: 400 });
    }

    // Use admin client to update booking
    const supabase = supabaseAdmin();
    
    // First, get the booking to find the lead_id
    const { data: existingBooking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, lead_id, meeting_completion_status, is_email_required")
      .eq("id", bookingId)
      .single();

    if (fetchError) {
      console.error("Bookings PATCH error - fetch:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Build update payload
    const updateData = {};

    // Update meeting_completion_status if provided
    if (meeting_completion_status !== undefined) {
      updateData.meeting_completion_status = meeting_completion_status;
    }

    // Update is_email_required if explicitly provided (true/false)
    if (typeof is_email_required === "boolean") {
      updateData.is_email_required = is_email_required;
    }

    // Update the booking
    const { data, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId)
      .select()
      .single();

    if (error) {
      console.error("Bookings PATCH error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If meeting is marked as completed (true boolean or "Completed" text for legacy), update the lead's meeting_status
    const isCompleted = meeting_completion_status === true || meeting_completion_status === "Completed";
    if (isCompleted && existingBooking?.lead_id) {
      try {
        const { error: leadUpdateError } = await supabase
          .from("leads_table")
          .update({
            meeting_status: "Completed",
            last_attempted_at: new Date().toISOString()
          })
          .eq("id", existingBooking.lead_id);

        if (leadUpdateError) {
          console.error("Failed to update lead meeting_status:", leadUpdateError);
          // Don't fail the booking update if lead update fails, just log it
        } else {
          console.log(`✅ Updated lead ${existingBooking.lead_id} meeting_status to "Completed"`);
        }
      } catch (leadUpdateErr) {
        console.error("Exception updating lead meeting_status:", leadUpdateErr);
        // Don't fail the booking update if lead update fails
      }
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err) {
    console.error("Bookings PATCH exception:", {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    });

    if (err && (err.name === "AbortError" || err.type === "aborted")) {
      return NextResponse.json({ error: "Request aborted by client" }, { status: 499 });
    }

    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

