import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Basic health/check endpoint (keep disabled for reads until needed)
export async function GET() {
  return NextResponse.json({ message: "Appointments POST available" });
}

// Insert a new appointment row into the appointments table.
export async function POST(request) {
  try {
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
      salesperson_id: body.salesperson_id ?? null,
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

