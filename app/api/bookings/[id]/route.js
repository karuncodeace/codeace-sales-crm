import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../../lib/crm/auth";

// GET - Get a single booking by ID
export async function GET(request, { params }) {
  try {
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    // Use admin client to bypass RLS
    const supabase = supabaseAdmin();
    
    // Fetch the booking
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Booking GET error:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // If booking has a lead_id, fetch the lead details
    let lead = null;
    if (booking.lead_id) {
      const { data: leadData, error: leadError } = await supabase
        .from("leads_table")
        .select("*")
        .eq("id", booking.lead_id)
        .single();

      if (!leadError && leadData) {
        lead = leadData;
      }
    }

    return NextResponse.json({
      ...booking,
      lead,
    });
  } catch (err) {
    console.error("Booking GET exception:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
