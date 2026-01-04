import { supabaseServer, supabaseAdmin } from "../../../../lib/supabase/serverClient";

export async function GET() {
  try {
    // Use admin client to bypass RLS for dashboard metrics
    const supabase = supabaseAdmin();
    
    if (!supabase) {
      return Response.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }
    
    // Calculate date range for past 1 week (7 days)
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0); // Start of day 7 days ago
    
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
    
    // 2. First call done count from first_call_done field (past 7 days)
    // Check for "Done" string value - count leads with first_call_done = "Done" 
    // Fallback to created_at if last_attempted_at is NULL (for older records)
    const firstCallDoneResult = await safeQuery(
      () => supabase.from("leads_table")
        .eq("first_call_done", "Done")
        .select("id, last_attempted_at, created_at"),
      { data: [] }
    );
    
    let firstCallDone = 0;
    if (firstCallDoneResult.data && Array.isArray(firstCallDoneResult.data)) {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      firstCallDone = firstCallDoneResult.data.filter(lead => {
        // Use last_attempted_at if available, otherwise fallback to created_at
        const dateStr = lead.last_attempted_at || lead.created_at;
        if (!dateStr) return false;
        
        const checkDate = new Date(dateStr);
        // Check if date is within last 7 days (including today)
        return checkDate >= sevenDaysAgo && checkDate <= now;
      }).length;
    }
    
    // 3. Qualified leads count from lead_qualification field (past 1 week)
    // Check for "qualified" or "Qualified" (case-insensitive)
    // Fallback to created_at if last_attempted_at is NULL (for older records)
    const qualifiedLeadsResult = await safeQuery(
      () => supabase.from("leads_table")
        .select("id, lead_qualification, last_attempted_at, created_at"),
      { data: [] }
    );
    
    let qualifiedLeads = 0;
    if (qualifiedLeadsResult.data && Array.isArray(qualifiedLeadsResult.data)) {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      qualifiedLeads = qualifiedLeadsResult.data.filter(lead => {
        const qualification = String(lead.lead_qualification || "").toLowerCase();
        if (!qualification.includes("qualified")) return false;
        
        // Use last_attempted_at if available, otherwise fallback to created_at
        const dateStr = lead.last_attempted_at || lead.created_at;
        if (!dateStr) return false;
        
        const checkDate = new Date(dateStr);
        // Check if date is within last 7 days (including today)
        return checkDate >= sevenDaysAgo && checkDate <= now;
      }).length;
    }
    
    // 4. Meeting scheduled count from meeting_status field (past 1 week)
    // Get all leads and filter case-insensitively for "Scheduled"
    const allLeadsForScheduled = await safeQuery(
      () => supabase.from("leads_table")
        .select("id, meeting_status, last_attempted_at, created_at"),
      { data: [] }
    );
    
    let meetingScheduled = 0;
    if (allLeadsForScheduled.data && Array.isArray(allLeadsForScheduled.data)) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      meetingScheduled = allLeadsForScheduled.data.filter(lead => {
        // Case-insensitive check for "Scheduled"
        const status = String(lead.meeting_status || "").toLowerCase();
        if (status !== "scheduled") return false;
        
        // Prefer last_attempted_at, fallback to created_at
        const dateToCheck = lead.last_attempted_at || lead.created_at;
        if (!dateToCheck) return false;
        
        const checkDate = new Date(dateToCheck);
        return checkDate.getTime() >= sevenDaysAgo.getTime() && checkDate.getTime() <= now.getTime();
      }).length;
    }
    
    // 5. Meeting conducted count from meeting_status field (past 1 week)
    // Get all leads and filter case-insensitively for "Completed"
    const allLeadsForCompleted = await safeQuery(
      () => supabase.from("leads_table")
        .select("id, meeting_status, last_attempted_at, created_at"),
      { data: [] }
    );
    
    let meetingConducted = 0;
    if (allLeadsForCompleted.data && Array.isArray(allLeadsForCompleted.data)) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      meetingConducted = allLeadsForCompleted.data.filter(lead => {
        // Case-insensitive check for "Completed"
        const status = String(lead.meeting_status || "").toLowerCase();
        if (status !== "completed") return false;
        
        // Prefer last_attempted_at, fallback to created_at
        const dateToCheck = lead.last_attempted_at || lead.created_at;
        if (!dateToCheck) return false;
        
        const checkDate = new Date(dateToCheck);
        return checkDate.getTime() >= sevenDaysAgo.getTime() && checkDate.getTime() <= now.getTime();
      }).length;
    }
    
    // 6. Proposals sent count from status field (past 1 week)
    // Check for "Follow up" status - fallback to created_at if last_attempted_at is NULL
    const proposalsSentResult = await safeQuery(
      () => supabase.from("leads_table")
        .eq("status", "Follow up")
        .select("id, last_attempted_at, created_at"),
      { data: [] }
    );
    
    let proposalsSent = 0;
    if (proposalsSentResult.data && Array.isArray(proposalsSentResult.data)) {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      proposalsSent = proposalsSentResult.data.filter(lead => {
        // Use last_attempted_at if available, otherwise fallback to created_at
        const dateStr = lead.last_attempted_at || lead.created_at;
        if (!dateStr) return false;
        
        const checkDate = new Date(dateStr);
        // Check if date is within last 7 days (including today)
        return checkDate >= sevenDaysAgo && checkDate <= now;
      }).length;
    }
    
    // 7. Follow up calls count from status field (past 1 week)
    // Check for "Follow up" status - fallback to created_at if last_attempted_at is NULL
    // (Same query as proposals sent since both use "Follow up" status)
    const followUpCalls = proposalsSent;
    
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








