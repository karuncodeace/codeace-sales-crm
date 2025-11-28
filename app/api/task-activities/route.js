import { supabaseServer } from "../../../lib/supabase/serverClient";

export async function POST(request) {
  const supabase = await supabaseServer();
  const body = await request.json();

  const { lead_id, comments, activity_type } = body;

  if (!lead_id) {
    return Response.json({ error: "lead_id is required" }, { status: 400 });
  }

  if (!comments) {
    return Response.json({ error: "comments is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("task_activities")
    .insert({
      lead_id,
      comments,
      source: "user",
    })
    .select()
    .single();

  if (error) {
    console.error("Task Activities API Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, activity: data });
}

export async function GET(request) {
  const supabase = await supabaseServer();
  
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead_id");

  let query = supabase.from("task_activities").select("*");

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

