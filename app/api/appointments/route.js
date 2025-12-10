import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const leadId = searchParams.get("lead_id");

    let query = supabase
      .from("appointments")
      .select("*")
      .order("start_time", { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq("status", status);
    }

    // Filter by lead_id if provided
    if (leadId) {
      query = query.eq("lead_id", leadId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Appointments API Error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch appointments" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Appointments API Exception:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a new appointment (book)
export async function POST(request) {
  try {
    const body = await request.json();
    if (!body) {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    // Debug logging to trace insert issues
    console.log("📥 [appointments/POST] Incoming payload:", JSON.stringify(body, null, 2));
    console.log("🔑 [appointments/POST] Supabase env present:", {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    // Default status is "booked" unless explicitly provided
    const payload = {
      status: "booked",
      ...body,
      created_at: body?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("appointments")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("❌ [appointments/POST] Supabase insert error:", error);
      console.error("❌ [appointments/POST] Payload that failed:", JSON.stringify(payload, null, 2));
      return NextResponse.json(
        { error: error.message || "Failed to create appointment" },
        { status: 500 }
      );
    }

    console.log("✅ [appointments/POST] Appointment created:", data?.id || data);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("❌ [appointments/POST] Exception:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

