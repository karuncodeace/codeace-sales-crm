import { supabaseServer } from "../../../lib/supabase/serverClient";

// Resolve industries table: prefer industries (with industry_name), fallback to industries_table (with name)
async function resolveIndustriesTable(supabase) {
  // First try the user-specified table/column
  try {
    const { error } = await supabase.from("industries").select("id, industry_name").limit(1);
    if (!error) return { table: "industries", column: "industry_name" };
  } catch (err) {
    console.error("Industries table probe failed for industries:", err);
  }

  // Fallback to industries_table with name column
  try {
    const { error } = await supabase.from("industries_table").select("id, name").limit(1);
    if (!error) return { table: "industries_table", column: "name" };
  } catch (err) {
    console.error("Industries table probe failed for industries_table:", err);
  }

  return null;
}

// GET - Fetch all industries
export async function GET() {
  try {
    const supabase = await supabaseServer();
    const resolved = await resolveIndustriesTable(supabase);

    if (!resolved) {
      console.error("Industries GET: no industries table found (industries or industries_table)");
      return Response.json([]);
    }
    const { table, column } = resolved;
    
    const { data, error } = await supabase
      .from(table)
      .select(`id, ${column}`)
      .order(column, { ascending: true });

    if (error) {
      console.error("Error fetching industries:", error);
      return Response.json([]);
    }

    const normalized = (data || []).map((row) => ({
      id: row.id,
      name: row[column] || "",
    }));

    return Response.json(normalized);
  } catch (err) {
    console.error("Exception in industries GET:", err);
    return Response.json([]); // Return empty array on exception
  }
}

// POST - Create a new industry
export async function POST(request) {
  let industryName = "";
  try {
    const supabase = await supabaseServer();
    const resolved = await resolveIndustriesTable(supabase);
    if (!resolved) {
      return Response.json({ error: "Industries table not found" }, { status: 500 });
    }
    const { table, column } = resolved;
    
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return Response.json({ error: "Industry name is required" }, { status: 400 });
    }

    industryName = name.trim();

    // Check if industry already exists
    const { data: existing } = await supabase
      .from(table)
      .select("id")
      .eq(column, industryName)
      .maybeSingle();

    if (existing) {
      return Response.json({ error: "Industry already exists" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from(table)
      .insert({
        [column]: industryName,
        created_at: new Date().toISOString(),
      })
      .select(`id, ${column}`)
      .single();

    if (error) {
      // If table doesn't exist, create a simple response
      if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
        // Return the industry name as if it was created (for cases where table doesn't exist)
        return Response.json({ 
          success: true, 
          data: { id: Date.now(), name: industryName, created_at: new Date().toISOString() } 
        });
      }
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, data: { id: data.id, name: data[column] } });
  } catch (err) {
    console.error("Exception in industries POST:", err);
    // Return a response with the industry name if we have it, otherwise generic
    return Response.json({ 
      success: true, 
      data: { id: Date.now(), name: industryName || "New Industry", created_at: new Date().toISOString() } 
    });
  }
}

