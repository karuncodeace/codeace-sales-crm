import { supabaseServer } from "../../../lib/supabase/serverClient";
import { getCrmUser } from "../../../lib/crm/auth";

// POST: Create a new revenue transaction
export async function POST(request) {
  try {
    const supabase = await supabaseServer();
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { lead_id, sales_person_id, amount, status, closed_date } = body;

    // Validate required fields
    if (!lead_id) {
      return Response.json({ error: "lead_id is required" }, { status: 400 });
    }
    if (!sales_person_id) {
      return Response.json({ error: "sales_person_id is required" }, { status: 400 });
    }
    if (amount === null || amount === undefined) {
      return Response.json({ error: "amount is required" }, { status: 400 });
    }
    if (!status) {
      return Response.json({ error: "status is required" }, { status: 400 });
    }
    if (!closed_date) {
      return Response.json({ error: "closed_date is required" }, { status: 400 });
    }

    // Validate amount is a valid number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 0) {
      return Response.json({ error: "amount must be a valid positive number" }, { status: 400 });
    }

    // Validate closed_date is a valid date
    const closedDate = new Date(closed_date);
    if (isNaN(closedDate.getTime())) {
      return Response.json({ error: "closed_date must be a valid date" }, { status: 400 });
    }

    // Check if user has access to this lead (for sales users)
    if (crmUser.role === "sales") {
      const { data: lead, error: leadError } = await supabase
        .from("leads_table")
        .select("assigned_to")
        .eq("id", lead_id)
        .single();

      if (leadError || !lead) {
        return Response.json({ error: "Lead not found or access denied" }, { status: 404 });
      }

      // Verify the sales_person_id matches the lead's assigned_to
      if (lead.assigned_to !== sales_person_id) {
        return Response.json({ error: "Access denied: Lead is not assigned to this sales person" }, { status: 403 });
      }

      // Verify the sales_person_id matches the current user's salesPersonId
      if (crmUser.salesPersonId !== sales_person_id) {
        return Response.json({ error: "Access denied: Invalid sales person" }, { status: 403 });
      }
    }

    // Insert the revenue transaction
    const { data, error } = await supabase
      .from("revenue_transactions")
      .insert({
        lead_id: lead_id,
        sales_person_id: sales_person_id,
        amount: amountNum,
        status: status,
        closed_date: closed_date,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting revenue transaction:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("Revenue transaction POST error:", error);
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// GET: Fetch revenue transactions (optional, for future use)
export async function GET(request) {
  try {
    const supabase = await supabaseServer();
    const crmUser = await getCrmUser();
    
    if (!crmUser) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("lead_id");

    let query = supabase.from("revenue_transactions").select("*");

    // Apply role-based filtering
    if (crmUser.role === "sales" && crmUser.salesPersonId) {
      query = query.eq("sales_person_id", crmUser.salesPersonId);
    }

    // Filter by lead_id if provided
    if (leadId) {
      query = query.eq("lead_id", leadId);
    }

    // Order by created_at (newest first)
    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching revenue transactions:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data || []);
  } catch (error) {
    console.error("Revenue transaction GET error:", error);
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

