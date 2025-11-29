import { supabaseServer } from "../../../lib/supabase/serverClient";

export async function POST(request) {
  const supabase = await supabaseServer();
  const body = await request.json();

  const { lead_id, activity, type, comments, connect_through, due_date } = body;

  if (!lead_id) {
    return Response.json({ error: "lead_id is required" }, { status: 400 });
  }

  const insertData = {
    lead_id,
    activity: activity || "",
    type: type || "note",
    comments: comments || "",
    source: "user",
  };

  // Add optional fields if provided
  if (connect_through) insertData.connect_through = connect_through;
  if (due_date) insertData.due_date = due_date;

  const { error } = await supabase
    .from("task_activities")
    .insert(insertData);

  if (error) {
    console.error("Task Activities API Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}

export async function GET(request) {
  const supabase = await supabaseServer();
  
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead_id");

  let query = supabase
    .from("task_activities")
    .select("id, lead_id, activity, type, comments, connect_through, due_date, source, created_at")
    .eq("source", "user"); // Only fetch user activities

  if (leadId) {
    query = query.eq("lead_id", leadId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Task Activities API Error:", error.message);
    return Response.json([]);
  }

  return Response.json(data || []);
}
