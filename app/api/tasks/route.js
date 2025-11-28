import { supabaseServer } from "../../../lib/supabase/serverClient";

/* ---------------- GET ---------------- */
export async function GET(request) {
  const supabase = await supabaseServer();
  
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead_id");

  // Fetch tasks from tasks_table
  let query = supabase.from("tasks_table").select("*");

  // Filter by lead_id if provided
  if (leadId) {
    query = query.eq("lead_id", leadId);
  }

  // Order by due_datetime
  const { data, error } = await query.order("due_datetime", { ascending: true });

  if (error) {
    console.error("Tasks API Error:", error.message);
    return Response.json([]);
  }

  return Response.json(data || []);
}

/* ---------------- POST (Manual task create) ---------------- */
export async function POST(request) {
  const supabase = await supabaseServer();
  const body = await request.json();

  const { lead_id, sales_person_id, due_datetime, priority, comments, type } = body;

  if (!lead_id) return Response.json({ error: "lead_id is required" }, { status: 400 });
  if (!sales_person_id) return Response.json({ error: "sales_person_id is required" }, { status: 400 });
  if (!due_datetime) return Response.json({ error: "due_datetime is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("tasks_table")
    .insert({
      lead_id,
      sales_person_id,
      type: type || null,      // Trigger will generate title
      priority: priority || "Medium",
      comments: comments || null,
      due_datetime
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, task: data });
}

/* ---------------- PATCH ---------------- */
export async function PATCH(request) {
  const supabase = await supabaseServer();
  const body = await request.json();

  const { id, type, status, priority, due_datetime, comments } = body;

  if (!id) return Response.json({ error: "Task ID is required" }, { status: 400 });

  const updateData = {};

  if (type !== undefined) updateData.type = type;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (due_datetime !== undefined) updateData.due_datetime = due_datetime;
  if (comments !== undefined) updateData.comments = comments;

  const { data, error } = await supabase
    .from("tasks_table")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, task: data });
}

/* ---------------- DELETE ---------------- */
export async function DELETE(request) {
  const supabase = await supabaseServer();
  const { searchParams } = new URL(request.url);

  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Task ID is required" }, { status: 400 });

  const { error } = await supabase
    .from("tasks_table")
    .delete()
    .eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, message: "Task deleted successfully" });
}
