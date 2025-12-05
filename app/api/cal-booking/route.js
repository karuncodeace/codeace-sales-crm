import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/serverClient";

export async function POST(request) {
  try {
    const body = await request.json();
    const { lead_id, lead_name, salesperson_id, booking_payload } = body;

    // Validate required fields
    if (!lead_id || !lead_name || !salesperson_id || !booking_payload) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: lead_id, lead_name, salesperson_id, booking_payload",
        },
        { status: 400 }
      );
    }

    console.log(
      "Received booking payload:",
      JSON.stringify(booking_payload, null, 2)
    );

    const payload = booking_payload;
    const p = payload?.payload || payload; // Cal.com formats differ

    // -------------------------------
    // Extract Basic Information
    // -------------------------------

    const calEventId =
      p.uid ||
      p.id ||
      p.bookingId ||
      p.bookingUid ||
      payload?.uid ||
      payload?.id ||
      null;

    let startTime = p.startTime || p.start || null;
    let endTime = p.endTime || p.end || null;

    if (!startTime) {
      return NextResponse.json(
        { error: "Missing start_time in payload", received_payload: payload },
        { status: 400 }
      );
    }

    // Ensure ISO format
    startTime = new Date(startTime).toISOString();
    endTime = endTime ? new Date(endTime).toISOString() : null;

    const location =
      p.location ||
      p.address ||
      p.metadata?.location ||
      payload?.location ||
      null;

    const joinUrl =
      p.metadata?.videoCallUrl ||
      p.videoCallUrl ||
      p.videoCall?.url ||
      p.meetingUrl ||
      null;

    // -------------------------------
    // Extract Attendee
    // -------------------------------

    const attendee =
      p.attendees?.[0] ||
      payload?.attendees?.[0] ||
      p.attendee ||
      null;

    const attendeeName =
      attendee?.name || lead_name || attendee?.email?.split("@")[0];
    const attendeeEmail = attendee?.email || null;

    // -------------------------------
    // Custom Title
    // -------------------------------

    const customTitle = `Sales call with ${attendeeName}`;

    // -------------------------------
    // Resolve Salesperson
    // -------------------------------

    const supabase = await supabaseServer();
    let resolvedSalespersonId = salesperson_id;

    const { data: salesPerson } = await supabase
      .from("sales_persons")
      .select("id")
      .eq("id", salesperson_id)
      .single();

    if (!salesPerson) {
      const { data: salesPersonByUserId } = await supabase
        .from("sales_persons")
        .select("id")
        .eq("user_id", salesperson_id)
        .single();

      resolvedSalespersonId = salesPersonByUserId
        ? salesPersonByUserId.id
        : null;
    }

    // -------------------------------
    // Prepare Insert Data
    // -------------------------------

    const insertData = {
      cal_event_id: calEventId,
      title: customTitle,
      start_time: startTime,
      end_time: endTime,
      location,
      join_url: joinUrl,
      status: "booked",
      lead_id,
      lead_name,
      attendee_name: attendeeName,
      attendee_email: attendeeEmail,
      raw_payload: payload,
      updated_at: new Date().toISOString(),
    };

    if (resolvedSalespersonId) {
      insertData.salesperson_id = resolvedSalespersonId;
    }

    // -------------------------------
    // Insert / Update Logic
    // -------------------------------

    let finalData, dbError;

    if (calEventId) {
      // Upsert based on cal_event_id
      const result = await supabase
        .from("appointments")
        .upsert(insertData, { onConflict: "cal_event_id" })
        .select()
        .single();
      finalData = result.data;
      dbError = result.error;
    } else {
      // Handle without cal_event_id
      const { data: existing } = await supabase
        .from("appointments")
        .select("id")
        .eq("lead_id", lead_id)
        .eq("start_time", startTime)
        .single();

      if (existing) {
        const result = await supabase
          .from("appointments")
          .update(insertData)
          .eq("id", existing.id)
          .select()
          .single();
        finalData = result.data;
        dbError = result.error;
      } else {
        const result = await supabase
          .from("appointments")
          .insert(insertData)
          .select()
          .single();
        finalData = result.data;
        dbError = result.error;
      }
    }

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      return NextResponse.json(
        { error: `Failed to save booking: ${dbError.message}` },
        { status: 500 }
      );
    }

    console.log("Booking saved successfully:", finalData);

    return NextResponse.json({ success: true, data: finalData });
  } catch (error) {
    console.error("Cal booking API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
