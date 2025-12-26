import { supabaseAdmin, supabaseServer } from "../../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../../lib/crm/auth";
import { updateDailyMetrics } from "../../../../lib/sales-metrics/updateMetrics";

/**
 * POST /api/admin/revenue
 * Insert revenue transaction (Admin only)
 * 
 * Request Body:
 * {
 *   "lead_id": "uuid",
 *   "sales_person_id": "SP-03",
 *   "amount": 45000,
 *   "status": "closed",
 *   "closed_date": "2025-07-15"
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
      lead_id,
      sales_person_id,
      amount,
      status,
      closed_date,
    } = body;

    // Validate required fields
    if (!lead_id || !sales_person_id || !amount || !status) {
      return Response.json(
        { error: "Missing required fields: lead_id, sales_person_id, amount, status" },
        { status: 400 }
      );
    }

    // Validate amount
    const revenueAmount = parseFloat(amount);
    if (isNaN(revenueAmount) || revenueAmount <= 0) {
      return Response.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["closed", "pending", "cancelled"];
    if (!validStatuses.includes(status.toLowerCase())) {
      return Response.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // If status is closed, closed_date is required
    if (status.toLowerCase() === "closed" && !closed_date) {
      return Response.json(
        { error: "closed_date is required when status is 'closed'" },
        { status: 400 }
      );
    }

    // Validate closed_date format if provided
    if (closed_date) {
      const date = new Date(closed_date);
      if (isNaN(date.getTime())) {
        return Response.json(
          { error: "Invalid closed_date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
    }

    // Validate lead_id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lead_id)) {
      return Response.json(
        { error: "Invalid lead_id format. Must be a valid UUID" },
        { status: 400 }
      );
    }

    // Use admin client for writes (bypasses RLS)
    const supabase = supabaseAdmin();

    // Insert revenue transaction
    const { data, error } = await supabase
      .from("revenue_transactions")
      .insert({
        lead_id,
        sales_person_id,
        amount: revenueAmount,
        status: status.toLowerCase(),
        closed_date: closed_date || null,
        created_by: crmUser.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting revenue transaction:", error);
      
      // Handle foreign key violations
      if (error.code === "23503") {
        return Response.json(
          { error: "Invalid lead_id or sales_person_id. Record not found." },
          { status: 400 }
        );
      }

      return Response.json(
        { error: "Failed to create revenue transaction", details: error.message },
        { status: 500 }
      );
    }

    // Update daily metrics: Revenue closed → increment converted and closed_revenue
    if (status.toLowerCase() === "closed" && closed_date) {
      // Use closed_date for the metric date (not today)
      await updateDailyMetrics(
        {
          converted: 1,
          closed_revenue: revenueAmount,
        },
        closed_date
      );
    }

    return Response.json({
      success: true,
      message: "Revenue transaction created successfully",
      data,
    });
  } catch (error) {
    console.error("Revenue API error:", error);
    return Response.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/revenue
 * Fetch revenue transactions (Admin only)
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
    const leadId = searchParams.get("lead_id");
    const salesPersonId = searchParams.get("sales_person_id");
    const status = searchParams.get("status");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    const supabase = await supabaseServer();
    
    let query = supabase
      .from("revenue_transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (leadId) {
      query = query.eq("lead_id", leadId);
    }

    if (salesPersonId) {
      query = query.eq("sales_person_id", salesPersonId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (startDate) {
      query = query.gte("closed_date", startDate);
    }

    if (endDate) {
      query = query.lte("closed_date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching revenue transactions:", error);
      return Response.json(
        { error: "Failed to fetch revenue transactions", details: error.message },
        { status: 500 }
      );
    }

    return Response.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Revenue GET error:", error);
    return Response.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

// Note: Automatic metrics tracking has been removed
// sales_metrics_daily must be updated manually via scheduled jobs or separate API calls

