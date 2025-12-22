import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabase/serverClient";
import { getCrmUser, getFilteredQuery } from "../../../../lib/crm/auth";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    
    // Get CRM user for role-based filtering
    const crmUser = await getCrmUser();
    if (!crmUser) {
      return NextResponse.json({ error: "Not authorized for CRM" }, { status: 403 });
    }
    
    // Get filtered query based on role
    let query = getFilteredQuery(supabase, "appointments", crmUser);
    
    const { data, error } = await query
      .eq("status", "pending")
      .order("start_time", { ascending: true });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Pending appointments error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const supabase = await supabaseServer();
    
    // Get CRM user for role-based assignment
    const crmUser = await getCrmUser();
    if (!crmUser) {
      return NextResponse.json({ error: "Not authorized for CRM" }, { status: 403 });
    }
    
    const { lead_id, salesperson_id } = await req.json();

    // Determine salesperson_id based on role
    // salesperson_id in appointments table references sales_persons.id
    let finalSalespersonId = salesperson_id;
    if (crmUser.role === "sales") {
      // Sales: always assign to their sales_person_id
      // Relationship: users.id -> sales_persons.user_id -> sales_persons.id
      finalSalespersonId = crmUser.salesPersonId || null;
      if (!finalSalespersonId) {
        console.warn("Pending Appointments POST: No sales_person_id found for user", crmUser.id);
        return NextResponse.json({ error: "Sales person not found. Please contact administrator." }, { status: 400 });
      }
    } else if (crmUser.role === "admin") {
      // Admin: can assign to any sales_person_id (use provided salesperson_id or leave null)
      finalSalespersonId = salesperson_id || null;
    }

    const { error } = await supabase.from("appointments").insert({
      lead_id,
      salesperson_id: finalSalespersonId,
      status: "pending"
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Pending appointments POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
