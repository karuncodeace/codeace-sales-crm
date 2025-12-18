import { supabaseServer } from "../../../../lib/supabase/serverClient";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    
    // TODO: Replace with actual database queries based on your schema
    // For now, returning mock data structure that can be easily replaced
    
    // Example: If you have a deals/opportunities table
    // const { data: deals, error } = await supabase
    //   .from('deals_table')
    //   .select('*')
    //   .order('created_at', { ascending: true });
    
    // Mock data - replace with actual queries
    const data = {
      closedWon: [32, 45, 38, 60, 72, 81, 95],
      newPipeline: [58, 62, 70, 78, 84, 90, 102],
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    };

    return Response.json(data);
  } catch (error) {
    console.error("Weekly Sales API Error:", error.message);
    return Response.json(
      { error: "Failed to fetch weekly sales data" },
      { status: 500 }
    );
  }
}











