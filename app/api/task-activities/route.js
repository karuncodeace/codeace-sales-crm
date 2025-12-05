import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role key for API routes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
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
    created_at: new Date().toISOString(),
  };

  // Add optional fields if provided
  if (connect_through) insertData.connect_through = connect_through;
  if (due_date) insertData.due_date = due_date;

    const { error } = await supabase
      .from("task_activities")
      .insert(insertData);

    if (error) {
      console.error("Task Activities API Error:", error);
      console.error("   - Code:", error.code);
      console.error("   - Message:", error.message);
      console.error("   - Details:", error.details);
      
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
    console.error("Task Activities API Exception:", err);
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
      .select("id, lead_id, activity, type, comments, connect_through, due_date, source, created_at")
      .eq("source", "user"); // Only fetch user activities

    if (leadId) {
      query = query.eq("lead_id", leadId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Task Activities API Error:", error);
      console.error("   - Code:", error.code);
      console.error("   - Message:", error.message);
      console.error("   - Details:", error.details);
      
      // Check if error contains HTML (Cloudflare/proxy error)
      const errorMessage = error.message || String(error);
      if (errorMessage.includes('<html>') || errorMessage.includes('cloudflare')) {
        console.error("⚠️ Detected HTML/Cloudflare error - Supabase connection issue");
        return Response.json([]); // Return empty array instead of error
      }
      
      return Response.json([]); // Return empty array on error
    }

    return Response.json(data || []);
  } catch (err) {
    console.error("Task Activities API Exception:", err);
    return Response.json([]); // Return empty array on exception
  }
}
