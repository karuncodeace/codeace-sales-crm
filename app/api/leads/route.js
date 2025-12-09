import { supabaseServer } from "../../../lib/supabase/serverClient";

export async function GET() {
  const supabase = await supabaseServer();
  
  // Order by id (descending to show newest leads first)
  const { data, error } = await supabase
    .from("leads_table")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Map the data to the format expected by the frontend
  const leads = data.map((lead) => ({
    id: lead.id,
    name: lead.lead_name,
    phone: lead.phone || "",
    email: lead.email || "",
    contactName: lead.contact_name || "",
    source: lead.lead_source,
    status: lead.status,
    priority: lead.priority,
    assignedTo: lead.assigned_to,
    createdAt: lead.created_at
      ? new Date(lead.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "",
    lastActivity: formatLastActivity(lead.last_activity),
  }));

  return Response.json(leads);
}

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

export async function POST(request) {
  const supabase = await supabaseServer();
  
  const body = await request.json();
  const { name, phone, email, contactName, source, status, priority } = body;

  // Validate required fields
  if (!name || !phone || !email || !contactName || !source) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("leads_table")
    .insert({
      lead_name: name,
      phone,
      email,
      contact_name: contactName,
      lead_source: source,
      status: status || "New",
      priority: priority || "Warm",
      // created_at and last_activity will use Supabase defaults (now())
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Return the created lead in frontend format
  const newLead = {
    id: data.id,
    name: data.lead_name,
    phone: data.phone || "",
    email: data.email || "",
    contactName: data.contact_name || "",
    source: data.lead_source,
    status: data.status,
    priority: data.priority,
    assignedTo: data.assigned_to,
    createdAt: data.created_at
      ? new Date(data.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "",
    lastActivity: formatLastActivity(data.last_activity),
  };

  const initialTaskTitle = `Call to ${newLead.name}`;
  await supabase
    .from("tasks_table")
    .insert({
      lead_id: newLead.id,
      title: initialTaskTitle,
      type: "Call",
      status: "Pending",
    });

  return Response.json({ success: true, lead: newLead });
}

export async function PATCH(request) {
  const supabase = await supabaseServer();
  
  const body = await request.json();
  const { id, status, priority } = body;

  if (!id) {
    return Response.json({ error: "Lead ID is required" }, { status: 400 });
  }

  const { data: existingLead } = await supabase
    .from("leads_table")
    .select("id, lead_name, status")
    .eq("id", id)
    .single();

  const previousStatus = existingLead?.status;
  const leadName = existingLead?.lead_name || "";

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
    .select();

  if (error) {
    console.error("Leads PATCH Error:", error.message, "| ID:", id, "| Data:", updateData);
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    console.error("Leads PATCH Error: No lead found with ID:", id);
    return Response.json({ error: "Lead not found" }, { status: 404 });
  }

  const updatedLead = data[0];

  if (status !== undefined && previousStatus !== undefined && String(status).toLowerCase() !== String(previousStatus).toLowerCase()) {
    const s = String(status).toLowerCase();
    let title = `Task for ${leadName}`;
    let type = "Follow-Up";
    if (s === "new") {
      title = `Call to ${leadName}`;
      type = "Call";
    } else if (s === "contacted") {
      title = `Follow-up to ${leadName}`;
      type = "Follow-Up";
    } else if (s === "follow_up" || s === "follow-up" || s === "follow up") {
      title = `Follow-up to ${leadName}`;
      type = "Follow-Up";
    } else if (s === "qualified") {
      title = `Qualification call with ${leadName}`;
      type = "Call";
    } else if (s === "proposal") {
      title = `Prepare proposal for ${leadName}`;
      type = "Proposal";
    } else if (s === "won") {
      title = `Closure with ${leadName}`;
      type = "Meeting";
    } else if (s === "no response" || s === "no_response") {
      title = `Re-attempt contact: ${leadName}`;
      type = "Call";
    }

    await supabase
      .from("tasks_table")
      .insert({
        lead_id: id,
        title,
        type,
        status: "Pending",
      });
  }

  return Response.json({ success: true, data: updatedLead });
}
