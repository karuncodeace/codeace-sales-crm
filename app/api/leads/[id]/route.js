import { supabaseServer } from "../../../../lib/supabase/serverClient";

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

export async function GET(request, { params }) {
  const supabase = await supabaseServer();
  const { id } = await params;

  const { data: lead, error } = await supabase
    .from("leads_table")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 404 });
  }

  // Map the data to the format expected by the frontend
  const formattedLead = {
    id: lead.id,
    name: lead.lead_name,
    phone: lead.phone || "",
    email: lead.email || "",
    contactName: lead.contact_name || "",
    source: lead.lead_source,
    status: lead.status,
    priority: lead.priority,
    assignedTo: lead.assigned_to || "",
    location: lead.location || "",
    company: lead.company || lead.lead_name,
    campaign: lead.campaign || "",
    budget: lead.budget || "",
    createdAt: lead.created_at
      ? new Date(lead.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "",
    lastActivity: formatLastActivity(lead.last_activity),
    lastActivityDate: lead.last_activity
      ? new Date(lead.last_activity).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "",
  };

  return Response.json(formattedLead);
}






