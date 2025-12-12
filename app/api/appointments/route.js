import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/serverClient";
import { getCrmUser, getFilteredQuery } from "../../../lib/crm/auth";

// Get appointments with role-based filtering
export async function GET() {
  try {
    const supabase = await supabaseServer();
    
    // Get CRM user for role-based filtering
    const crmUser = await getCrmUser();
    if (!crmUser) {
      return NextResponse.json({ error: "Not authorized for CRM" }, { status: 403 });
    }
    
    // Get filtered query based on role
    let query = getFilteredQuery(supabase, "appointments", crmUser);
    
    const { data, error } = await query.order("start_time", { ascending: true });
    
    if (error) {
      console.error("Appointments GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Appointments GET exception:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Insert a new appointment row into the appointments table.
export async function POST(request) {
  try {
    const supabase = await supabaseServer();
    
    // Get CRM user for role-based assignment
    const crmUser = await getCrmUser();
    if (!crmUser) {
      return NextResponse.json({ error: "Not authorized for CRM" }, { status: 403 });
    }
    
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const requiredFields = ["title", "start_time", "end_time", "lead_id"];
    const missing = requiredFields.filter((key) => !body[key]);
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing required field(s): ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // Determine salesperson_id based on role
    let finalSalespersonId = body.salesperson_id;
    if (crmUser.role === "salesperson") {
      // Salesperson: always assign to themselves
      finalSalespersonId = crmUser.id;
    } else if (crmUser.role === "admin") {
      // Admin: can assign to anyone (use provided salesperson_id or leave null)
      finalSalespersonId = body.salesperson_id || null;
    }

    // Normalize payload to match table columns
    const payload = {
      cal_event_id: body.cal_event_id ?? null,
      title: body.title,
      start_time: body.start_time,
      end_time: body.end_time,
      location: body.location ?? null,
      join_url: body.join_url ?? null,
      status: body.status ?? "booked",
      lead_id: body.lead_id,
      lead_name: body.lead_name ?? null,
      salesperson_id: finalSalespersonId,
      attendee_name: body.attendee_name ?? null,
      attendee_email: body.attendee_email ?? null,
      raw_payload: body.raw_payload ?? body, // keep original payload for audit
      created_at: body.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("appointments")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Appointments POST insert error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create appointment" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Appointments POST exception:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

