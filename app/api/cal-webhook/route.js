import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // MUST use service role for webhooks
);

export async function POST(req) {
  try {
    // 1. Read webhook body
    const body = await req.json();

    console.log("🔥 Cal.com Webhook Received:", body);

    // 2. Extract Cal.com event data
    const calEventId = body?.booking?.id;
    const title = body?.booking?.title;
    const startTime = body?.booking?.startTime;
    const endTime = body?.booking?.endTime;
    const status = body?.event; // booked / rescheduled / canceled
    const joinUrl = body?.booking?.metadata?.videoCallUrl;
    const location = body?.booking?.location;

    // 3. Extract attendee details
    const attendeeName = body?.booking?.attendee?.name;
    const attendeeEmail = body?.booking?.attendee?.email;

    // 4. CRM-specific fields passed through booking link
    const lead_id = body?.booking?.metadata?.lead_id || null;
    const salesperson_id = body?.booking?.metadata?.salesperson_id || null;

    // 5. Fetch lead name (since tasks & appointment titles need it)
    let lead_name = null;
    if (lead_id) {
      const { data: lead } = await supabase
        .from("leads_table")
        .select("lead_name")
        .eq("id", lead_id)
        .single();

      lead_name = lead?.lead_name || null;
    }

    // 6. Insert appointment into database
    const { error: insertError } = await supabase.from("appointments").insert({
      cal_event_id: calEventId,
      title,
      start_time: startTime,
      end_time: endTime,
      location,
      join_url: joinUrl,
      status,
      lead_id,
      lead_name,
      salesperson_id,
      attendee_name: attendeeName,
      attendee_email: attendeeEmail,
      raw_payload: body
    });

    if (insertError) {
      console.error("❌ Error inserting appointment:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 7. Update lead's last activity
    if (lead_id) {
      await supabase
        .from("leads")
        .update({ last_activity: new Date().toISOString() })
        .eq("id", lead_id);
    }

    // 8. (OPTIONAL) Auto-create a task for meeting
    if (lead_id && salesperson_id) {
      await supabase.from("tasks").insert({
        type: "Meeting",
        lead_id,
        sales_person_id: salesperson_id,
        priority: "Hot", // or fetch from leads table
        due_datetime: startTime, // meeting time
        comments: "Meeting scheduled automatically via Cal.com"
      });
    }

    console.log("✅ Appointment saved successfully");

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("❌ Webhook Processing Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
