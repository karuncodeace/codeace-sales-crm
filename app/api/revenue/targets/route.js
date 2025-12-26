import { supabaseServer } from "../../../../lib/supabase/serverClient";
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
    const periodType = searchParams.get("periodType") || "monthly";
    const year = searchParams.get("year") || new Date().getFullYear();
    const month = searchParams.get("month") || new Date().getMonth() + 1;
    const quarter = searchParams.get("quarter");

    // Build period identifier
    let periodId = `${periodType}_${year}`;
    if (periodType === "monthly") {
      periodId += `_${month}`;
    } else if (periodType === "quarterly" && quarter) {
      periodId += `_Q${quarter}`;
    }

    // Fetch target from database
    const { data, error } = await supabase
      .from("revenue_targets")
      .select("*")
      .eq("period_id", periodId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
      console.error("Error fetching targets:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Return default targets if none found
    if (!data) {
      return Response.json({
        periodType,
        year: parseInt(year),
        month: periodType === "monthly" ? parseInt(month) : null,
        quarter: periodType === "quarterly" ? parseInt(quarter) : null,
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
      year: data.year,
      month: data.month,
      quarter: data.quarter,
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
    const supabase = await supabaseServer();
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
      year,
      month,
      quarter,
      targets,
    } = body;

    // Validate inputs
    if (!periodType || !year || !targets) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate no negative values
    const targetValues = Object.values(targets);
    if (targetValues.some(val => val < 0)) {
      return Response.json({ error: "Targets cannot be negative" }, { status: 400 });
    }

    // Build period identifier
    let periodId = `${periodType}_${year}`;
    if (periodType === "monthly" && month) {
      periodId += `_${month}`;
    } else if (periodType === "quarterly" && quarter) {
      periodId += `_Q${quarter}`;
    }

    // Upsert target
    const { data, error } = await supabase
      .from("revenue_targets")
      .upsert({
        period_id: periodId,
        period_type: periodType,
        year: parseInt(year),
        month: periodType === "monthly" ? parseInt(month) : null,
        quarter: periodType === "quarterly" ? parseInt(quarter) : null,
        target_leads: parseInt(targets.leads) || 0,
        target_calls: parseInt(targets.calls) || 0,
        target_meetings: parseInt(targets.meetings) || 0,
        target_prospects: parseInt(targets.prospects) || 0,
        target_proposals: parseInt(targets.proposals) || 0,
        target_converted: parseInt(targets.converted) || 0,
        target_revenue: parseFloat(targets.revenue) || 0,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "period_id",
      })
      .select()
      .single();

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

