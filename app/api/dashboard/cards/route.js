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
    
    // Calculate date range for past 1 week
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    
    // Format dates for Supabase query (ISO format)
    const oneWeekAgoStr = oneWeekAgo.toISOString();
    const todayStr = today.toISOString();
    
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
    
    // 1. Total leads from leads_table (past 1 week)
    const { count: leadsGenerated = 0 } = await safeQuery(
      () => supabase.from("leads_table")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneWeekAgoStr)
        .lte("created_at", todayStr),
      { count: 0 }
    );
    
    // 2. First call done count from first_call_done field
    // Check for "Done" string value - count all leads with first_call_done = "Done"
    // Note: Counting all leads regardless of creation date since first_call_done can be set at any time
    const firstCallDoneResult = await safeQuery(
      () => supabase.from("leads_table")
        .eq("first_call_done", "Done")
        .select("*", { count: "exact", head: true }),
      { count: 0 }
    );
    const firstCallDone = firstCallDoneResult.count ?? 0;
    
    // 3. Qualified leads count from lead_qualification field (past 1 week)
    // Check for "qualified" or "Qualified" (case-insensitive)
    const qualifiedLeadsResult = await safeQuery(
      () => supabase.from("leads_table")
        .select("lead_qualification")
        .gte("created_at", oneWeekAgoStr)
        .lte("created_at", todayStr),
      { data: [] }
    );
    
    let qualifiedLeads = 0;
    if (qualifiedLeadsResult.data && Array.isArray(qualifiedLeadsResult.data)) {
      qualifiedLeads = qualifiedLeadsResult.data.filter(lead => {
        const qualification = String(lead.lead_qualification || "").toLowerCase();
        return qualification.includes("qualified");
      }).length;
    }
    
    // 4. Meeting scheduled count from meeting_status field (past 1 week)
    const { count: meetingScheduled = 0 } = await safeQuery(
      () => supabase.from("leads_table")
        .eq("meeting_status", "Scheduled")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneWeekAgoStr)
        .lte("created_at", todayStr),
      { count: 0 }
    );
    
    // 5. Meeting conducted count from meeting_status field (past 1 week)
    const { count: meetingConducted = 0 } = await safeQuery(
      () => supabase.from("leads_table")
        .eq("meeting_status", "Completed")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneWeekAgoStr)
        .lte("created_at", todayStr),
      { count: 0 }
    );
    
    // 6. Proposals sent count from status field (past 1 week)
    // Check for "Follow up" status
    const { count: proposalsSent = 0 } = await safeQuery(
      () => supabase.from("leads_table")
        .eq("status", "Follow up")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneWeekAgoStr)
        .lte("created_at", todayStr),
      { count: 0 }
    );
    
    // 7. Follow up calls count from status field (past 1 week)
    // Check for "Follow up" status
    const { count: followUpCalls = 0 } = await safeQuery(
      () => supabase.from("leads_table")
        .eq("status", "Follow up")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneWeekAgoStr)
        .lte("created_at", todayStr),
      { count: 0 }
    );
    
    // 8. Fetch leads with total_score for conversion rate calculation (past 1 week)
    const leadsForConversionResult = await safeQuery(
      () => supabase.from("leads_table")
        .select("total_score")
        .gte("created_at", oneWeekAgoStr)
        .lte("created_at", todayStr),
      { data: [] }
    );
    const leadsForConversion = leadsForConversionResult.data ?? [];
    
    // 9. Calculate conversion rate: percentage of leads with total_score > 20 out of 25
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
      meetingConducted: meetingConducted || 0,
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








