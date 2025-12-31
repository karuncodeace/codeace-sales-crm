import { supabaseServer } from "../../../lib/supabase/serverClient";
import { getCrmUser, getFilteredQuery } from "../../../lib/crm/auth";
import { updateDailyMetrics } from "../../../lib/sales-metrics/updateMetrics";

export async function GET() {
  const supabase = await supabaseServer();
  
  // Get CRM user for role-based filtering
  const crmUser = await getCrmUser();
  
  // If no CRM user found, return empty array instead of 403 to prevent loading loops
  if (!crmUser) {
    console.warn("Leads API: No CRM user found");
    return Response.json([]);
  }

  // Log user info for debugging
  if (crmUser.role === "sales" && !crmUser.salesPersonId) {
    console.warn("Leads API: Sales user has no salesPersonId", {
      userId: crmUser.id,
      email: crmUser.email,
      role: crmUser.role
    });
  }

  // Get filtered query based on role
  let query = getFilteredQuery(supabase, "leads_table", crmUser);
  
  // Order by id (descending to show newest leads first)
  const { data, error } = await query.order("id", { ascending: true });

  if (error) {
    console.error("Leads API: Query error", error.message);
    // Return empty array instead of error to prevent loading loops
    return Response.json([]);
  }

  // Handle null or undefined data
  if (!data || !Array.isArray(data)) {
    return Response.json([]);
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
  
  // Get CRM user for role-based assignment
  const crmUser = await getCrmUser();
  if (!crmUser) {
    return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
  }
  
  const body = await request.json();
  const { name, phone, email, contactName, source, status, priority, companySize, turnover, industryType, assignedTo } = body;

  // Validate required fields
  if (!name || !phone || !email || !contactName || !source) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Determine assigned_to based on role
  // assigned_to in leads_table references sales_persons.id
  let finalAssignedTo = assignedTo;
  if (crmUser.role === "sales") {
    // Sales: always assign to their sales_person_id
    // Relationship: users.id -> sales_persons.user_id -> sales_persons.id
    finalAssignedTo = crmUser.salesPersonId || null;
    if (!finalAssignedTo) {
      return Response.json({ error: "Sales person not found. Please contact administrator." }, { status: 400 });
    }
  } else if (crmUser.role === "admin") {
    // Admin: can assign to any sales_person_id (use provided assignedTo or leave null)
    finalAssignedTo = assignedTo || null;
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
      assigned_to: finalAssignedTo,
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

  // Note: Task creation for "New" stage is handled by database trigger
  // Frontend should NOT create tasks here

  // Update daily metrics: Lead created → increment leads
  await updateDailyMetrics({ leads: 1 });

  return Response.json({ success: true, lead: newLead });
}

export async function PATCH(request) {
  try {
    const supabase = await supabaseServer();
    
    // Get CRM user for role-based filtering
    const crmUser = await getCrmUser();
    if (!crmUser) {
      return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
    }
    
    const body = await request.json();
    const { id, name, phone, email, contactName, source, status, priority, companySize, turnover, industryType, assignedTo, current_stage, next_stage_notes } = body;

    if (!id) {
      return Response.json({ error: "Lead ID is required" }, { status: 400 });
    }

    // Check if user has access to this lead
    let query = getFilteredQuery(supabase, "leads_table", crmUser);
    const { data: existingLead, error: accessError } = await query
      .select("id, lead_name, status, assigned_to")
      .eq("id", id)
      .single();

    if (accessError || !existingLead) {
      return Response.json({ error: "Lead not found or access denied" }, { status: 404 });
    }

    const previousStatus = existingLead?.status;
    const previousAssignedTo = existingLead?.assigned_to;
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
    }
    if (current_stage !== undefined) updateData.current_stage = current_stage;
    if (next_stage_notes !== undefined) updateData.next_stage_notes = next_stage_notes;
    
    // Handle assigned_to update
    // assigned_to in leads_table references sales_persons.id
    let finalAssignedTo = assignedTo;
    if (assignedTo !== undefined) {
      if (crmUser.role === "sales") {
        // Sales can only assign to their sales_person_id
        // Relationship: users.id -> sales_persons.user_id -> sales_persons.id
        finalAssignedTo = crmUser.salesPersonId || null;
        if (!finalAssignedTo) {
          return Response.json({ error: "Sales person not found. Please contact administrator." }, { status: 400 });
        }
      } else if (crmUser.role === "admin") {
        // Admin can assign to any sales_person_id
        finalAssignedTo = assignedTo || null;
      }
      updateData.assigned_to = finalAssignedTo;
    }

    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from("leads_table")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }

    const updatedLead = data[0];

    // Note: Task creation for "New" stage is handled by database trigger
    // Frontend should NOT create tasks when status changes to "New"
    
    // Only create tasks for status changes to non-"New" stages (if needed)
    // But skip "New" stage as it's handled by trigger
    if (status !== undefined && previousStatus !== undefined && String(status).toLowerCase() !== String(previousStatus).toLowerCase()) {
      const s = String(status).toLowerCase();
      
      // Skip task creation for "New" stage - handled by database trigger
      if (s !== "new") {
        let title = `Task for ${leadName}`;
        let type = "Follow-Up";
        
        if (s === "contacted") {
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

        try {
          const { data: statusTask, error: taskError } = await supabase
            .from("tasks_table")
            .insert({
              lead_id: id,
              title,
              type,
              status: "Pending",
              sales_person_id: crmUser.id, // Auto-assign task to current user
            })
            .select()
            .single();

          if (taskError) {
            // Don't fail the lead update if task creation fails
          } else if (statusTask && crmUser.id) {
            // Create corresponding task_activity record with assigned salesperson_id
            const { error: activityError } = await supabase
              .from("task_activities")
              .insert({
                lead_id: id,
                activity: `Task Created: ${title}`,
                type: "task",
                comments: `Task "${title}" has been created due to status change`,
                source: "user",
                created_at: new Date().toISOString(),
                salesperson_id: crmUser.id, // Store assigned sales person
              });

            if (activityError) {
              // Don't fail if activity creation fails - it's optional
            }
          }
        } catch (err) {
          // Don't fail the lead update if task/activity creation fails
        }
      }
    }

    // Update daily metrics based on status changes
    if (status !== undefined && previousStatus !== undefined && status !== previousStatus) {
      const newStatus = String(status).toLowerCase();
      const oldStatus = String(previousStatus).toLowerCase();
      
      // Only increment if transitioning TO these statuses (not from them)
      if (newStatus === "qualified" && oldStatus !== "qualified") {
        // Lead → Prospect: increment prospects
        await updateDailyMetrics({ prospects: 1 });
      } else if (newStatus === "proposal" && oldStatus !== "proposal") {
        // Proposal sent: increment proposals
        await updateDailyMetrics({ proposals: 1 });
      } else if ((newStatus === "converted" || newStatus === "won" || newStatus === "closed") && 
                 oldStatus !== "converted" && oldStatus !== "won" && oldStatus !== "closed") {
        // Deal closed-won: increment converted
        await updateDailyMetrics({ converted: 1 });
      }
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
  } catch (error) {
    return Response.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
