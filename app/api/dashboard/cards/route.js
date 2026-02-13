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
    // Validate sales person ID for sales users - this is critical for correct filtering
    let salesPersonId = null;
    if (crmUser.role === "sales") {
      salesPersonId = crmUser.salesPersonId;
      
      // Validate that sales person ID exists - log warning if missing
      if (!salesPersonId) {
        console.warn("⚠️ Dashboard Cards API: Sales user missing salesPersonId", {
          userId: crmUser.id,
          email: crmUser.email,
          role: crmUser.role,
          salesPersonId: crmUser.salesPersonId
        });
        
        // Try to fetch sales person ID directly as fallback
        try {
          const { data: salesPerson } = await supabase
            .from("sales_persons")
            .select("id")
            .eq("user_id", crmUser.id)
            .maybeSingle();
          
          if (salesPerson && salesPerson.id) {
            salesPersonId = salesPerson.id;
            console.log("✅ Dashboard Cards API: Retrieved salesPersonId from fallback query", {
              userId: crmUser.id,
              salesPersonId: salesPersonId
            });
          } else {
            console.error("❌ Dashboard Cards API: Cannot find sales_person_id for sales user", {
              userId: crmUser.id,
              email: crmUser.email
            });
            // Return empty data instead of failing - prevents dashboard from breaking
            return Response.json({
              leadsGenerated: 0,
              firstCallDone: 0,
              qualifiedLeads: 0,
              meetingScheduled: 0,
              meetingConducted: 0,
              followUpCalls: 0,
              proposalsSent: 0,
              conversionRate: 0,
              leadIds: [],
              error: "Sales person ID not found - please contact admin"
            });
          }
        } catch (fallbackError) {
          console.error("❌ Dashboard Cards API: Fallback query failed", fallbackError);
          return Response.json({
            leadsGenerated: 0,
            firstCallDone: 0,
            qualifiedLeads: 0,
            meetingScheduled: 0,
            meetingConducted: 0,
            followUpCalls: 0,
            proposalsSent: 0,
            conversionRate: 0,
            leadIds: [],
            error: "Failed to retrieve sales person information"
          });
        }
      } else {
        console.log("✅ Dashboard Cards API: Using salesPersonId", {
          userId: crmUser.id,
          salesPersonId: salesPersonId
        });
      }
    }

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
          console.error("Query error:", result.error);
          return defaultValue;
        }
        return result;
      } catch (error) {
        console.error("Query exception:", error);
        return defaultValue;
      }
    };

    // Helper function to apply sales person filtering consistently
    // This ensures all queries use the same filtering logic
    const applySalesPersonFilter = (query, tableName) => {
      if (!salesPersonId) {
        return query; // No filtering needed for admin users
      }
      
      // Apply filtering based on table structure
      if (tableName === "leads_table") {
        return query.eq("assigned_to", salesPersonId);
      } else if (tableName === "tasks_table") {
        return query.eq("sales_person_id", salesPersonId);
      } else if (tableName === "appointments") {
        return query.eq("salesperson_id", salesPersonId);
      }
      
      // For other tables, return query as-is
      return query;
    };

    // 1. Total leads from leads_table (filtered by date range and sales person if applicable)
    let leadsQuery = supabase.from("leads_table")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr);

    // Apply sales person filtering using helper function
    leadsQuery = applySalesPersonFilter(leadsQuery, "leads_table");

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

    // Apply sales person filtering using helper function
    firstCallQuery = applySalesPersonFilter(firstCallQuery, "leads_table");

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

    // Apply sales person filtering using helper function
    qualifiedLeadsQuery = applySalesPersonFilter(qualifiedLeadsQuery, "leads_table");

    const qualifiedLeadsResult = await safeQuery(
      () => qualifiedLeadsQuery,
      { data: [] }
    );

    let qualifiedLeads = 0;
    let qualifiedLeadsIds = [];
    if (qualifiedLeadsResult.data && Array.isArray(qualifiedLeadsResult.data)) {
      const filteredLeads = qualifiedLeadsResult.data.filter(lead => {
        // Strictly read from lead_qualification column and match "qualified" (case-insensitive)
        const qualification = String(lead.lead_qualification || "").toLowerCase().trim();
        if (qualification !== "qualified") return false;

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

    // Apply sales person filtering using helper function
    scheduledQuery = applySalesPersonFilter(scheduledQuery, "leads_table");

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

    // Also count scheduled bookings from bookings table
    let bookingsQuery = supabase.from("bookings")
      .select("id, status, created_at, start_time, lead_id, host_user_id")
      .eq("status", "scheduled")
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr);

    const allBookingsForScheduled = await safeQuery(
      () => bookingsQuery,
      { data: [] }
    );

    let bookingsScheduledCount = 0;
    if (allBookingsForScheduled.data && Array.isArray(allBookingsForScheduled.data)) {
      // If filtering by sales person, we need to check the lead's assigned_to
      if (salesPersonId) {
        // Get all lead IDs from bookings
        const bookingLeadIds = allBookingsForScheduled.data
          .map(b => b.lead_id)
          .filter(id => id !== null);
        
        if (bookingLeadIds.length > 0) {
          // Check which leads are assigned to this sales person
          const { data: assignedLeads } = await safeQuery(
            () => supabase.from("leads_table")
              .select("id")
              .in("id", bookingLeadIds)
              .eq("assigned_to", salesPersonId),
            { data: [] }
          );
          
          const assignedLeadIds = new Set((assignedLeads || []).map(l => l.id));
          // Count bookings that have leads assigned to this sales person
          bookingsScheduledCount = allBookingsForScheduled.data.filter(
            b => b.lead_id && assignedLeadIds.has(b.lead_id)
          ).length;
        }
      } else {
        // Count all scheduled bookings if not filtering by sales person
        bookingsScheduledCount = allBookingsForScheduled.data.length;
      }
    }

    // Add bookings count to meeting scheduled count
    meetingScheduled = meetingScheduled + bookingsScheduledCount;

    // 5. Meeting conducted count from meeting_status field (past 1 week)
    // Get all leads and filter case-insensitively for "Completed"
    let completedQuery = supabase.from("leads_table")
      .select("id, meeting_status, last_attempted_at, created_at, assigned_to")
      .or(`last_attempted_at.gte."${startDateStr}",created_at.gte."${startDateStr}"`)
      .order('created_at', { ascending: false });

    // Apply sales person filtering using helper function
    completedQuery = applySalesPersonFilter(completedQuery, "leads_table");

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

    // Apply sales person filtering using helper function
    proposalsQuery = applySalesPersonFilter(proposalsQuery, "leads_table");

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

    // Apply sales person filtering using helper function
    conversionQuery = applySalesPersonFilter(conversionQuery, "leads_table");

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

    // Log final results for debugging
    console.log("✅ Dashboard Cards API: Final counts", {
      userId: crmUser.id,
      role: crmUser.role,
      salesPersonId: salesPersonId,
      dateRange: { start: startDateStr, end: endDateStr },
      counts: {
        leadsGenerated: data.leadsGenerated,
        firstCallDone: data.firstCallDone,
        qualifiedLeads: data.qualifiedLeads,
        meetingScheduled: data.meetingScheduled,
        meetingConducted: data.meetingConducted,
        followUpCalls: data.followUpCalls,
        proposalsSent: data.proposalsSent,
        conversionRate: data.conversionRate
      },
      uniqueLeadIdsCount: uniqueLeadIds.length
    });

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








