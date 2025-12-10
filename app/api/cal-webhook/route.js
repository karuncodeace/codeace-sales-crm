import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with error handling
let supabase;
try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase environment variables");
    console.error("  - NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
    console.error("  - SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "✅ Set" : "❌ Missing");
  }
  
  supabase = createClient(supabaseUrl, supabaseKey);
} catch (err) {
  console.error("❌ Failed to initialize Supabase client:", err);
}

// GET → required for Cal.com Ping Test
export function GET() {
  return new Response("Cal.com Webhook OK", { status: 200 });
}

// POST → main webhook handler (Cal.com v3 format)
export async function POST(req) {
  try {
    const body = await req.json();

    console.log("🔥 Incoming Cal.com v3 Webhook:");
    console.log(JSON.stringify(body, null, 2));

    // ----------------------------------------------------------
    // 1️⃣ HANDLE CAL.COM TEST EVENTS (Ping Test)
    // ----------------------------------------------------------
    if (!body.triggerEvent || !body.payload) {
      console.log("🔔 Cal.com Ping/Test Event Received — ignoring safely");
      return NextResponse.json({ success: true, message: "Ping OK" }, { status: 200 });
    }

    // ----------------------------------------------------------
    // 2️⃣ Extract Event Type and Payload (Cal.com v3 format)
    // ----------------------------------------------------------
    const triggerEvent = body.triggerEvent; // BOOKING_CREATED, BOOKING_CANCELLED, etc.
    const payload = body.payload || {};
    const createdAt = body.createdAt || new Date().toISOString();

    console.log("📋 Webhook Event Details:");
    console.log("  - triggerEvent:", triggerEvent);
    console.log("  - createdAt:", createdAt);
    console.log("  - payload keys:", Object.keys(payload));

    // ----------------------------------------------------------
    // 3️⃣ Extract Fields from Payload (with null checks)
    // ----------------------------------------------------------
    const responses = payload.responses || {};
    const metadata = payload.metadata || {};
    const customInputs = payload.customInputs || {};

    // Extract attendee information
    const attendeeEmail = responses.email?.value || 
                          responses.attendeeEmail?.value || 
                          customInputs.email?.value ||
                          null;
    
    const attendeeName = responses.name?.value || 
                        responses.attendeeName?.value || 
                        customInputs.name?.value ||
                        null;

    // Extract lead_id (string identifier from leads.text) and salesperson_id
    let lead_id = responses.lead_id?.value || 
                  responses.leadId?.value ||
                  customInputs.lead_id?.value ||
                  customInputs.leadId?.value ||
                  body?.lead_id ||
                  body?.leadId ||
                  null;
    
    const salesperson_id = responses.salesperson_id?.value || 
                          responses.salespersonId?.value ||
                          customInputs.salesperson_id?.value ||
                          customInputs.salespersonId?.value ||
                          null;

    // Extract timing information
    const startTime = payload.startTime || null;
    const endTime = payload.endTime || null;

    // Extract join URL and other metadata
    const joinUrl = metadata.videoCallUrl || 
                   metadata.videoCall?.url ||
                   payload.videoCallUrl ||
                   null;

    const location = payload.location || 
                    metadata.location ||
                    null;

    const status = payload.status || "ACCEPTED";
    const calEventId = payload.uid ||
                      payload.bookingId ||
                      payload.id ||
                      `cal-${Date.now()}`;

    console.log("📋 Extracted Fields:");
    console.log("  - lead_id:", lead_id);
    console.log("  - salesperson_id:", salesperson_id);
    console.log("  - attendee_email:", attendeeEmail);
    console.log("  - attendee_name:", attendeeName);
    console.log("  - start_time:", startTime);
    console.log("  - end_time:", endTime);
    console.log("  - join_url:", joinUrl);
    console.log("  - status:", status);
    console.log("  - cal_event_id:", calEventId);

    // ----------------------------------------------------------
    // 4️⃣ Fetch Lead Name and Resolve Salesperson ID (if exists)
    // ----------------------------------------------------------
    let lead_name = responses.lead_name?.value || responses.name?.value || attendeeName || null;
    let resolvedSalespersonId = salesperson_id;

    if (lead_id) {
      try {
        const { data: lead, error: leadError } = await supabase
          .from("leads")
          .select("text, lead_name")
          .eq("text", lead_id)
          .single();

        if (!leadError && lead) {
          lead_name = lead.lead_name || lead_name || null;
          console.log("  - lead_name (from DB):", lead_name);
        } else {
          console.log("  - lead_name: Not found in database");
        }
      } catch (err) {
        console.log("  - lead_name: Error fetching from DB:", err.message);
      }
    }

    // Resolve salesperson_id - check if it exists in sales_persons table
    if (salesperson_id) {
      try {
        // First, try to find if this ID exists directly in sales_persons table
        const { data: salesPerson, error: salesPersonError } = await supabase
          .from("sales_persons")
          .select("id")
          .eq("id", salesperson_id)
          .single();
        
        if (salesPersonError || !salesPerson) {
          // If not found, try to find by user_id (if that column exists)
          const { data: salesPersonByUserId, error: userIdError } = await supabase
            .from("sales_persons")
            .select("id")
            .eq("user_id", salesperson_id)
            .single();
          
          if (!userIdError && salesPersonByUserId) {
            resolvedSalespersonId = salesPersonByUserId.id;
            console.log("  - salesperson_id resolved by user_id:", resolvedSalespersonId);
          } else {
            // If still not found, set to null (if foreign key allows it)
            console.log("  - salesperson_id not found in sales_persons table, setting to null");
            resolvedSalespersonId = null;
          }
        } else {
          console.log("  - salesperson_id exists in sales_persons table:", resolvedSalespersonId);
        }
      } catch (err) {
        console.log("  - Error resolving salesperson_id:", err.message);
        resolvedSalespersonId = null;
      }
    }

    // ----------------------------------------------------------
    // 5️⃣ Handle Different Event Types
    // ----------------------------------------------------------

    // ---- CASE 1: BOOKING_CREATED ----
    if (triggerEvent === "BOOKING_CREATED" || triggerEvent === "BOOKING.CREATED") {
      console.log("🟢 Handling BOOKING_CREATED");

      // Determine final status
      const appointmentStatus = (status === "ACCEPTED" || status === "CONFIRMED") ? "booked" : "pending";

      // First, check if there's an existing "pending" appointment for this lead
      let existingPendingAppointment = null;
      
      if (lead_id) {
        try {
          const { data: pendingAppointments, error: searchError } = await supabase
            .from("appointments")
            .select("*")
            .eq("lead_id", lead_id)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1);
          
          if (searchError) {
            console.error("❌ Error searching for pending appointments:", searchError);
          } else {
            console.log(`🔍 Searching for pending appointments with lead_id: ${lead_id}`);
            console.log(`   Found ${pendingAppointments?.length || 0} pending appointment(s)`);
            
            if (pendingAppointments && pendingAppointments.length > 0) {
              existingPendingAppointment = pendingAppointments[0];
              console.log("📝 Found existing pending appointment, will update it:", existingPendingAppointment.id);
            }
          }
        } catch (err) {
          console.error("❌ Error in pending appointment search:", err);
        }
      }

      // Prepare appointment data (lead_id maps to leads.text)
      const appointmentData = {
        cal_event_id: calEventId,
        title: payload.title || payload.eventTitle || payload.type || "Meeting",
        start_time: startTime,
        end_time: endTime,
        status: appointmentStatus,
        location: location,
        join_url: joinUrl,
        lead_id: lead_id,
        lead_name: lead_name,
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        raw_payload: body,
        updated_at: new Date().toISOString(),
      };

      // Only include salesperson_id if it's resolved and exists
      if (resolvedSalespersonId) {
        appointmentData.salesperson_id = resolvedSalespersonId;
      }

      // If lead_id is still missing, try to resolve by attendee email/name
      if (!appointmentData.lead_id && (attendeeEmail || attendeeName)) {
        try {
          // First try email match (exact on email)
          if (attendeeEmail) {
            const { data: leadByEmail, error: leadByEmailError } = await supabase
              .from("leads")
              .select("text, lead_name, email")
              .or(`email.eq.${attendeeEmail}`)
              .maybeSingle();

            if (!leadByEmailError && leadByEmail?.text) {
              appointmentData.lead_id = leadByEmail.text;
              appointmentData.lead_name = leadByEmail.lead_name || appointmentData.lead_name;
              console.log("  - lead_id resolved by attendee_email:", appointmentData.lead_id);
            }
          }

          // If still missing, try lead_name exact match
          if (!appointmentData.lead_id && attendeeName) {
            const { data: leadByName, error: leadByNameError } = await supabase
              .from("leads")
              .select("text, lead_name")
              .or(`lead_name.eq.${attendeeName}`)
              .maybeSingle();

            if (!leadByNameError && leadByName?.text) {
              appointmentData.lead_id = leadByName.text;
              appointmentData.lead_name = leadByName.lead_name || appointmentData.lead_name;
              console.log("  - lead_id resolved by attendee_name:", appointmentData.lead_id);
            }
          }
        } catch (resolveErr) {
          console.log("  - lead_id resolution attempt failed:", resolveErr.message);
        }
      }

      // Remove null values that might cause issues (except for optional fields)
      Object.keys(appointmentData).forEach(key => {
        if (appointmentData[key] === null && key !== 'salesperson_id' && key !== 'location') {
          delete appointmentData[key];
        }
      });

      if (!appointmentData.lead_id) {
        console.error("❌ lead_id still missing after resolution attempts. Attendee email:", attendeeEmail, "attendee name:", attendeeName);
      }

      // Update existing pending appointment or insert new one
      if (existingPendingAppointment) {
        console.log("📝 Updating existing pending appointment:", existingPendingAppointment.id);
        
        const { data: updatedData, error: updateError } = await supabase
          .from("appointments")
          .update(appointmentData)
          .eq("id", existingPendingAppointment.id)
          .select()
          .single();

        if (updateError) {
          console.error("❌ Update Error:", updateError);
          return NextResponse.json(
            { error: `Failed to update appointment: ${updateError.message}` },
            { status: 500 }
          );
        }

        console.log("✅ Successfully updated pending appointment to booked:", existingPendingAppointment.id);
        console.log("   Updated data:", JSON.stringify(updatedData, null, 2));
      } else {
        console.log("📝 Creating new appointment");
        console.log("   Appointment data:", JSON.stringify(appointmentData, null, 2));
        
        // Validate required fields before insert
        if (!appointmentData.lead_id) {
          console.error("❌ Missing required field: lead_id");
          return NextResponse.json(
            { error: "Missing required field: lead_id" },
            { status: 400 }
          );
        }

        if (!appointmentData.start_time) {
          console.error("❌ Missing required field: start_time");
          return NextResponse.json(
            { error: "Missing required field: start_time" },
            { status: 400 }
          );
        }

        // Check if Supabase client is initialized
        if (!supabase) {
          console.error("❌ Supabase client not initialized");
          return NextResponse.json(
            { error: "Database connection not available. Check environment variables." },
            { status: 500 }
          );
        }
        
        // Log what we're about to insert
        console.log("📤 Attempting Supabase insert...");
        console.log("   - Table: appointments");
        console.log("   - Data keys:", Object.keys(appointmentData));
        
        try {
          const { data: insertedData, error: insertError } = await supabase
            .from("appointments")
            .insert(appointmentData)
            .select()
            .single();

          if (insertError) {
            console.error("❌ Insert Error Details:");
            console.error("   - Code:", insertError.code);
            console.error("   - Message:", insertError.message);
            console.error("   - Details:", insertError.details);
            console.error("   - Hint:", insertError.hint);
            console.error("   - Full Error Object:", JSON.stringify(insertError, null, 2));
            
            // Check if error message contains HTML (Cloudflare/proxy error)
            const errorMessage = insertError.message || String(insertError) || "Unknown error";
            if (errorMessage.includes('<html>') || errorMessage.includes('cloudflare') || errorMessage.includes('500 Internal Server Error')) {
              console.error("⚠️ Detected HTML/Cloudflare error - this suggests a connection or configuration issue");
              return NextResponse.json(
                { 
                  error: "Database connection error. The error response contains HTML, suggesting a Supabase URL or network configuration issue.",
                  suggestion: "Please check: 1) NEXT_PUBLIC_SUPABASE_URL is correct, 2) SUPABASE_SERVICE_ROLE_KEY is valid, 3) Network connectivity to Supabase"
                },
                { status: 500 }
              );
            }
            
            return NextResponse.json(
              { 
                error: `Failed to insert appointment: ${errorMessage}`,
                code: insertError.code,
                details: insertError.details,
                hint: insertError.hint
              },
              { status: 500 }
            );
          }

          console.log("✅ Successfully created new appointment:", insertedData?.id);
          console.log("   Inserted data:", JSON.stringify(insertedData, null, 2));
        } catch (insertException) {
          console.error("❌ Exception during Supabase insert:");
          console.error("   - Type:", insertException.constructor.name);
          console.error("   - Message:", insertException.message);
          console.error("   - Stack:", insertException.stack);
          return NextResponse.json(
            { 
              error: `Exception during database insert: ${insertException.message}`,
              type: insertException.constructor.name
            },
            { status: 500 }
          );
        }
      }

      // Update lead last activity (if lead_id exists)
      if (lead_id) {
        try {
          await supabase
            .from("leads")
            .update({ last_activity: new Date().toISOString() })
            .eq("id", lead_id);
          console.log("✅ Updated lead last_activity for:", lead_id);
        } catch (err) {
          console.log("⚠️ Could not update lead last_activity:", err.message);
        }
      }

      // Auto-create task (if lead_id and resolvedSalespersonId exist)
      if (lead_id && resolvedSalespersonId && startTime) {
        try {
          await supabase.from("tasks").insert({
            type: "Meeting",
            lead_id: lead_id,
            sales_person_id: resolvedSalespersonId,
            due_datetime: startTime,
            priority: "Hot",
            comments: "Meeting booked automatically via Cal.com"
          });
          console.log("✅ Auto-created task for meeting");
        } catch (err) {
          console.log("⚠️ Could not auto-create task:", err.message);
        }
      }

      return NextResponse.json(
        { 
          success: true, 
          message: "Appointment processed successfully",
          event: triggerEvent
        },
        { status: 200 }
      );
    }

    // ---- CASE 2: BOOKING_CANCELLED ----
    if (triggerEvent === "BOOKING_CANCELLED" || triggerEvent === "BOOKING.CANCELLED") {
      console.log("🔴 Handling BOOKING_CANCELLED");

      // Try to find appointment by cal_event_id or lead_id
      let updateQuery = supabase
        .from("appointments")
        .update({
          status: "cancelled",
          raw_payload: body,
          updated_at: new Date().toISOString(),
        });

      if (calEventId && calEventId !== `cal-${Date.now()}`) {
        updateQuery = updateQuery.eq("cal_event_id", calEventId);
        console.log("🔍 Updating appointment by cal_event_id:", calEventId);
      } else if (lead_id) {
        updateQuery = updateQuery.eq("lead_id", lead_id).order("created_at", { ascending: false }).limit(1);
        console.log("🔍 Updating appointment by lead_id:", lead_id);
      } else {
        console.log("⚠️ No cal_event_id or lead_id found, cannot update appointment");
        return NextResponse.json(
          { success: true, message: "Cancellation received but no appointment found to update" },
          { status: 200 }
        );
      }

      const { data: updatedData, error: updateError } = await updateQuery.select().single();

      if (updateError) {
        console.error("❌ Update Error (cancellation):", updateError);
        return NextResponse.json(
          { error: `Failed to update appointment: ${updateError.message}` },
          { status: 500 }
        );
      }

      if (updatedData) {
        console.log("✅ Successfully cancelled appointment:", updatedData.id);
      } else {
        console.log("⚠️ No appointment found to cancel");
      }

      return NextResponse.json(
        { 
          success: true, 
          message: "Appointment cancelled successfully",
          event: triggerEvent
        },
        { status: 200 }
      );
    }

    // ---- CASE 3: Other Events (BOOKING_RESCHEDULED, etc.) ----
    console.log("🟡 Handling other event type:", triggerEvent);

    // For rescheduled or other events, try to update if we have the data
    if (lead_id || calEventId) {
      const updateData = {
        raw_payload: body,
        updated_at: new Date().toISOString(),
      };

      if (startTime) updateData.start_time = startTime;
      if (endTime) updateData.end_time = endTime;

      let updateQuery = supabase.from("appointments").update(updateData);

      if (calEventId && calEventId !== `cal-${Date.now()}`) {
        updateQuery = updateQuery.eq("cal_event_id", calEventId);
      } else if (lead_id) {
        updateQuery = updateQuery.eq("lead_id", lead_id).order("created_at", { ascending: false }).limit(1);
      }

      const { error: updateError } = await updateQuery;

      if (updateError) {
        console.error("❌ Update Error:", updateError);
      } else {
        console.log("✅ Updated appointment for event:", triggerEvent);
      }
    }

    // ----------------------------------------------------------
    // 6️⃣ Success Response
    // ----------------------------------------------------------
    return NextResponse.json(
      { 
        success: true, 
        message: `Event ${triggerEvent} processed`,
        event: triggerEvent
      },
      { status: 200 }
    );

  } catch (err) {
    console.error("❌ Webhook Error:", err);
    console.error("Error stack:", err.stack);
    return NextResponse.json(
      { 
        error: err.message || "Internal server error",
        details: process.env.NODE_ENV === "development" ? err.stack : undefined
      },
      { status: 500 }
    );
  }
}
