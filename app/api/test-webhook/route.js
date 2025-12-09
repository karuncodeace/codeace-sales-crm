import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/serverClient";

// Manual test endpoint to simulate webhook and update pending appointments
export async function POST(request) {
  try {
    const body = await request.json();
    const { lead_id, start_time, end_time, attendee_email, attendee_name } = body;

    if (!lead_id) {
      return NextResponse.json(
        { error: "lead_id is required" },
        { status: 400 }
      );
    }

    const supabase = await supabaseServer();

    // Find pending appointment for this lead
    const { data: pendingAppointments, error: searchError } = await supabase
      .from("appointments")
      .select("*")
      .eq("lead_id", lead_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);

    if (searchError) {
      console.error("Error searching:", searchError);
      return NextResponse.json(
        { error: searchError.message },
        { status: 500 }
      );
    }

    if (!pendingAppointments || pendingAppointments.length === 0) {
      return NextResponse.json(
        { error: `No pending appointment found for lead_id: ${lead_id}` },
        { status: 404 }
      );
    }

    const pendingAppointment = pendingAppointments[0];

    // Update to booked
    const updateData = {
      status: "booked",
      updated_at: new Date().toISOString(),
    };

    if (start_time) updateData.start_time = start_time;
    if (end_time) updateData.end_time = end_time;
    if (attendee_email) updateData.attendee_email = attendee_email;
    if (attendee_name) updateData.attendee_name = attendee_name;

    const { data, error: updateError } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", pendingAppointment.id)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Updated appointment ${pendingAppointment.id} from pending to booked`,
      data,
    });
  } catch (error) {
    console.error("Test webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}



