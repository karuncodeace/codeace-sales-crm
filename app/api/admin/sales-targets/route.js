import { supabaseAdmin, supabaseServer } from "../../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../../lib/crm/auth";

/**
 * POST /api/admin/sales-targets
 * Create or update sales targets (Admin only)
 * 
 * Request Body:
 * {
 *   "period_type": "monthly" | "quarterly" | "yearly",
 *   "period_start": "2025-07-01",
 *   "period_end": "2025-07-31",
 *   "targets": {
 *     "leads": 500,
 *     "calls": 350,
 *     "meetings": 200,
 *     "prospects": 120,
 *     "proposals": 80,
 *     "converted": 40
 *   },
 *   "target_revenue": 1000000
 * }
 */
export async function POST(request) {
  try {
    // Verify admin access
    const crmUser = await getCrmUser();
    if (!crmUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (crmUser.role !== "admin") {
      return Response.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const body = await request.json();
    const {
      period_type,
      period_start,
      period_end,
      targets,
      target_revenue,
    } = body;

    // Validate required fields
    if (!period_type || !period_start || !period_end) {
      return Response.json(
        { error: "Missing required fields: period_type, period_start, period_end" },
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
    const validPeriodTypes = ["monthly", "quarterly", "yearly", "weekly"];
    if (!validPeriodTypes.includes(period_type)) {
      return Response.json(
        { error: `Invalid period_type. Must be one of: ${validPeriodTypes.join(", ")}` },
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

    // Upsert sales target
    // Using period_type + period_start as unique constraint
    const { data, error } = await supabase
      .from("sales_targets")
      .upsert({
        period_type,
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
      }, {
        onConflict: "period_type,period_start",
      })
      .select()
      .single();

    if (error) {
      console.error("Error upserting sales target:", error);
      
      // Handle unique constraint violation
      if (error.code === "23505" || error.message?.includes("duplicate")) {
        // Try update instead
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
          .eq("period_type", period_type)
          .eq("period_start", period_start)
          .select()
          .single();

        if (updateError) {
          return Response.json(
            { error: "Failed to update sales target", details: updateError.message },
            { status: 500 }
          );
        }

        return Response.json({
          success: true,
          message: "Sales target updated successfully",
          data: updateData,
        });
      }

      return Response.json(
        { error: "Failed to save sales target", details: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: "Sales target saved successfully",
      data,
    });
  } catch (error) {
    console.error("Sales targets API error:", error);
    return Response.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/sales-targets
 * Fetch sales targets (Admin only)
 */
export async function GET(request) {
  try {
    // Verify admin access
    const crmUser = await getCrmUser();
    if (!crmUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (crmUser.role !== "admin") {
      return Response.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const periodType = searchParams.get("period_type");
    const periodStart = searchParams.get("period_start");

    const supabase = await supabaseServer();
    let query = supabase.from("sales_targets").select("*").order("period_start", { ascending: false });

    if (periodType) {
      query = query.eq("period_type", periodType);
    }

    if (periodStart) {
      query = query.eq("period_start", periodStart);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching sales targets:", error);
      return Response.json(
        { error: "Failed to fetch sales targets", details: error.message },
        { status: 500 }
      );
    }

    return Response.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Sales targets GET error:", error);
    return Response.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

