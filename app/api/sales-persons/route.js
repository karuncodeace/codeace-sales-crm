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

