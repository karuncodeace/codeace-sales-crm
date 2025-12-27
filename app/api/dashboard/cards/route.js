import { supabaseServer } from "../../../../lib/supabase/serverClient";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    
    if (!supabase) {
      return Response.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }
    
    // Helper function to safely execute queries
    const safeQuery = async (queryFn, defaultValue) => {
      try {
        const result = await queryFn();
        if (result.error) {
          return defaultValue;
        }
        return result;
      } catch (error) {
        return defaultValue;
      }
    };
    
    // 1. Total leads from leads_table
    const { count: leadsGenerated = 0 } = await safeQuery(
      () => supabase.from("leads_table").select("*", { count: "exact", head: true }),
      { count: 0 }
    );
    
    // 2. First call done count from first_call_done field (may not exist)
    const firstCallDoneResult = await safeQuery(
      () => supabase.from("leads_table")
        .eq("first_call_done", true)
        .select("*", { count: "exact", head: true }),
      { count: 0 }
    );
    const firstCallDone = firstCallDoneResult.count ?? 0;
    
    // 3. Qualified leads count from status field
    const { count: qualifiedLeads = 0 } = await safeQuery(
      () => supabase.from("leads_table")
        .eq("status", "Qualified")
        .select("*", { count: "exact", head: true }),
      { count: 0 }
    );
    
    // 4. Meeting scheduled count from appointments table
    const { count: meetingScheduled = 0 } = await safeQuery(
      () => supabase.from("appointments").select("*", { count: "exact", head: true }),
      { count: 0 }
    );
    
    // 5. Fetch leads with total_score for conversion rate calculation
    const leadsForConversionResult = await safeQuery(
      () => supabase.from("leads_table").select("total_score"),
      { data: [] }
    );
    const leadsForConversion = leadsForConversionResult.data ?? [];
    
    // 6. Follow up calls count from status field
    const { count: followUpCalls = 0 } = await safeQuery(
      () => supabase.from("leads_table")
        .eq("status", "Follow-Up")
        .select("*", { count: "exact", head: true }),
      { count: 0 }
    );
    
    // 7. Proposals sent count from status field
    const { count: proposalsSent = 0 } = await safeQuery(
      () => supabase.from("leads_table")
        .eq("status", "Proposal")
        .select("*", { count: "exact", head: true }),
      { count: 0 }
    );
    
    // 8. Calculate conversion rate: percentage of leads with total_score > 20 out of 25
    let conversionRate = 0;
    if (leadsForConversion && leadsForConversion.length > 0) {
      const totalLeads = leadsForConversion.length;
      const convertedLeads = leadsForConversion.filter(lead => {
        const score = lead.total_score !== null && lead.total_score !== undefined 
          ? Number(lead.total_score) 
          : 0;
        return score > 20;
      }).length;
      
      conversionRate = totalLeads > 0 
        ? parseFloat(((convertedLeads / totalLeads) * 100).toFixed(1))
        : 0;
    }
    
    const data = {
      leadsGenerated: leadsGenerated || 0,
      firstCallDone: firstCallDone || 0,
      qualifiedLeads: qualifiedLeads || 0,
      meetingScheduled: meetingScheduled || 0,
      meetingConducted: 0, // Keep it 0 as requested
      followUpCalls: followUpCalls || 0,
      proposalsSent: proposalsSent || 0,
      conversionRate: conversionRate
    };

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { 
        error: "Failed to fetch cards data",
        message: error.message,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}








