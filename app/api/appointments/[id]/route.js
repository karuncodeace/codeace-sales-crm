import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase/serverClient";
import { getCrmUser, getFilteredQuery } from "../../../../lib/crm/auth";

// PATCH - Update appointment (for reschedule/cancel)
export async function PATCH(request, { params }) {
  try {
    const supabase = await supabaseServer();
    
    // Get CRM user for role-based filtering
    const crmUser = await getCrmUser();
    if (!crmUser) {
      return NextResponse.json({ error: "Not authorized for CRM" }, { status: 403 });
    }
    
    const { id } = await params;
    
    // Check if user has access to this appointment
    let accessQuery = getFilteredQuery(supabase, "appointments", crmUser);
    const { data: existingAppointment } = await accessQuery
      .eq("id", id)
      .select("id")
      .single();
    
    if (!existingAppointment) {
      return NextResponse.json({ error: "Appointment not found or access denied" }, { status: 404 });
    }
    
    const body = await request.json();
    const { status, start_time, end_time, action } = body;

    // Validate action
    if (!action || !["cancel", "reschedule"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'cancel' or 'reschedule'" },
        { status: 400 }
      );
    }

    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (action === "cancel") {
      updateData.status = "cancelled";
    } else if (action === "reschedule") {
      if (!start_time || !end_time) {
        return NextResponse.json(
          { error: "start_time and end_time are required for reschedule" },
          { status: 400 }
        );
      }
      updateData.status = "rescheduled";
      updateData.start_time = start_time;
      updateData.end_time = end_time;
    }

    // If status is explicitly provided, use it
    if (status) {
      updateData.status = status;
    }

    const { data, error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Appointment update error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update appointment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Appointment ${action}ed successfully`,
      data,
    });
  } catch (err) {
    console.error("Appointment API exception:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

