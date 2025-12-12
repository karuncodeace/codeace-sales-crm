import { supabaseServer } from "../../../lib/supabase/serverClient";
import { getCrmUser, getFilteredQuery } from "../../../lib/crm/auth";

/* ---------------- GET ---------------- */
export async function GET(request) {
  const supabase = await supabaseServer();
  
  // Get CRM user for role-based filtering
  const crmUser = await getCrmUser();
  
  // If no CRM user found, return empty array instead of 403 to prevent loading loops
  if (!crmUser) {
    console.warn("No CRM user found - returning empty tasks array");
    return Response.json([]);
  }
  
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead_id");

  // Get filtered query based on role
  let query = getFilteredQuery(supabase, "tasks_table", crmUser);

  // Filter by lead_id if provided
  if (leadId) {
    query = query.eq("lead_id", leadId);
  }

  // Order by created_at (newest first)
  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("Tasks API Error:", error.message);
    return Response.json([]);
  }

  // Handle null or undefined data
  if (!data || !Array.isArray(data)) {
    console.warn("Tasks API: No data returned or data is not an array");
    return Response.json([]);
  }

  return Response.json(data || []);
}

/* ---------------- POST (Manual task create) ---------------- */
export async function POST(request) {
  const supabase = await supabaseServer();
  
  // Get CRM user for role-based assignment
  const crmUser = await getCrmUser();
  if (!crmUser) {
    return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
  }
  
  const body = await request.json();

  const { lead_id, sales_person_id, priority, comments, type, title, due_date } = body;

  if (!lead_id) return Response.json({ error: "lead_id is required" }, { status: 400 });

  // Determine sales_person_id based on role
  let finalSalesPersonId = sales_person_id;
  
  if (crmUser.role === "salesperson") {
    // Salesperson: always assign to themselves
    finalSalesPersonId = crmUser.id;
  } else if (crmUser.role === "admin") {
    // Admin: can assign to anyone, but if not provided, try to get from lead
    if (!finalSalesPersonId) {
      const { data: lead, error: leadError } = await supabase
        .from("leads_table")
        .select("assigned_to")
        .eq("id", lead_id)
        .single();

      if (!leadError && lead?.assigned_to) {
        finalSalesPersonId = lead.assigned_to;
      }
    }
  }

  const insertData = {
    lead_id,
    type: type || "Call",
    priority: priority || "Medium",
    comments: comments || null,
  };

  // Add optional fields
  if (finalSalesPersonId) insertData.sales_person_id = finalSalesPersonId;
  if (title) insertData.title = title;
  if (due_date) insertData.due_date = due_date;

  const { data, error } = await supabase
    .from("tasks_table")
    .insert(insertData)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, task: data });
}

/* ---------------- PATCH ---------------- */
export async function PATCH(request) {
  const supabase = await supabaseServer();
  
  // Get CRM user for role-based filtering
  const crmUser = await getCrmUser();
  if (!crmUser) {
    return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
  }
  
  const body = await request.json();

  const { id, lead_id, title, type, status, priority, comments, due_date } = body;

  // Either id or lead_id must be provided
  if (!id && !lead_id) return Response.json({ error: "Task ID or Lead ID is required" }, { status: 400 });

  // Check if user has access to this task
  let accessQuery = getFilteredQuery(supabase, "tasks_table", crmUser);
  if (id) {
    accessQuery = accessQuery.eq("id", id);
  } else {
    accessQuery = accessQuery.eq("lead_id", lead_id);
  }
  
  const { data: existingTask } = await accessQuery.select().single();
  if (!existingTask) {
    return Response.json({ error: "Task not found or access denied" }, { status: 404 });
  }

  const updateData = {};

  if (title !== undefined) updateData.title = title;
  if (type !== undefined) updateData.type = type;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (comments !== undefined) updateData.comments = comments;
  if (due_date !== undefined) updateData.due_date = due_date;

  let query = supabase.from("tasks_table").update(updateData);
  
  // Update by task id or by lead_id
  if (id) {
    query = query.eq("id", id);
  } else {
    query = query.eq("lead_id", lead_id);
  }

  const { data, error } = await query.select();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, task: data?.[0] || data });
}

/* ---------------- DELETE ---------------- */
export async function DELETE(request) {
  const supabase = await supabaseServer();
  
  // Get CRM user for role-based filtering
  const crmUser = await getCrmUser();
  if (!crmUser) {
    return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
  }
  
  const { searchParams } = new URL(request.url);

  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Task ID is required" }, { status: 400 });

  // Check if user has access to this task
  let accessQuery = getFilteredQuery(supabase, "tasks_table", crmUser);
  const { data: existingTask } = await accessQuery.eq("id", id).select().single();
  
  if (!existingTask) {
    return Response.json({ error: "Task not found or access denied" }, { status: 404 });
  }

  const { error } = await supabase
    .from("tasks_table")
    .delete()
    .eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, message: "Task deleted successfully" });
}
