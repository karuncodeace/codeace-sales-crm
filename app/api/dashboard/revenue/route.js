import { supabaseServer } from "../../../../lib/supabase/serverClient";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    
    // TODO: Replace with actual database queries based on your schema
    // Mock data - replace with actual queries
    const data = {
      actualRevenue: [120, 138, 150, 165, 172, 190],
      forecast: [110, 130, 155, 170, 185, 200],
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    };

    return Response.json(data);
  } catch (error) {
    console.error("Revenue API Error:", error.message);
    return Response.json(
      { error: "Failed to fetch revenue data" },
      { status: 500 }
    );
  }
}

