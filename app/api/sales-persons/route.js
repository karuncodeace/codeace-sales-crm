import { supabaseServer } from "../../../lib/supabase/serverClient";

export async function GET() {
  const supabase = await supabaseServer();
  
  // Get all users with role 'sales' or 'admin' from users table
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .in("role", ["sales", "admin"]);

  if (error) {
    console.error("Users API Error:", error.message);
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
    
    // Update the email in users table
    const { data, error } = await supabase
      .from("users")
      .update({ email: authEmail })
      .eq("id", salesPersonId)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating user email:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }
    
    console.log("✅ Updated user email:", { 
      id: salesPersonId, 
      newEmail: authEmail 
    });
    
    return Response.json({ success: true, data });
  } catch (error) {
    console.error("Sales Persons PATCH error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

