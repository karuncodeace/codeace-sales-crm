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
  
  // If no CRM user found, return empty array instead of 403 to prevent loading loops
  if (!crmUser) {
    console.warn("No CRM user found - returning empty prospects array");
    return Response.json([]);
  }
  
  // Fetch from prospects_table instead of filtering leads_table by score
  // First get all accessible leads based on role
  let accessibleLeadsQuery = getFilteredQuery(supabase, "leads_table", crmUser);
  const { data: accessibleLeads, error: leadsAccessError } = await accessibleLeadsQuery
    .select("id");
  
  if (leadsAccessError) {
    console.error("Leads access error:", leadsAccessError.message);
    return Response.json([]);
  }
  
  const accessibleLeadIds = (accessibleLeads || []).map(l => l.id);
  
  if (accessibleLeadIds.length === 0) {
    return Response.json([]);
  }
  
  // Get prospects that match accessible leads
  const { data: prospectsData, error: prospectsError } = await supabase
    .from("prospects_table")
    .select("lead_id, created_at")
    .in("lead_id", accessibleLeadIds)
    .order("created_at", { ascending: false });

  if (prospectsError) {
    console.error("Prospects API Error:", prospectsError.message);
    return Response.json([]);
  }

  if (!prospectsData || prospectsData.length === 0) {
    return Response.json([]);
  }

  // Get all lead_ids from prospects
  const leadIds = prospectsData.map(p => p.lead_id).filter(Boolean);

  // Fetch the actual lead data from leads_table
  let leadsDataQuery = getFilteredQuery(supabase, "leads_table", crmUser);
  const { data: leadsData, error: leadsError } = await leadsDataQuery
    .select("*")
    .in("id", leadIds);

  if (leadsError) {
    console.error("Leads API Error:", leadsError.message);
    return Response.json([]);
  }

  // Create a map of lead_id to lead data
  const leadsMap = {};
  (leadsData || []).forEach(lead => {
    leadsMap[lead.id] = lead;
  });

  // Map the data to the format expected by the frontend
  const prospects = prospectsData
    .filter(p => leadsMap[p.lead_id]) // Only include prospects whose leads exist
    .map((prospect) => {
      const lead = leadsMap[prospect.lead_id];
      const totalScore = lead.total_score !== null && lead.total_score !== undefined 
        ? Number(lead.total_score) 
        : 0;
      
      return {
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
        totalScore: totalScore,
        conversionChance: Math.round((totalScore / 25) * 100),
      };
    });

  return Response.json(prospects);
}

export async function POST(request) {
  const supabase = await supabaseServer();
  
  // Get CRM user for role-based filtering
  const crmUser = await getCrmUser();
  if (!crmUser) {
    return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
  }
  
  const body = await request.json();
  const { lead_id } = body;

  if (!lead_id) {
    return Response.json({ error: "Lead ID is required" }, { status: 400 });
  }

  // Check if user has access to this lead
  let accessQuery = getFilteredQuery(supabase, "leads_table", crmUser);
  const { data: existingLead } = await accessQuery
    .eq("id", lead_id)
    .select("*")
    .single();
  
  if (!existingLead) {
    return Response.json({ error: "Lead not found or access denied" }, { status: 404 });
  }

  // Check if already in prospects_table
  const { data: existingProspect } = await supabase
    .from("prospects_table")
    .select("id")
    .eq("lead_id", lead_id)
    .single();

  if (existingProspect) {
    return Response.json({ error: "Lead is already in prospects" }, { status: 400 });
  }

  // Insert into prospects_table
  const { data, error } = await supabase
    .from("prospects_table")
    .insert({
      lead_id: lead_id,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, data });
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

export async function DELETE(request) {
  const supabase = await supabaseServer();
  
  // Get CRM user for role-based filtering
  const crmUser = await getCrmUser();
  if (!crmUser) {
    return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
  }
  
  const { searchParams } = new URL(request.url);
  const lead_id = searchParams.get("lead_id");

  if (!lead_id) {
    return Response.json({ error: "Lead ID is required" }, { status: 400 });
  }

  // Check if user has access to this prospect
  const { data: existingProspect } = await supabase
    .from("prospects_table")
    .select("lead_id")
    .eq("lead_id", lead_id)
    .single();

  if (!existingProspect) {
    return Response.json({ error: "Prospect not found" }, { status: 404 });
  }

  // Delete from prospects_table
  const { error } = await supabase
    .from("prospects_table")
    .delete()
    .eq("lead_id", lead_id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true, message: "Removed from prospects" });
}




