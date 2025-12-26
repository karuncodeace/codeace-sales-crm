import { supabaseAdmin } from "../../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../../lib/crm/auth";

/**
 * GET /api/admin/target-achievement
 * 
 * Calculates target achievement for a given period by:
 * 1. Fetching completed values from sales_metrics_daily (aggregated)
 * 2. Fetching targets from sales_targets
 * 3. Calculating achievement percentages and remaining gaps
 * 
 * Query params:
 * - period_type: weekly | monthly | quarterly
 * - period_start: YYYY-MM-DD
 * - period_end: YYYY-MM-DD
 * - year: (optional, for period_start calculation)
 * - month: (optional, for monthly)
 * - quarter: (optional, for quarterly)
 */
export async function GET(request) {
  try {
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Only admin can view target achievement
    if (crmUser.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const periodType = searchParams.get("period_type") || searchParams.get("periodType");
    const periodStart = searchParams.get("period_start");
    const periodEnd = searchParams.get("period_end");
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const quarter = searchParams.get("quarter");

    if (!periodType || !periodStart || !periodEnd) {
      return Response.json(
        { error: "Missing required parameters: period_type, period_start, period_end" },
        { status: 400 }
      );
    }

    // Use admin client for reads (bypasses RLS)
    const supabase = supabaseAdmin();

    // 1. Fetch targets from sales_targets
    const { data: targetData, error: targetError } = await supabase
      .from("sales_targets")
      .select("*")
      .eq("period_type", periodType)
      .eq("period_start", periodStart)
      .maybeSingle();

    if (targetError) {
      console.error("Error fetching targets:", targetError);
      return Response.json({ error: targetError.message }, { status: 500 });
    }

    const targets = targetData || {
      target_leads: 0,
      target_calls: 0,
      target_meetings: 0,
      target_prospects: 0,
      target_proposals: 0,
      target_converted: 0,
      target_revenue: 0,
    };

    // 2. Fetch completed values from sales_metrics_daily (aggregated)
    const { data: metricsData, error: metricsError } = await supabase
      .from("sales_metrics_daily")
      .select("leads, calls, meetings, prospects, proposals, converted, closed_revenue")
      .gte("metric_date", periodStart)
      .lte("metric_date", periodEnd);

    if (metricsError) {
      console.error("Error fetching metrics:", metricsError);
      return Response.json({ error: metricsError.message }, { status: 500 });
    }

    // 3. Aggregate metrics (sum all daily values for the period)
    const completed = {
      leads: 0,
      calls: 0,
      meetings: 0,
      prospects: 0,
      proposals: 0,
      converted: 0,
      closed_revenue: 0,
    };

    if (metricsData && metricsData.length > 0) {
      metricsData.forEach((day) => {
        completed.leads += parseInt(day.leads || 0);
        completed.calls += parseInt(day.calls || 0);
        completed.meetings += parseInt(day.meetings || 0);
        completed.prospects += parseInt(day.prospects || 0);
        completed.proposals += parseInt(day.proposals || 0);
        completed.converted += parseInt(day.converted || 0);
        completed.closed_revenue += parseFloat(day.closed_revenue || 0);
      });
    }

    // 4. Calculate achievement percentages and remaining gaps
    const calculatePercentage = (actual, target) => {
      if (target === 0 || target === null) return actual > 0 ? 100 : 0;
      return Math.round((actual / target) * 100);
    };

    const calculateRemaining = (target, actual) => {
      return Math.max(0, target - actual);
    };

    // 5. Build response structure
    const response = {
      period: {
        type: periodType,
        start: periodStart,
        end: periodEnd,
        year: year ? parseInt(year) : null,
        month: month ? parseInt(month) : null,
        quarter: quarter ? parseInt(quarter) : null,
      },
      leads: {
        target: parseInt(targets.target_leads || 0),
        actual: completed.leads,
        percentage: calculatePercentage(completed.leads, targets.target_leads),
        remaining: calculateRemaining(targets.target_leads, completed.leads),
      },
      calls: {
        target: parseInt(targets.target_calls || 0),
        actual: completed.calls,
        percentage: calculatePercentage(completed.calls, targets.target_calls),
        remaining: calculateRemaining(targets.target_calls, completed.calls),
      },
      meetings: {
        target: parseInt(targets.target_meetings || 0),
        actual: completed.meetings,
        percentage: calculatePercentage(completed.meetings, targets.target_meetings),
        remaining: calculateRemaining(targets.target_meetings, completed.meetings),
      },
      prospects: {
        target: parseInt(targets.target_prospects || 0),
        actual: completed.prospects,
        percentage: calculatePercentage(completed.prospects, targets.target_prospects),
        remaining: calculateRemaining(targets.target_prospects, completed.prospects),
      },
      proposals: {
        target: parseInt(targets.target_proposals || 0),
        actual: completed.proposals,
        percentage: calculatePercentage(completed.proposals, targets.target_proposals),
        remaining: calculateRemaining(targets.target_proposals, completed.proposals),
      },
      converted: {
        target: parseInt(targets.target_converted || 0),
        actual: completed.converted,
        percentage: calculatePercentage(completed.converted, targets.target_converted),
        remaining: calculateRemaining(targets.target_converted, completed.converted),
      },
      revenue: {
        target: parseFloat(targets.target_revenue || 0),
        actual: completed.closed_revenue,
        percentage: calculatePercentage(completed.closed_revenue, targets.target_revenue),
        remaining: calculateRemaining(targets.target_revenue, completed.closed_revenue),
      },
    };

    return Response.json(response);
  } catch (error) {
    console.error("Target achievement API error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

