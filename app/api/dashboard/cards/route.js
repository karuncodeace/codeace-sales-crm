import { supabaseServer } from "../../../../lib/supabase/serverClient";

export async function GET(request) {
  try {
    const supabase = await supabaseServer();
    
    if (!supabase) {
      return Response.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Get period filter parameters from query string
    const { searchParams } = new URL(request.url);
    const periodStart = searchParams.get("period_start");
    const periodEnd = searchParams.get("period_end");
    
    console.log("Cards API: Received params", { periodStart, periodEnd });
    
    // For date range queries, we'll use ISO format in the filter function
    // Keep periodEnd as-is, the filter function will add time component
    const periodEndWithTime = (periodEnd && periodEnd !== "null" && periodEnd !== "undefined") 
      ? periodEnd 
      : null;
    
    // Helper to build date filter - Supabase queries are chainable
    const applyDateFilter = (query, start, end) => {
      if (start && end && 
          start !== "null" && start !== "undefined" && 
          end !== "null" && end !== "undefined" &&
          typeof start === "string" && typeof end === "string" &&
          start.trim() && end.trim()) {
        // Use ISO format for dates: YYYY-MM-DDTHH:mm:ss
        const startDate = `${start.trim()}T00:00:00`;
        const endDate = `${end.trim()}T23:59:59`;
        console.log("Applying date filter", { startDate, endDate, originalStart: start, originalEnd: end });
        return query.gte("created_at", startDate).lte("created_at", endDate);
      }
      return query;
    };
    
    // Helper function to safely execute queries with date filtering
    const safeQuery = async (queryFn, defaultValue) => {
      try {
        const result = await queryFn();
        if (result.error) {
          console.error("Query error:", result.error);
          return defaultValue;
        }
        return result;
      } catch (error) {
        console.error("Query exception:", error);
        console.error("Query exception stack:", error.stack);
        return defaultValue;
      }
    };
    
    // 1. Total leads from leads_table (filtered by created_at)
    let leadsQuery = supabase.from("leads_table").select("*", { count: "exact", head: true });
    leadsQuery = applyDateFilter(leadsQuery, periodStart, periodEndWithTime);
    const leadsResult = await safeQuery(() => leadsQuery, { count: 0 });
    const leadsGenerated = leadsResult?.count ?? 0;
    
    // 2. First call done count from first_call_done field (filtered by created_at)
    let firstCallQuery = supabase.from("leads_table")
      .eq("first_call_done", true)
      .select("*", { count: "exact", head: true });
    firstCallQuery = applyDateFilter(firstCallQuery, periodStart, periodEndWithTime);
    const firstCallDoneResult = await safeQuery(() => firstCallQuery, { count: 0 });
    const firstCallDone = firstCallDoneResult?.count ?? 0;
    
    // 3. Qualified leads count from status field (filtered by created_at)
    let qualifiedQuery = supabase.from("leads_table")
      .eq("status", "Qualified")
      .select("*", { count: "exact", head: true });
    qualifiedQuery = applyDateFilter(qualifiedQuery, periodStart, periodEndWithTime);
    const qualifiedResult = await safeQuery(() => qualifiedQuery, { count: 0 });
    const qualifiedLeads = qualifiedResult?.count ?? 0;
    
    // 4. Meeting scheduled count from appointments table (filtered by created_at)
    let meetingScheduledQuery = supabase.from("appointments").select("*", { count: "exact", head: true });
    meetingScheduledQuery = applyDateFilter(meetingScheduledQuery, periodStart, periodEndWithTime);
    const meetingScheduledResult = await safeQuery(() => meetingScheduledQuery, { count: 0 });
    const meetingScheduled = meetingScheduledResult?.count ?? 0;
    
    // 4b. Meeting conducted count from appointments table (status = 'completed', filtered by created_at)
    let meetingConductedQuery = supabase.from("appointments")
      .eq("status", "completed")
      .select("*", { count: "exact", head: true });
    meetingConductedQuery = applyDateFilter(meetingConductedQuery, periodStart, periodEndWithTime);
    const meetingConductedResult = await safeQuery(() => meetingConductedQuery, { count: 0 });
    const meetingConducted = meetingConductedResult?.count ?? 0;
    
    // 5. Fetch leads with total_score for conversion rate calculation (filtered by created_at)
    let leadsForConversionQuery = supabase.from("leads_table").select("total_score");
    leadsForConversionQuery = applyDateFilter(leadsForConversionQuery, periodStart, periodEndWithTime);
    const leadsForConversionResult = await safeQuery(() => leadsForConversionQuery, { data: [] });
    const leadsForConversion = leadsForConversionResult.data ?? [];
    
    // 6. Follow up calls count from status field (filtered by created_at)
    let followUpQuery = supabase.from("leads_table")
      .eq("status", "Follow-Up")
      .select("*", { count: "exact", head: true });
    followUpQuery = applyDateFilter(followUpQuery, periodStart, periodEndWithTime);
    const followUpResult = await safeQuery(() => followUpQuery, { count: 0 });
    const followUpCalls = followUpResult?.count ?? 0;
    
    // 7. Proposals sent count from status field (filtered by created_at)
    let proposalsQuery = supabase.from("leads_table")
      .eq("status", "Proposal")
      .select("*", { count: "exact", head: true });
    proposalsQuery = applyDateFilter(proposalsQuery, periodStart, periodEndWithTime);
    const proposalsResult = await safeQuery(() => proposalsQuery, { count: 0 });
    const proposalsSent = proposalsResult?.count ?? 0;
    
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
    
    return Response.json({
      leadsGenerated: leadsGenerated || 0,
      firstCallDone: firstCallDone || 0,
      qualifiedLeads: qualifiedLeads || 0,
      meetingScheduled: meetingScheduled || 0,
      meetingConducted: meetingConducted || 0,
      followUpCalls: followUpCalls || 0,
      proposalsSent: proposalsSent || 0,
      conversionRate: conversionRate
    });
  } catch (error) {
    console.error("Cards API Error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    if (error.cause) {
      console.error("Error cause:", error.cause);
    }
    return Response.json(
      { 
        error: "Failed to fetch cards data",
        message: error.message,
        name: error.name,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        details: process.env.NODE_ENV === "development" ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : undefined
      },
      { status: 500 }
    );
  }
}








