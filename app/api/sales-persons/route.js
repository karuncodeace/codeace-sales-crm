import { supabaseServer } from "../../../lib/supabase/serverClient";

export async function GET() {
  const supabase = await supabaseServer();
  
  const { data, error } = await supabase
    .from("sales_persons")
    .select("*");

  if (error) {
    console.error("Sales Persons API Error:", error.message);
    return Response.json([]);
  }

  return Response.json(data || []);
}

// PATCH: Update sales person email to match auth email
export async function PATCH(request) {
  try {
    const supabase = await supabaseServer();
    
    // Get authenticated user's email
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user || !user.email) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    const authEmail = user.email.toLowerCase().trim();
    const body = await request.json();
    const { salesPersonId } = body;
    
    if (!salesPersonId) {
      return Response.json({ error: "salesPersonId is required" }, { status: 400 });
    }
    
    // Update the email in sales_persons table
    const { data, error } = await supabase
      .from("sales_persons")
      .update({ email: authEmail })
      .eq("id", salesPersonId)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating sales person email:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }
    
    console.log("✅ Updated sales person email:", { 
      id: salesPersonId, 
      oldEmail: "gauthamkrishna@codeace.com", 
      newEmail: authEmail 
    });
    
    return Response.json({ success: true, data });
  } catch (error) {
    console.error("Sales Persons PATCH error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

