import { supabaseServer, supabaseAdmin } from "../../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../../lib/crm/auth";

export async function GET(request) {
  try {
    // Get CRM user for role-based filtering
    const crmUser = await getCrmUser();

    if (!crmUser) {
      return Response.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    // Use admin client to bypass RLS for dashboard metrics
    const supabase = supabaseAdmin();

    if (!supabase) {
      return Response.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Determine if we need to filter by sales person
    const salesPersonId = crmUser.role === "sales" ? crmUser.salesPersonId : null;

    // Calculate date range - use filter params if provided, otherwise default to past 7 days
    let startDate, endDate;

    if (startDateParam && endDateParam) {
      // Use provided filter dates
      startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to past 7 days (including today)
      const now = new Date();
      endDate = new Date(now); // Use current time to include leads created right now
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0); // Start of day 7 days ago
    }

    // Format dates for Supabase query (ISO format)
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

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

    // 1. Total leads from leads_table (filtered by date range and sales person if applicable)
    let leadsQuery = supabase.from("leads_table")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr);

    // Filter by sales person if user is sales
    if (salesPersonId) {
      leadsQuery = leadsQuery.eq("assigned_to", salesPersonId);
    }

    const { count: leadsGenerated = 0 } = await safeQuery(
      () => leadsQuery,
      { count: 0 }
    );

    // 2. First call done count from first_call_done field (past 7 days)
    // Check for "Done" string value - count leads with first_call_done = "Done" 
    // Fallback to created_at if last_attempted_at is NULL (for older records)
    // Fetch all leads and filter case-insensitively for "Done"
    let firstCallQuery = supabase.from("leads_table")
      .select("id, first_call_done, last_attempted_at, created_at, assigned_to")
      .or(`last_attempted_at.gte."${startDateStr}",created_at.gte."${startDateStr}"`)
      .order('created_at', { ascending: false });

    // Filter by sales person if user is sales
    if (salesPersonId) {
      firstCallQuery = firstCallQuery.eq("assigned_to", salesPersonId);
    }

    const allLeadsForFirstCall = await safeQuery(
      () => firstCallQuery,
      { data: [] }
    );

    let firstCallDone = 0;
    let firstCallDoneLeadIds = [];
    if (allLeadsForFirstCall.data && Array.isArray(allLeadsForFirstCall.data)) {
      const filteredLeads = allLeadsForFirstCall.data.filter(lead => {
        // Case-insensitive check for "Done"
        const firstCallStatus = String(lead.first_call_done || "").toLowerCase();
        if (firstCallStatus !== "done") return false;

        // Use last_attempted_at if available, otherwise fallback to created_at
        const dateStr = lead.last_attempted_at || lead.created_at;
        if (!dateStr) return false;

        const checkDate = new Date(dateStr);
        // Check if date is within filter date range
        return checkDate.getTime() >= startDate.getTime() && checkDate.getTime() <= endDate.getTime();
      });
      firstCallDone = filteredLeads.length;
      firstCallDoneLeadIds = filteredLeads.map(lead => lead.id);
    }

    // 3. Qualified leads count from lead_qualification field (past 1 week)
    // Check for "qualified" or "Qualified" (case-insensitive)
    // Fallback to created_at if last_attempted_at is NULL (for older records)
    let qualifiedLeadsQuery = supabase.from("leads_table")
      .select("id, lead_qualification, last_attempted_at, created_at, assigned_to")
      .or(`last_attempted_at.gte."${startDateStr}",created_at.gte."${startDateStr}"`)
      .order('created_at', { ascending: false });

    // Filter by sales person if user is sales
    if (salesPersonId) {
      qualifiedLeadsQuery = qualifiedLeadsQuery.eq("assigned_to", salesPersonId);
    }

    const qualifiedLeadsResult = await safeQuery(
      () => qualifiedLeadsQuery,
      { data: [] }
    );

    let qualifiedLeads = 0;
    let qualifiedLeadsIds = [];
    if (qualifiedLeadsResult.data && Array.isArray(qualifiedLeadsResult.data)) {
      const filteredLeads = qualifiedLeadsResult.data.filter(lead => {
        const qualification = String(lead.lead_qualification || "").toLowerCase();
        if (!qualification.includes("qualified")) return false;

        // Use last_attempted_at if available, otherwise fallback to created_at
        const dateStr = lead.last_attempted_at || lead.created_at;
        if (!dateStr) return false;

        const checkDate = new Date(dateStr);
        // Check if date is within filter date range
        return checkDate.getTime() >= startDate.getTime() && checkDate.getTime() <= endDate.getTime();
      });
      qualifiedLeads = filteredLeads.length;
      qualifiedLeadsIds = filteredLeads.map(lead => lead.id);
    }

    // 4. Meeting scheduled count from meeting_status field (past 1 week)
    // Get all leads and filter case-insensitively for "Scheduled"
    let scheduledQuery = supabase.from("leads_table")
      .select("id, meeting_status, last_attempted_at, created_at, assigned_to")
      .or(`last_attempted_at.gte."${startDateStr}",created_at.gte."${startDateStr}"`)
      .order('created_at', { ascending: false });

    // Filter by sales person if user is sales
    if (salesPersonId) {
      scheduledQuery = scheduledQuery.eq("assigned_to", salesPersonId);
    }

    const allLeadsForScheduled = await safeQuery(
      () => scheduledQuery,
      { data: [] }
    );

    let meetingScheduled = 0;
    let meetingScheduledLeadIds = [];
    if (allLeadsForScheduled.data && Array.isArray(allLeadsForScheduled.data)) {
      const filteredLeads = allLeadsForScheduled.data.filter(lead => {
        // Case-insensitive check for "Scheduled"
        const status = String(lead.meeting_status || "").toLowerCase();
        if (status !== "scheduled") return false;

        // Prefer last_attempted_at, fallback to created_at
        const dateToCheck = lead.last_attempted_at || lead.created_at;
        if (!dateToCheck) return false;

        const checkDate = new Date(dateToCheck);
        return checkDate.getTime() >= startDate.getTime() && checkDate.getTime() <= endDate.getTime();
      });
      meetingScheduled = filteredLeads.length;
      meetingScheduledLeadIds = filteredLeads.map(lead => lead.id);
    }

    // 5. Meeting conducted count from meeting_status field (past 1 week)
    // Get all leads and filter case-insensitively for "Completed"
    let completedQuery = supabase.from("leads_table")
      .select("id, meeting_status, last_attempted_at, created_at, assigned_to")
      .or(`last_attempted_at.gte."${startDateStr}",created_at.gte."${startDateStr}"`)
      .order('created_at', { ascending: false });

    // Filter by sales person if user is sales
    if (salesPersonId) {
      completedQuery = completedQuery.eq("assigned_to", salesPersonId);
    }

    const allLeadsForCompleted = await safeQuery(
      () => completedQuery,
      { data: [] }
    );

    let meetingConducted = 0;
    let meetingConductedLeadIds = [];
    if (allLeadsForCompleted.data && Array.isArray(allLeadsForCompleted.data)) {
      const filteredLeads = allLeadsForCompleted.data.filter(lead => {
        // Case-insensitive check for "Completed"
        const status = String(lead.meeting_status || "").toLowerCase();
        if (status !== "completed") return false;

        // Prefer last_attempted_at, fallback to created_at
        const dateToCheck = lead.last_attempted_at || lead.created_at;
        if (!dateToCheck) return false;

        const checkDate = new Date(dateToCheck);
        return checkDate.getTime() >= startDate.getTime() && checkDate.getTime() <= endDate.getTime();
      });
      meetingConducted = filteredLeads.length;
      meetingConductedLeadIds = filteredLeads.map(lead => lead.id);
    }

    // 6. Proposals sent count from status field (past 1 week)
    // Check for "Follow up" status - fallback to created_at if last_attempted_at is NULL
    let proposalsQuery = supabase.from("leads_table")
      .select("id, last_attempted_at, created_at, assigned_to")
      .eq("status", "Follow up")
      .or(`last_attempted_at.gte."${startDateStr}",created_at.gte."${startDateStr}"`)
      .order('created_at', { ascending: false });

    // Filter by sales person if user is sales
    if (salesPersonId) {
      proposalsQuery = proposalsQuery.eq("assigned_to", salesPersonId);
    }

    const proposalsSentResult = await safeQuery(
      () => proposalsQuery,
      { data: [] }
    );

    let proposalsSent = 0;
    let proposalsSentLeadIds = [];
    if (proposalsSentResult.data && Array.isArray(proposalsSentResult.data)) {
      const filteredLeads = proposalsSentResult.data.filter(lead => {
        // Use last_attempted_at if available, otherwise fallback to created_at
        const dateStr = lead.last_attempted_at || lead.created_at;
        if (!dateStr) return false;

        const checkDate = new Date(dateStr);
        // Check if date is within filter date range
        return checkDate.getTime() >= startDate.getTime() && checkDate.getTime() <= endDate.getTime();
      });
      proposalsSent = filteredLeads.length;
      proposalsSentLeadIds = filteredLeads.map(lead => lead.id);
    }

    // 7. Follow up calls count from status field (past 1 week)
    // Check for "Follow up" status - fallback to created_at if last_attempted_at is NULL
    // (Same query as proposals sent since both use "Follow up" status)
    const followUpCalls = proposalsSent;

    // 8. Conversion rate calculation (past 7 days)
    // Formula: (Converted leads / Total leads) * 100
    // Converted leads = leads with status = "Won" in the past 7 days
    // Total leads = leads created in the past 7 days (already calculated as leadsGenerated)
    // Fetch all leads and filter case-insensitively for "Won" status
    let conversionQuery = supabase.from("leads_table")
      .select("id, status, last_attempted_at, created_at, assigned_to")
      .or(`last_attempted_at.gte."${startDateStr}",created_at.gte."${startDateStr}"`)
      .order('created_at', { ascending: false });

    // Filter by sales person if user is sales
    if (salesPersonId) {
      conversionQuery = conversionQuery.eq("assigned_to", salesPersonId);
    }

    const allLeadsForConversion = await safeQuery(
      () => conversionQuery,
      { data: [] }
    );

    let convertedLeads = 0;
    let convertedLeadsIds = [];
    if (allLeadsForConversion.data && Array.isArray(allLeadsForConversion.data)) {
      const filteredLeads = allLeadsForConversion.data.filter(lead => {
        // Case-insensitive check for "Won" status
        const status = String(lead.status || "").toLowerCase();
        if (status !== "won") return false;

        // Use last_attempted_at if available, otherwise fallback to created_at
        const dateStr = lead.last_attempted_at || lead.created_at;
        if (!dateStr) return false;

        const checkDate = new Date(dateStr);
        // Check if date is within filter date range
        return checkDate.getTime() >= startDate.getTime() && checkDate.getTime() <= endDate.getTime();
      });
      convertedLeads = filteredLeads.length;
      convertedLeadsIds = filteredLeads.map(lead => lead.id);
    }

    // Get all unique lead IDs from all metrics
    const allLeadIds = [
      ...firstCallDoneLeadIds,
      ...qualifiedLeadsIds,
      ...meetingScheduledLeadIds,
      ...meetingConductedLeadIds,
      ...proposalsSentLeadIds,
      ...convertedLeadsIds
    ];
    const uniqueLeadIds = [...new Set(allLeadIds)];

    // Calculate conversion rate: (Converted leads / Total leads) * 100
    let conversionRate = 0;
    const totalLeads = leadsGenerated || 0;
    if (totalLeads > 0) {
      conversionRate = parseFloat(((convertedLeads / totalLeads) * 100).toFixed(1));
    }

    const data = {
      leadsGenerated: leadsGenerated || 0,
      firstCallDone: firstCallDone || 0,
      qualifiedLeads: qualifiedLeads || 0,
      meetingScheduled: meetingScheduled || 0,
      meetingConducted: meetingConducted || 0,
      followUpCalls: followUpCalls || 0,
      proposalsSent: proposalsSent || 0,
      conversionRate: conversionRate,
      leadIds: uniqueLeadIds
    };

    return Response.json(data);
  } catch (error) {
    console.error("Dashboard Cards API Error:", error);
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








