import { supabaseServer } from "../../../../lib/supabase/serverClient";

export async function GET() {
  const supabase = await supabaseServer();
  
  // Get all sales persons from sales_persons table
  // This is used for dropdowns where we need to assign leads
  const { data, error } = await supabase
    .from("sales_persons")
    .select("id, full_name, user_id")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Sales Persons List API Error:", error.message);
    // Fallback: try to get from users table if sales_persons doesn't exist
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("id, name, email, role")
      .in("role", ["sales", "admin"])
      .order("name", { ascending: true });

    if (usersError) {
      return Response.json([]);
    }

    // Map users to sales_persons format
    return Response.json(
      (usersData || []).map((user) => ({
        id: user.id,
        full_name: user.name || user.email?.split("@")[0] || "Unknown",
        user_id: user.id,
      }))
    );
  }

  return Response.json(data || []);
}





