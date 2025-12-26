import { supabaseServer, supabaseAdmin } from "../../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../../lib/crm/auth";

// GET: Fetch targets for a specific period
export async function GET(request) {
  try {
    const supabase = await supabaseServer();
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Only admin can view targets
    if (crmUser.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const periodType = searchParams.get("periodType") || searchParams.get("period_type") || "monthly";
    
    // Support both old format (year/month/quarter) and new format (period_start/period_end)
    let periodStart, periodEnd;
    
    if (searchParams.get("period_start") && searchParams.get("period_end")) {
      // New format: direct period_start and period_end
      periodStart = searchParams.get("period_start");
      periodEnd = searchParams.get("period_end");
    } else {
      // Old format: calculate from year/month/quarter (for backward compatibility)
      const year = searchParams.get("year") || new Date().getFullYear();
      const month = searchParams.get("month") || new Date().getMonth() + 1;
      const quarter = searchParams.get("quarter");
      const currentYear = parseInt(year);
      
      if (periodType === "monthly") {
        const currentMonth = parseInt(month);
        periodStart = new Date(currentYear, currentMonth - 1, 1).toISOString().split("T")[0];
        periodEnd = new Date(currentYear, currentMonth, 0).toISOString().split("T")[0];
      } else if (periodType === "quarterly" && quarter) {
        const q = parseInt(quarter);
        const startMonth = (q - 1) * 3;
        const endMonth = startMonth + 2;
        periodStart = new Date(currentYear, startMonth, 1).toISOString().split("T")[0];
        periodEnd = new Date(currentYear, endMonth + 1, 0).toISOString().split("T")[0];
      } else if (periodType === "weekly") {
        // Weekly: last 7 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        periodStart = startDate.toISOString().split("T")[0];
        periodEnd = endDate.toISOString().split("T")[0];
      } else {
        // Default to current month
        const now = new Date();
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      }
    }

    // Fetch target from database using period_type, period_start
    const { data, error } = await supabase
      .from("sales_targets")
      .select("*")
      .eq("period_type", periodType)
      .eq("period_start", periodStart)
      .maybeSingle();

    if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
      console.error("Error fetching targets:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Return default targets if none found
    if (!data) {
      return Response.json({
        periodType,
        period_start: periodStart,
        period_end: periodEnd,
        targets: {
          leads: 0,
          calls: 0,
          meetings: 0,
          prospects: 0,
          proposals: 0,
          converted: 0,
          revenue: 0,
        },
      });
    }

    // Format response to match component expectations
    return Response.json({
      periodType: data.period_type,
      period_start: data.period_start,
      period_end: data.period_end,
      targets: {
        leads: data.target_leads || 0,
        calls: data.target_calls || 0,
        meetings: data.target_meetings || 0,
        prospects: data.target_prospects || 0,
        proposals: data.target_proposals || 0,
        converted: data.target_converted || 0,
        revenue: parseFloat(data.target_revenue) || 0,
      },
    });
  } catch (error) {
    console.error("Targets GET error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST: Save or update targets
export async function POST(request) {
  try {
    // Verify admin access first
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Only admin can set targets
    if (crmUser.role !== "admin") {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      periodType,
      period_start,
      period_end,
      targets,
      target_revenue,
    } = body;

    // Validate inputs
    if (!periodType || !period_start || !period_end) {
      return Response.json(
        { error: "Missing required fields: periodType, period_start, period_end" },
        { status: 400 }
      );
    }

    if (!targets || typeof targets !== "object") {
      return Response.json(
        { error: "Missing or invalid targets object" },
        { status: 400 }
      );
    }

    // Validate period_type
    const validPeriodTypes = ["weekly", "monthly", "quarterly"];
    if (!validPeriodTypes.includes(periodType)) {
      return Response.json(
        { error: `Invalid periodType. Must be one of: ${validPeriodTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate date format
    const startDate = new Date(period_start);
    const endDate = new Date(period_end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return Response.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return Response.json(
        { error: "period_start must be before or equal to period_end" },
        { status: 400 }
      );
    }

    // Validate and extract target values
    const targetValues = {
      leads: parseInt(targets.leads) || 0,
      calls: parseInt(targets.calls) || 0,
      meetings: parseInt(targets.meetings) || 0,
      prospects: parseInt(targets.prospects) || 0,
      proposals: parseInt(targets.proposals) || 0,
      converted: parseInt(targets.converted) || 0,
    };

    const revenueTarget = parseFloat(target_revenue) || 0;

    // Validate no negative values
    const allValues = [...Object.values(targetValues), revenueTarget];
    if (allValues.some(val => val < 0)) {
      return Response.json(
        { error: "Target values cannot be negative" },
        { status: 400 }
      );
    }

    // Use admin client for writes (bypasses RLS)
    const supabase = supabaseAdmin();

    // Check if target already exists
    const { data: existingTarget } = await supabase
      .from("sales_targets")
      .select("*")
      .eq("period_type", periodType)
      .eq("period_start", period_start)
      .maybeSingle();

    let data, error;

    if (existingTarget) {
      // Update existing target
      const { data: updateData, error: updateError } = await supabase
        .from("sales_targets")
        .update({
          period_end: period_end,
          target_leads: targetValues.leads,
          target_calls: targetValues.calls,
          target_meetings: targetValues.meetings,
          target_prospects: targetValues.prospects,
          target_proposals: targetValues.proposals,
          target_converted: targetValues.converted,
          target_revenue: revenueTarget,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingTarget.id)
        .select()
        .single();
      
      data = updateData;
      error = updateError;
    } else {
      // Insert new target
      const { data: insertData, error: insertError } = await supabase
        .from("sales_targets")
        .insert({
          period_type: periodType,
          period_start: period_start,
          period_end: period_end,
          target_leads: targetValues.leads,
          target_calls: targetValues.calls,
          target_meetings: targetValues.meetings,
          target_prospects: targetValues.prospects,
          target_proposals: targetValues.proposals,
          target_converted: targetValues.converted,
          target_revenue: revenueTarget,
          created_by: crmUser.id,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      data = insertData;
      error = insertError;
    }

    if (error) {
      console.error("Error saving targets:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error("Targets POST error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

