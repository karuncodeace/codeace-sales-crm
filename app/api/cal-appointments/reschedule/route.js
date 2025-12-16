import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../../lib/crm/auth";
import { CAL_API_BASE_URL } from "../../../../config/calConfig";

// POST - Reschedule appointment via Cal.com API
export async function POST(request) {
  try {
    const supabase = await supabaseServer();
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return NextResponse.json({ error: "Not authorized for CRM" }, { status: 403 });
    }

    const body = await request.json();
    const { appointment_id, cal_event_id, start_time, end_time } = body;

    if (!appointment_id || !cal_event_id || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Missing required fields: appointment_id, cal_event_id, start_time, end_time" },
        { status: 400 }
      );
    }

    // Get Cal.com API credentials from environment variables
    const calApiKey = process.env.CALCOM_API_KEY;
    // Use self-hosted Cal.com API URL from config
    const calApiUrl = CAL_API_BASE_URL;

    if (!calApiKey) {
      console.warn("⚠️ CALCOM_API_KEY not set, updating database only");
    }

    // First, get the booking ID from Cal.com if we have API access
    let bookingId = cal_event_id;
    
    // If we have Cal.com API access, try to reschedule via Cal.com API
    if (calApiKey) {
      try {
        // Cal.com API v2 reschedule endpoint
        // The bookingId should be the UID stored in cal_event_id
        const rescheduleResponse = await fetch(`${calApiUrl}/bookings/${bookingId}/reschedule`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${calApiKey}`,
          },
          body: JSON.stringify({
            rescheduleTime: start_time,
            // Alternative format if Cal.com expects different field names
            // startTime: start_time,
            // endTime: end_time,
          }),
        });

        if (!rescheduleResponse.ok) {
          const errorText = await rescheduleResponse.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          console.error("Cal.com reschedule API error:", {
            status: rescheduleResponse.status,
            statusText: rescheduleResponse.statusText,
            error: errorData,
          });
          
          // If Cal.com API fails but we have the event, still update our database
          // This allows the system to work even if Cal.com API is temporarily unavailable
          console.log("⚠️ Cal.com API call failed, updating database only");
        } else {
          const calResult = await rescheduleResponse.json().catch(() => ({ success: true }));
          console.log("✅ Cal.com reschedule successful:", calResult);
        }
      } catch (calError) {
        console.error("Error calling Cal.com reschedule API:", calError);
        // Continue to update database even if Cal.com API fails
      }
    }

    // Update database regardless of Cal.com API result
    const { data: appointment } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointment_id)
      .single();

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Update appointment in database
    const { data: updatedAppointment, error: updateError } = await supabase
      .from("appointments")
      .update({
        status: "rescheduled",
        start_time: start_time,
        end_time: end_time,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointment_id)
      .select()
      .single();

    if (updateError) {
      console.error("Database update error:", updateError);
      return NextResponse.json(
        { error: `Failed to update appointment: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Appointment rescheduled successfully",
      data: updatedAppointment,
    });
  } catch (err) {
    console.error("Reschedule API exception:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

