import { NextResponse } from "next/server";
import { createBooking } from "../../../lib/bookings/createBooking";
import { supabaseServer } from "../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../lib/crm/auth";

// Get all bookings from the bookings table
export async function GET() {
  try {
    const supabase = await supabaseServer();
    
    // Get CRM user for authentication check only
    const crmUser = await getCrmUser();
    
    // If no CRM user found, return empty array instead of 403 to prevent loading loops
    if (!crmUser) {
      console.warn("No CRM user found - returning empty bookings array");
      return NextResponse.json([]);
    }
    
    // Fetch ALL bookings from the table (no filtering)
    console.log("🔍 Bookings API: Fetching ALL bookings", { 
      userId: crmUser.id, 
      role: crmUser.role,
      email: crmUser.email 
    });
    
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("start_time", { ascending: true });
    
    if (error) {
      console.error("Bookings GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log("✅ Bookings API: Query result", { 
      dataCount: data?.length || 0,
      returnedBookingIds: data?.map(b => ({ id: b.id, invitee_name: b.invitee_name, status: b.status })) || []
    });
    
    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Bookings GET exception:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const booking = await createBooking(body);

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("Bookings API error:", error);

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

