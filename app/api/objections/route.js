import { supabaseServer } from "../../../lib/supabase/serverClient";

// GET: list objections (optionally filtered by lead_id)
export async function GET(request) {
  const supabase = await supabaseServer();
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead_id");

  let query = supabase
    .from("objections")
    .select("id, lead_id, objection_content, created_at")
    .order("created_at", { ascending: false });

  if (leadId) {
    query = query.eq("lead_id", leadId);
  }

  const { data, error } = await query;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data || []);
}

// POST: create objection
export async function POST(request) {
  const supabase = await supabaseServer();
  const body = await request.json();
  const { lead_id, objection_content } = body;

  if (!lead_id || !objection_content) {
    return Response.json({ error: "lead_id and objection_content are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("objections")
    .insert({
      lead_id,
      objection_content,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}

// DELETE: remove objection by id
export async function DELETE(request) {
  const supabase = await supabaseServer();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase.from("objections").delete().eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}




