import { supabaseServer } from "../../../../lib/supabase/serverClient";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    
    // TODO: Replace with actual database queries based on your schema
    // Example: Group activities by sales person
    // const { data, error } = await supabase
    //   .from('activities_table')
    //   .select('*')
    //   .then(group by assigned_to/sales_person
    
    // Mock data - replace with actual queries
    const data = {
      calls: [145, 132, 168],
      meetings: [32, 28, 45],
      conversions: [18, 15, 24],
      salesPersons: ["Sarah", "John", "Emily"]
    };

    return Response.json(data);
  } catch (error) {
    console.error("Sales Person Performance API Error:", error.message);
    return Response.json(
      { error: "Failed to fetch sales person performance data" },
      { status: 500 }
    );
  }
}









