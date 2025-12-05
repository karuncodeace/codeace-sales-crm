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
    // Include score fields
    lead_score: lead.lead_score || 0,
    responsiveness_score: lead.responsiveness_score || 0,
    conversion_probability_score: lead.conversion_probability_score || 0,
    total_score: lead.total_score || 0,
  };

  return Response.json(formattedLead);
}

export async function PATCH(request, { params }) {
  try {
    const supabase = await supabaseServer();
    const { id } = await params;
    const body = await request.json();

    // Extract score fields
    const updateData = {};
    if (body.lead_score !== undefined) {
      updateData.lead_score = body.lead_score;
    }
    if (body.responsiveness_score !== undefined) {
      updateData.responsiveness_score = body.responsiveness_score;
    }
    if (body.conversion_probability_score !== undefined) {
      updateData.conversion_probability_score = body.conversion_probability_score;
    }

    // Calculate total_score if any score is being updated
    if (Object.keys(updateData).length > 0) {
      // Get current values from database if not all scores are provided
      let lead_score = body.lead_score;
      let responsiveness_score = body.responsiveness_score;
      let conversion_probability_score = body.conversion_probability_score;

      // If any score is missing, fetch current values from database
      if (lead_score === undefined || responsiveness_score === undefined || conversion_probability_score === undefined) {
        const { data: currentLead } = await supabase
          .from("leads_table")
          .select("lead_score, responsiveness_score, conversion_probability_score")
          .eq("id", id)
          .single();

        if (currentLead) {
          lead_score = lead_score !== undefined ? lead_score : (currentLead.lead_score || 0);
          responsiveness_score = responsiveness_score !== undefined ? responsiveness_score : (currentLead.responsiveness_score || 0);
          conversion_probability_score = conversion_probability_score !== undefined ? conversion_probability_score : (currentLead.conversion_probability_score || 0);
        } else {
          lead_score = lead_score || 0;
          responsiveness_score = responsiveness_score || 0;
          conversion_probability_score = conversion_probability_score || 0;
        }
      }

      // Calculate total_score
      updateData.total_score = (lead_score || 0) + (responsiveness_score || 0) + (conversion_probability_score || 0);
    }

    // Update the lead
    const { data, error } = await supabase
      .from("leads_table")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating lead scores:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, data });
  } catch (error) {
    console.error("PATCH error:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


