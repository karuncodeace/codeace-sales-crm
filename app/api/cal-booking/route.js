import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/serverClient";

export async function POST(request) {
  try {
    const body = await request.json();
    const { lead_id, lead_name, salesperson_id, booking_payload } = body;

    // Validate required fields
    if (!lead_id || !lead_name || !salesperson_id || !booking_payload) {
      return NextResponse.json(
        { error: "Missing required fields: lead_id, lead_name, salesperson_id, booking_payload" },
        { status: 400 }
      );
    }

    // Log the full payload for debugging
    console.log("Received booking payload:", JSON.stringify(booking_payload, null, 2));
    
    // Extract data from Cal.com payload - handle multiple possible structures
    const payload = booking_payload;
    
    // Try multiple paths to extract the booking data
    // Cal.com can send data in different formats depending on the event type
    const bookingData = payload?.booking || payload?.data || payload;
    
    // Extract cal_event_id from various possible locations
    let calEventId = bookingData?.id || 
                     bookingData?.uid || 
                     bookingData?.bookingId ||
                     bookingData?.bookingUid ||
                     payload?.id || 
                     payload?.uid ||
                     payload?.bookingId ||
                     payload?.bookingUid ||
                     null;
    
    // If cal_event_id is still null, generate a unique ID based on lead_id and start_time
    // This ensures we can still save the booking even if Cal.com doesn't provide an ID
    if (!calEventId && startTime) {
      // Generate a deterministic ID from lead_id and start_time
      const timestamp = new Date(startTime).getTime();
      calEventId = `cal-${lead_id}-${timestamp}`;
    }
    
    // Extract title
    const title = bookingData?.eventType?.title || 
                  bookingData?.title || 
                  bookingData?.eventType?.slug ||
                  payload?.eventType?.title || 
                  payload?.title || 
                  "15min Meeting";
    
    // Extract start_time - try multiple formats and date parsing
    // Cal.com can send dates in various formats: ISO strings, timestamps, Date objects
    let startTime = bookingData?.startTime ||
                    bookingData?.start ||
                    bookingData?.timeSlot?.start ||
                    bookingData?.startTimeUTC ||
                    bookingData?.startUTC ||
                    bookingData?.startDate ||
                    bookingData?.date ||
                    payload?.startTime ||
                    payload?.start ||
                    payload?.timeSlot?.start ||
                    payload?.startTimeUTC ||
                    payload?.startUTC ||
                    payload?.startDate ||
                    payload?.date ||
                    null;
    
    // If startTime is a Date object, convert to ISO string
    if (startTime instanceof Date) {
      startTime = startTime.toISOString();
    }
    // If it's a timestamp (number), convert to ISO string
    else if (typeof startTime === 'number') {
      startTime = new Date(startTime).toISOString();
    }
    // If it's already a string but not ISO format, try to parse it
    else if (typeof startTime === 'string' && !startTime.includes('T') && !startTime.includes('Z')) {
      const parsed = new Date(startTime);
      if (!isNaN(parsed.getTime())) {
        startTime = parsed.toISOString();
      }
    }
    
    // Extract end_time
    let endTime = bookingData?.endTime ||
                  bookingData?.end ||
                  bookingData?.timeSlot?.end ||
                  bookingData?.endTimeUTC ||
                  bookingData?.endUTC ||
                  bookingData?.endDate ||
                  payload?.endTime ||
                  payload?.end ||
                  payload?.timeSlot?.end ||
                  payload?.endTimeUTC ||
                  payload?.endUTC ||
                  payload?.endDate ||
                  null;
    
    // If endTime is a Date object, convert to ISO string
    if (endTime instanceof Date) {
      endTime = endTime.toISOString();
    }
    // If it's a timestamp (number), convert to ISO string
    else if (typeof endTime === 'number') {
      endTime = new Date(endTime).toISOString();
    }
    // If it's already a string but not ISO format, try to parse it
    else if (typeof endTime === 'string' && !endTime.includes('T') && !endTime.includes('Z')) {
      const parsed = new Date(endTime);
      if (!isNaN(parsed.getTime())) {
        endTime = parsed.toISOString();
      }
    }
    
    // Extract location
    const location = bookingData?.location ||
                     bookingData?.address ||
                     payload?.location ||
                     payload?.address ||
                     bookingData?.metadata?.location ||
                     payload?.metadata?.location ||
                     null;
    
    // Extract join_url (video call URL)
    const joinUrl = bookingData?.videoCallUrl ||
                    bookingData?.videoCall?.url ||
                    bookingData?.meetingUrl ||
                    payload?.videoCallUrl ||
                    payload?.videoCall?.url ||
                    payload?.meetingUrl ||
                    bookingData?.metadata?.videoCallUrl ||
                    payload?.metadata?.videoCallUrl ||
                    null;
    
    // Extract attendee information
    const attendee = bookingData?.attendees?.[0] || 
                     bookingData?.attendee ||
                     payload?.attendees?.[0] ||
                     payload?.attendee ||
                     null;
    
    const attendeeName = attendee?.name || 
                         attendee?.email?.split('@')[0] ||
                         lead_name;
    
    const attendeeEmail = attendee?.email || 
                          null;

    // Validate that we have at least start_time
    if (!startTime) {
      console.error("Missing start_time in payload. Full payload:", JSON.stringify(booking_payload, null, 2));
      return NextResponse.json(
        { 
          error: "Invalid booking payload: missing start_time",
          received_payload: booking_payload // Include payload in error for debugging
        },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = await supabaseServer();

    // Resolve salesperson_id - check if it exists in sales_persons table
    // If salesperson_id is an auth user ID, try to find matching sales_person record
    let resolvedSalespersonId = salesperson_id;
    
    if (salesperson_id) {
      // First, try to find if this ID exists in sales_persons table
      const { data: salesPerson } = await supabase
        .from("sales_persons")
        .select("id")
        .eq("id", salesperson_id)
        .single();
      
      // If not found, try to find by user_id or email if those columns exist
      if (!salesPerson) {
        // Try to find by user_id (if that column exists)
        const { data: salesPersonByUserId } = await supabase
          .from("sales_persons")
          .select("id")
          .eq("user_id", salesperson_id)
          .single();
        
        if (salesPersonByUserId) {
          resolvedSalespersonId = salesPersonByUserId.id;
        } else {
          // If still not found, set to null (if foreign key allows it)
          // or log a warning
          console.warn(`Salesperson ID ${salesperson_id} not found in sales_persons table. Setting to null.`);
          resolvedSalespersonId = null;
        }
      }
    }

    // Insert into appointments table - use upsert to handle duplicates
    const insertData = {
      cal_event_id: calEventId,
      title: title,
      start_time: startTime,
      end_time: endTime,
      location: location,
      join_url: joinUrl,
      status: "booked",
      lead_id: lead_id,
      lead_name: lead_name,
      attendee_name: attendeeName,
      attendee_email: attendeeEmail,
      raw_payload: booking_payload,
      updated_at: new Date().toISOString(),
    };

    // Only include salesperson_id if it's not null (if foreign key constraint requires it)
    if (resolvedSalespersonId) {
      insertData.salesperson_id = resolvedSalespersonId;
    }

    // Use upsert to handle duplicate cal_event_id - update if exists, insert if not
    // Only use upsert if cal_event_id exists, otherwise use regular insert
    let data, error;
    
    if (calEventId) {
      // Use upsert with conflict resolution on cal_event_id
      const result = await supabase
        .from("appointments")
        .upsert(insertData, {
          onConflict: "cal_event_id",
          ignoreDuplicates: false,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // If no cal_event_id, use regular insert
      // But first check if a booking with same lead_id and start_time already exists
      const { data: existing } = await supabase
        .from("appointments")
        .select("id")
        .eq("lead_id", lead_id)
        .eq("start_time", startTime)
        .single();
      
      if (existing) {
        // Update existing record
        const result = await supabase
          .from("appointments")
          .update(insertData)
          .eq("id", existing.id)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from("appointments")
          .insert(insertData)
          .select()
          .single();
        data = result.data;
        error = result.error;
      }
    }

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: `Failed to save booking: ${error.message}` },
        { status: 500 }
      );
    }

    console.log("Booking saved successfully:", data);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Cal booking API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

