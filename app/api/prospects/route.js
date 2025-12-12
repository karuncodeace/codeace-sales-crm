import { supabaseServer } from "../../../lib/supabase/serverClient";
import { getCrmUser, getFilteredQuery } from "../../../lib/crm/auth";

// Helper function to format timestamp to relative time
function formatLastActivity(timestamp) {
  if (!timestamp) return "No activity";
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function GET() {
  const supabase = await supabaseServer();
  
  // Get CRM user for role-based filtering
  const crmUser = await getCrmUser();
  if (!crmUser) {
    return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
  }
  
  // Get filtered query based on role
  let query = getFilteredQuery(supabase, "leads_table", crmUser);
  
  // Fetch leads with conversion_chance >= 60 (prospects)
  const { data, error } = await query
    .gte("conversion_chance", 60)
    .order("conversion_chance", { ascending: false });

  if (error) {
    console.error("Prospects API Error:", error.message);
    return Response.json([]);
  }

  // Map the data to the format expected by the frontend
  const prospects = (data || []).map((lead) => ({
    id: lead.id,
    name: lead.lead_name,
    phone: lead.phone || "",
    email: lead.email || "",
    contactName: lead.contact_name || "",
    source: lead.lead_source,
    status: lead.status,
    priority: lead.priority,
    assignedTo: lead.assigned_to || "",
    createdAt: lead.created_at
      ? new Date(lead.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "",
    lastActivity: formatLastActivity(lead.last_activity),
    conversionChance: lead.conversion_chance || 0,
  }));

  return Response.json(prospects);
}

export async function PATCH(request) {
  const supabase = await supabaseServer();
  
  // Get CRM user for role-based filtering
  const crmUser = await getCrmUser();
  if (!crmUser) {
    return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
  }
  
  const body = await request.json();
  const { id, status, priority } = body;

  if (!id) {
    return Response.json({ error: "Lead ID is required" }, { status: 400 });
  }

  // Check if user has access to this lead
  let accessQuery = getFilteredQuery(supabase, "leads_table", crmUser);
  const { data: existingLead } = await accessQuery
    .eq("id", id)
    .select("id")
    .single();
  
  if (!existingLead) {
    return Response.json({ error: "Lead not found or access denied" }, { status: 404 });
  }

  const updateData = {};
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;

  if (Object.keys(updateData).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("leads_table")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, data });
}




