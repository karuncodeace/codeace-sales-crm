import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role key for API routes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();

  const { lead_id, activity, type, comments, connect_through, due_date, notes_type, salesperson_id, assigned_to, source } = body;

  if (!lead_id) {
    return Response.json({ error: "lead_id is required" }, { status: 400 });
  }

  const insertData = {
    lead_id,
    activity: activity || "",
    type: type || "note",
    comments: comments || "",
    source: source || "user", // Allow frontend to specify source (e.g., 'ui' for UI-initiated activities)
    created_at: new Date().toISOString(),
  };

  // Add optional fields if provided
  if (connect_through) insertData.connect_through = connect_through;
  if (due_date) insertData.due_date = due_date;
  if (notes_type) insertData.notes_type = notes_type;
  // Use assigned_to if provided, otherwise fallback to salesperson_id for backward compatibility
  if (assigned_to) {
    insertData.assigned_to = assigned_to;
  } else if (salesperson_id) {
    insertData.assigned_to = salesperson_id; // Map salesperson_id to assigned_to
  }

    const { error } = await supabase
      .from("task_activities")
      .insert(insertData);

    if (error) {
      // Check if error contains HTML (Cloudflare/proxy error)
      const errorMessage = error.message || String(error);
      if (errorMessage.includes('<html>') || errorMessage.includes('cloudflare')) {
        return Response.json(
          { 
            error: "Database connection error. Please check Supabase configuration.",
            details: "The error response contains HTML, suggesting a connection or configuration issue."
          },
          { status: 500 }
        );
      }
      
      return Response.json({ error: error.message || "Failed to insert task activity" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("lead_id");

    let query = supabase
      .from("task_activities")
      .select("id, lead_id, activity, type, comments, connect_through, due_date, source, notes_type, created_at")
      .eq("source", "user"); // Only fetch user activities

    if (leadId) {
      query = query.eq("lead_id", leadId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      // Check if error contains HTML (Cloudflare/proxy error)
      const errorMessage = error.message || String(error);
      if (errorMessage.includes('<html>') || errorMessage.includes('cloudflare')) {
        return Response.json([]); // Return empty array instead of error
      }
      
      return Response.json([]); // Return empty array on error
    }

    return Response.json(data || []);
  } catch (err) {
    return Response.json([]); // Return empty array on exception
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, comments, activity, notes_type } = body;

    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const updateData = {};
    if (comments !== undefined) updateData.comments = comments;
    if (activity !== undefined) updateData.activity = activity;
    if (notes_type !== undefined) updateData.notes_type = notes_type;

    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    const { error } = await supabase
      .from("task_activities")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return Response.json({ error: error.message || "Failed to update task activity" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase.from("task_activities").delete().eq("id", id);

    if (error) {
      return Response.json({ error: error.message || "Failed to delete task activity" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
