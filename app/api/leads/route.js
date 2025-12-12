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
  const leads = data.map((lead) => {
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
      assignedTo: lead.assigned_to,
      companySize: lead.company_size || "",
      turnover: lead.turnover || "",
      industryType: lead.industry_type || "",
      createdAt: lead.created_at
        ? new Date(lead.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "",
      lastActivity: formatLastActivity(lead.last_activity),
      totalScore: totalScore,
    };
  });

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
  const { name, phone, email, contactName, source, status, priority, companySize, turnover, industryType } = body;

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
      company_size: companySize || "",
      turnover: turnover || "",
      industry_type: industryType || "",
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
    companySize: data.company_size || "",
    turnover: data.turnover || "",
    industryType: data.industry_type || "",
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
  const { id, name, phone, email, contactName, source, status, priority, companySize, turnover, industryType } = body;

  if (!id) {
    return Response.json({ error: "Lead ID is required" }, { status: 400 });
  }

  const { data: existingLead } = await supabase
    .from("leads_table")
    .select("id, lead_name, status")
    .eq("id", id)
    .single();

  if (!existingLead) {
    return Response.json({ error: "Lead not found" }, { status: 404 });
  }

  const previousStatus = existingLead?.status;
  const leadName = existingLead?.lead_name || "";

  const updateData = {};
  if (name !== undefined) updateData.lead_name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (email !== undefined) updateData.email = email;
  if (contactName !== undefined) updateData.contact_name = contactName;
  if (source !== undefined) updateData.lead_source = source;
  if (status !== undefined) updateData.status = status;
  if (priority !== undefined) updateData.priority = priority;
  if (companySize !== undefined) updateData.company_size = companySize;
  if (turnover !== undefined) updateData.turnover = turnover;
  if (industryType !== undefined) {
    updateData.industry_type = industryType;
    console.log("📝 Updating industry_type:", industryType);
  }

  if (Object.keys(updateData).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  console.log("🔄 Updating lead with data:", JSON.stringify(updateData, null, 2));
  
  const { data, error } = await supabase
    .from("leads_table")
    .update(updateData)
    .eq("id", id)
    .select();

  if (error) {
    console.error("❌ Leads PATCH Error:", error.message, "| ID:", id, "| Data:", updateData);
    return Response.json({ error: error.message }, { status: 500 });
  }
  
  console.log("✅ Lead updated successfully:", data?.[0]?.industry_type);

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

  // Map the updated lead to frontend format
  const formattedLead = {
    id: updatedLead.id,
    name: updatedLead.lead_name,
    phone: updatedLead.phone || "",
    email: updatedLead.email || "",
    contactName: updatedLead.contact_name || "",
    source: updatedLead.lead_source,
    status: updatedLead.status,
    priority: updatedLead.priority,
    assignedTo: updatedLead.assigned_to,
    companySize: updatedLead.company_size || "",
    turnover: updatedLead.turnover || "",
    industryType: updatedLead.industry_type || "",
    createdAt: updatedLead.created_at
      ? new Date(updatedLead.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "",
    lastActivity: formatLastActivity(updatedLead.last_activity),
    totalScore: updatedLead.total_score !== null && updatedLead.total_score !== undefined ? Number(updatedLead.total_score) : 0,
  };

  return Response.json({ success: true, data: formattedLead });
}
