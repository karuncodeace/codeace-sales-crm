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

  // Order by created_at (newest first)
  const { data, error } = await query.order("created_at", { ascending: false });

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

  const { lead_id, sales_person_id, priority, comments, type, title, due_date } = body;

  if (!lead_id) return Response.json({ error: "lead_id is required" }, { status: 400 });

  const insertData = {
    lead_id,
    type: type || "Call",
    priority: priority || "Medium",
    comments: comments || null,
  };

  // Add optional fields
  if (sales_person_id) insertData.sales_person_id = sales_person_id;
  if (title) insertData.title = title;
  if (due_date) insertData.due_date = due_date;

  const { data, error } = await supabase
    .from("tasks_table")
    .insert(insertData)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, task: data });
}

/* ---------------- PATCH ---------------- */
export async function PATCH(request) {
  const supabase = await supabaseServer();
  const body = await request.json();

  const { id, lead_id, title, type, status, priority, comments, due_date } = body;

  // Either id or lead_id must be provided
  if (!id && !lead_id) return Response.json({ error: "Task ID or Lead ID is required" }, { status: 400 });

  const updateData = {};

  if (title !== undefined) updateData.title = title;
  if (type !== undefined) updateData.type = type;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (comments !== undefined) updateData.comments = comments;
  if (due_date !== undefined) updateData.due_date = due_date;

  let query = supabase.from("tasks_table").update(updateData);
  
  // Update by task id or by lead_id
  if (id) {
    query = query.eq("id", id);
  } else {
    query = query.eq("lead_id", lead_id);
  }

  const { data, error } = await query.select();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, task: data?.[0] || data });
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
