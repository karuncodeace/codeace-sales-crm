import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET → required for Cal.com Ping Test
export function GET() {
  return new Response("Cal.com Webhook OK", { status: 200 });
}

// POST → main webhook handler
export async function POST(req) {
  try {
    const body = await req.json();

    console.log("🔥 Incoming Webhook:", JSON.stringify(body, null, 2));

    // ----------------------------------------------------------
    // 1️⃣ HANDLE CAL.COM TEST EVENTS (Ping Test)
    // ----------------------------------------------------------
    if (body.type === "Test" || !body.booking) {
      console.log("🔔 Cal.com Ping/Test Event Received — ignoring safely");
      return NextResponse.json({ success: true, message: "Ping OK" });
    }

    // Extract booking object
    const booking = body.booking;

    // ----------------------------------------------------------
    // 2️⃣ Extract CRM-Relevant Fields
    // ----------------------------------------------------------
    const calEventId = booking.id;
    const title = booking.title ?? "Meeting";
    const status = body.event; // booking.created | booking.rescheduled | booking.canceled

    // Cal.com sometimes uses start/end OR startTime/endTime
    const startTime = booking.start ?? booking.startTime ?? null;
    const endTime = booking.end ?? booking.endTime ?? null;

    const attendeeName = booking.attendee?.name ?? null;
    const attendeeEmail = booking.attendee?.email ?? null;

    const lead_id = booking.metadata?.lead_id ?? null;
    const salesperson_id = booking.metadata?.salesperson_id ?? null;

    const joinUrl = booking.metadata?.videoCallUrl ?? null;
    const location = booking.location ?? null;

    // ----------------------------------------------------------
    // 3️⃣ Fetch Lead Name (for CRM task + appointment snapshot)
    // ----------------------------------------------------------
    let lead_name = null;

    if (lead_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("lead_name")
        .eq("id", lead_id)
        .single();

      lead_name = lead?.lead_name ?? null;
    }

    // ----------------------------------------------------------
    // 4️⃣ Handle Different Event Types
    // ----------------------------------------------------------

    // ---- CASE 1: booking.created ----
    if (status === "booking.created") {
      console.log("🟢 Handling booking.created");

      const { error: insertError } = await supabase
        .from("appointments")
        .insert({
          cal_event_id: calEventId,
          title,
          start_time: startTime,
          end_time: endTime,
          status,
          location,
          join_url: joinUrl,
          lead_id,
          lead_name,
          salesperson_id,
          attendee_name: attendeeName,
          attendee_email: attendeeEmail,
          raw_payload: body
        });

      if (insertError) {
        console.error("❌ Insert Error:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      // Update lead last activity
      if (lead_id) {
        await supabase
          .from("leads")
          .update({ last_activity: new Date().toISOString() })
          .eq("id", lead_id);
      }

      // Auto-create task (optional)
      if (lead_id && salesperson_id) {
        await supabase.from("tasks").insert({
          type: "Meeting",
          lead_id,
          sales_person_id: salesperson_id,
          due_datetime: startTime,
          priority: "Hot",
          comments: "Meeting booked automatically via Cal.com"
        });
      }
    }

    // ---- CASE 2: booking.rescheduled ----
    if (status === "booking.rescheduled") {
      console.log("🟡 Handling booking.rescheduled");

      await supabase
        .from("appointments")
        .update({
          start_time: startTime,
          end_time: endTime,
          status,
          raw_payload: body
        })
        .eq("cal_event_id", calEventId);
    }

    // ---- CASE 3: booking.canceled ----
    if (status === "booking.canceled") {
      console.log("🔴 Handling booking.canceled");

      await supabase
        .from("appointments")
        .update({
          status,
          raw_payload: body
        })
        .eq("cal_event_id", calEventId);
    }

    // ----------------------------------------------------------
    // 5️⃣ Success Response
    // ----------------------------------------------------------
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
