import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/serverClient";

export async function POST(request) {
  try {
    const body = await request.json();
    const { lead_id, lead_name, salesperson_id, meeting_url } = body;

    // Validate required fields
    if (!lead_id || !meeting_url) {
      return NextResponse.json(
        { error: "Missing required fields: lead_id, meeting_url" },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = await supabaseServer();

    // Insert booking click record into appointments table
    // Using a simplified structure for external booking clicks
    const insertData = {
      cal_event_id: `external-${lead_id}-${Date.now()}`, // Generate unique ID
      title: "15min Meeting",
      start_time: null, // Will be set when actually booked
      end_time: null,
      location: null,
      join_url: meeting_url,
      status: "pending", // Status is pending until actually booked
      lead_id: lead_id,
      lead_name: lead_name || null,
      attendee_name: lead_name || null,
      attendee_email: null,
      raw_payload: {
        type: "external_booking_click",
        meeting_url: meeting_url,
        clicked_at: new Date().toISOString(),
        salesperson_id: salesperson_id || null,
      },
    };

    // Only include salesperson_id if provided
    if (salesperson_id) {
      // Check if salesperson exists in sales_persons table
      const { data: salesPerson } = await supabase
        .from("sales_persons")
        .select("id")
        .eq("id", salesperson_id)
        .single();
      
      if (salesPerson) {
        insertData.salesperson_id = salesperson_id;
      } else {
        // Try to find by user_id if that column exists
        const { data: salesPersonByUserId } = await supabase
          .from("sales_persons")
          .select("id")
          .eq("user_id", salesperson_id)
          .single();
        
        if (salesPersonByUserId) {
          insertData.salesperson_id = salesPersonByUserId.id;
        }
        // If not found, leave it null (if foreign key allows)
      }
    }

    const { data, error } = await supabase
      .from("appointments")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: `Failed to save booking click: ${error.message}` },
        { status: 500 }
      );
    }

    console.log("Booking click saved successfully:", data);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Booking click API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

