import { supabaseServer } from "../../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../../lib/crm/auth";

export async function GET(request) {
  try {
    const supabase = await supabaseServer();
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Only admin can view revenue KPIs
    if (crmUser.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const periodType = searchParams.get("periodType") || "monthly";
    const year = searchParams.get("year") || new Date().getFullYear();
    const month = searchParams.get("month") || new Date().getMonth() + 1;
    const quarter = searchParams.get("quarter");

    // Calculate date range based on period
    let startDate, endDate;
    const currentYear = parseInt(year);
    
    if (periodType === "monthly") {
      const currentMonth = parseInt(month);
      startDate = new Date(currentYear, currentMonth - 1, 1);
      endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
    } else if (periodType === "quarterly" && quarter) {
      const q = parseInt(quarter);
      const startMonth = (q - 1) * 3;
      const endMonth = startMonth + 2;
      startDate = new Date(currentYear, startMonth, 1);
      endDate = new Date(currentYear, endMonth + 1, 0, 23, 59, 59, 999);
    } else {
      // Weekly - last 7 days
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    }

    // Fetch targets
    let periodId = `${periodType}_${currentYear}`;
    if (periodType === "monthly") {
      periodId += `_${month}`;
    } else if (periodType === "quarterly" && quarter) {
      periodId += `_Q${quarter}`;
    }

    const { data: targetData } = await supabase
      .from("revenue_targets")
      .select("*")
      .eq("period_id", periodId)
      .maybeSingle();

    const targets = targetData || {
      target_leads: 0,
      target_calls: 0,
      target_meetings: 0,
      target_prospects: 0,
      target_proposals: 0,
      target_converted: 0,
      target_revenue: 0,
    };

    // Calculate actuals from database
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    // 1. Leads count (created in period)
    const { count: actualLeads = 0 } = await supabase
      .from("leads_table")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr);

    // 2. Calls count (from tasks or leads with first_call_done)
    const { count: actualCalls = 0 } = await supabase
      .from("leads_table")
      .select("*", { count: "exact", head: true })
      .eq("first_call_done", true)
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr);

    // 3. Meetings count (from appointments)
    const { count: actualMeetings = 0 } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr);

    // 4. Prospects count (status = "Qualified")
    const { count: actualProspects = 0 } = await supabase
      .from("leads_table")
      .select("*", { count: "exact", head: true })
      .eq("status", "Qualified")
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr);

    // 5. Proposals count (status = "Proposal")
    const { count: actualProposals = 0 } = await supabase
      .from("leads_table")
      .select("*", { count: "exact", head: true })
      .eq("status", "Proposal")
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr);

    // 6. Converted count (leads with total_score > 20 or status = "Converted")
    const { data: leadsForConversion } = await supabase
      .from("leads_table")
      .select("total_score, status")
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr);

    const actualConverted = leadsForConversion?.filter(lead => {
      const score = lead.total_score !== null && lead.total_score !== undefined 
        ? Number(lead.total_score) 
        : 0;
      return score > 20 || lead.status === "Converted";
    }).length || 0;

    // 7. Revenue - For now, we'll calculate from converted leads
    // If you have a revenue field in leads_table, use that instead
    // For now, using a placeholder calculation
    const actualRevenue = actualConverted * 50000; // Placeholder: ₹50k per conversion

    // Calculate achievement percentages
    const calculatePercentage = (actual, target) => {
      if (target === 0) return actual > 0 ? 100 : 0;
      return Math.round((actual / target) * 100);
    };

    const revenuePercentage = calculatePercentage(actualRevenue, targets.target_revenue);
    const leadsPercentage = calculatePercentage(actualLeads, targets.target_leads);
    const callsPercentage = calculatePercentage(actualCalls, targets.target_calls);
    const meetingsPercentage = calculatePercentage(actualMeetings, targets.target_meetings);
    const prospectsPercentage = calculatePercentage(actualProspects, targets.target_prospects);
    const proposalsPercentage = calculatePercentage(actualProposals, targets.target_proposals);
    const convertedPercentage = calculatePercentage(actualConverted, targets.target_converted);

    // Calculate remaining amounts
    const remainingRevenue = Math.max(0, targets.target_revenue - actualRevenue);
    const remainingLeads = Math.max(0, targets.target_leads - actualLeads);
    const remainingCalls = Math.max(0, targets.target_calls - actualCalls);
    const remainingMeetings = Math.max(0, targets.target_meetings - actualMeetings);
    const remainingProspects = Math.max(0, targets.target_prospects - actualProspects);
    const remainingProposals = Math.max(0, targets.target_proposals - actualProposals);
    const remainingConverted = Math.max(0, targets.target_converted - actualConverted);

    return Response.json({
      period: {
        type: periodType,
        year: currentYear,
        month: periodType === "monthly" ? parseInt(month) : null,
        quarter: periodType === "quarterly" ? parseInt(quarter) : null,
        startDate: startDateStr,
        endDate: endDateStr,
      },
      revenue: {
        actual: actualRevenue,
        target: targets.target_revenue,
        percentage: revenuePercentage,
        remaining: remainingRevenue,
      },
      funnel: {
        leads: {
          actual: actualLeads,
          target: targets.target_leads,
          percentage: leadsPercentage,
          remaining: remainingLeads,
        },
        calls: {
          actual: actualCalls,
          target: targets.target_calls,
          percentage: callsPercentage,
          remaining: remainingCalls,
        },
        meetings: {
          actual: actualMeetings,
          target: targets.target_meetings,
          percentage: meetingsPercentage,
          remaining: remainingMeetings,
        },
        prospects: {
          actual: actualProspects,
          target: targets.target_prospects,
          percentage: prospectsPercentage,
          remaining: remainingProspects,
        },
        proposals: {
          actual: actualProposals,
          target: targets.target_proposals,
          percentage: proposalsPercentage,
          remaining: remainingProposals,
        },
        converted: {
          actual: actualConverted,
          target: targets.target_converted,
          percentage: convertedPercentage,
          remaining: remainingConverted,
        },
      },
    });
  } catch (error) {
    console.error("Revenue KPIs error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

