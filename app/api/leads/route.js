import { supabaseServer, supabaseAdmin } from "../../../lib/supabase/serverClient";
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
  
  // Exclude lost / disqualified / junk leads from the UI by default
  // Keep checks broad to handle legacy values as well
  query = query
    .neq("status", "Disqualified")
    .neq("status", "Lost Lead")
    .neq("status", "Junk Lead")
    .neq("status", "Junk");
  
  // Order by created_at (descending to show newest leads first)
  const { data, error } = await query.order("created_at", { ascending: false });

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
    alternative_phone_number: lead.alternative_phone_number || null,
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
      first_call_done: lead.first_call_done,
      meeting_status: lead.meeting_status,
      response_status: lead.response_status,
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

  // Get CRM user
  const crmUser = await getCrmUser();
  if (!crmUser) {
    return Response.json({ error: "Not authorized for CRM" }, { status: 403 });
  }

  const body = await request.json();
  const {
    name,
    phone,
    alternative_phone_number,
    email,
    contactName,
    source,
    status,
    priority,
    companySize,
    turnover,
    industryType,
    assignedTo,
  } = body;

  // Basic validation
  if (!name || !phone || !email || !contactName || !source) {
    return Response.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

   /**
    * Determine finalAssignedTo
    * --------------------------------
    * SALES:
    *  - Always assign to themselves
    * ADMIN:
    *  - Must explicitly choose salesperson
    */
   let finalAssignedTo = null;

  if (crmUser.role === "sales") {
    if (!crmUser.salesPersonId) {
      return Response.json(
        { error: "Sales person not mapped. Contact admin." },
        { status: 400 }
      );
    }
    finalAssignedTo = crmUser.salesPersonId;
  }

  if (crmUser.role === "admin") {
    if (!assignedTo) {
      return Response.json(
        { error: "Admin must select a salesperson for manual lead" },
        { status: 400 }
      );
    }
    finalAssignedTo = assignedTo;
  }

  /**
   * 🚨 HARD GUARD (MOST IMPORTANT)
   * Manual lead MUST have assigned_to
   */
  if (!finalAssignedTo) {
    return Response.json(
      { error: "Manual lead must be assigned to a salesperson" },
      { status: 400 }
    );
  }

  // Final insert payload
  const insertData = {
    lead_name: name,
    email,
    phone,
    alternative_phone_number: alternative_phone_number || null,
    lead_source: source,     // meta_ads / google_ads / referral etc
    assigned_to: finalAssignedTo,
    is_manual: true,         // 🔥 BLOCKS AUTO ASSIGN TRIGGER
    status: status || "New",
    // Set lead_qualification based on initial priority (Hot -> Qualified, Cold -> Unqualified)
    lead_qualification: (function(p) {
      if (!p) return null;
      const pp = String(p).trim().toLowerCase();
      if (pp === "hot") return "Qualified";
      if (pp === "cold") return "Unqualified";
      return null;
    })(priority),

    // Optional fields
    contact_name: contactName || null,
    priority: priority || "Warm",
    company_size: companySize || null,
    turnover: turnover || null,
    industry_type: industryType || null,
  };

  const { data, error } = await supabase
    .from("leads_table")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Automatically create initial task for new lead
  // This replaces the previous database trigger-based approach
  // Uses admin client to bypass RLS for system operations
  try {
    const leadId = data.id;
    const leadName = data.lead_name || name;
    const salesPersonId = data.assigned_to;

    // Validate required data
    if (!salesPersonId) {
      console.warn("Cannot create initial task: lead has no assigned_to", { leadId, leadName });
      // Continue without creating task - lead creation still succeeds
    } else {
      const taskTitle = `${leadName} -- Initial call`;
      
      // Use admin client for system operations (bypasses RLS)
      const adminSupabase = supabaseAdmin();
      
      // Check if an initial task already exists for this lead (duplicate protection)
      // Use a simple check: any pending task with "Initial call" in title for this lead
      let hasExistingTask = false;
      try {
        const { data: existingTasks, error: checkError } = await adminSupabase
          .from("tasks_table")
          .select("id, title, status")
          .eq("lead_id", leadId)
          .ilike("title", "%Initial call%")
          .eq("status", "Pending")
          .limit(1);

        if (checkError) {
          console.warn("Error checking for existing initial task (will attempt creation anyway):", {
            error: checkError.message,
            code: checkError.code,
            leadId,
          });
          // Continue to try creating task anyway (fail-safe)
        } else {
          hasExistingTask = existingTasks && existingTasks.length > 0;
        }
      } catch (checkException) {
        console.warn("Exception during duplicate check (will attempt creation anyway):", checkException);
        // Continue to try creating task anyway (fail-safe)
      }
      
      // Only create task if no initial task exists
      if (!hasExistingTask) {
        // Calculate due date: current date + 1 day
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
        // Set time to start of day for consistency
        dueDate.setHours(0, 0, 0, 0);
        const dueDateISO = dueDate.toISOString();

        // Create initial task
        // Build task data - stage is optional in case schema doesn't require it
        const taskData = {
          lead_id: leadId,
          sales_person_id: salesPersonId,
          title: taskTitle,
          type: "Call",
          status: "Pending",
          due_date: dueDateISO,
        };
        
        // Add stage if it exists in schema (some schemas may not have this field)
        // Try to include it, but if it causes an error, we'll handle it
        taskData.stage = "New";

        console.log("Attempting to create initial task:", {
          leadId,
          leadName,
          salesPersonId,
          taskTitle,
          dueDateISO,
          taskData,
        });

        const { data: createdTask, error: taskError } = await adminSupabase
          .from("tasks_table")
          .insert(taskData)
          .select();

        if (taskError) {
          // Log detailed error but don't fail lead creation
          console.error("❌ Failed to create initial task for lead:", {
            leadId,
            leadName,
            salesPersonId,
            taskData,
            error: taskError.message,
            code: taskError.code,
            details: taskError.details,
            hint: taskError.hint,
          });
          
          // If error is about stage field, try without it
          if (taskError.message && (taskError.message.includes("stage") || taskError.message.includes("column"))) {
            console.log("Retrying task creation without stage field...");
            const taskDataWithoutStage = { ...taskData };
            delete taskDataWithoutStage.stage;
            
            const { data: retryTask, error: retryError } = await adminSupabase
              .from("tasks_table")
              .insert(taskDataWithoutStage)
              .select();
            
            if (retryError) {
              console.error("❌ Retry also failed:", retryError.message);
            } else if (retryTask && retryTask.length > 0) {
              console.log("✅ Successfully created initial task (without stage):", {
                taskId: retryTask[0].id,
                leadId,
                title: retryTask[0].title,
              });
            }
          }
        } else if (createdTask && createdTask.length > 0) {
          const task = Array.isArray(createdTask) ? createdTask[0] : createdTask;
          console.log("✅ Successfully created initial task:", {
            taskId: task.id,
            leadId,
            title: task.title,
            stage: task.stage,
            status: task.status,
          });
        } else {
          console.warn("⚠️ Task creation returned no data and no error:", { 
            leadId,
            createdTask,
            hasData: !!createdTask,
            isArray: Array.isArray(createdTask),
          });
        }
      } else {
        console.log("⏭️ Skipping initial task creation - task already exists:", {
          leadId,
          existingTask: existingTasks[0],
        });
      }
    }
  } catch (taskCreationError) {
    // Log error but don't fail lead creation
    console.error("Error during initial task creation:", {
      error: taskCreationError.message,
      stack: taskCreationError.stack,
      leadId: data.id,
    });
  }

  return Response.json({
    success: true,
    lead: {
      id: data.id,
      name: data.lead_name,
      phone: data.phone || "",
      alternative_phone_number: data.alternative_phone_number || null,
      email: data.email || "",
      contactName: data.contact_name || "",
      source: data.lead_source,
      status: data.status,
      priority: data.priority,
      assignedTo: data.assigned_to,
      companySize: data.company_size || "",
      turnover: data.turnover || "",
      industryType: data.industry_type || "",
      createdAt: data.created_at,
    },
  });
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
    const { id, name, phone, alternative_phone_number, email, contactName, source, status, priority, companySize, turnover, industryType, assignedTo, current_stage, next_stage_notes, first_call_done, lead_qualification, meeting_status, response_status } = body;

    if (!id) {
      return Response.json({ error: "Lead ID is required" }, { status: 400 });
    }

    // Check if user has access to this lead
    let query = getFilteredQuery(supabase, "leads_table", crmUser);
    const { data: existingLead, error: accessError } = await query
      .select("id, lead_name, status, assigned_to, first_call_done, lead_qualification, meeting_status, response_status")
      .eq("id", id)
      .single();

    if (accessError || !existingLead) {
      return Response.json({ error: "Lead not found or access denied" }, { status: 404 });
    }

    const previousStatus = existingLead?.status;
    const previousAssignedTo = existingLead?.assigned_to;
    const previousFirstCallDone = existingLead?.first_call_done;
    const previousLeadQualification = existingLead?.lead_qualification;
    const previousMeetingStatus = existingLead?.meeting_status;
    const previousResponseStatus = existingLead?.response_status;
    const leadName = existingLead?.lead_name || "";

    const updateData = {};
    if (name !== undefined) updateData.lead_name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (alternative_phone_number !== undefined) updateData.alternative_phone_number = alternative_phone_number;
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
    if (first_call_done !== undefined) updateData.first_call_done = first_call_done;
    if (lead_qualification !== undefined) updateData.lead_qualification = lead_qualification;
    if (meeting_status !== undefined) updateData.meeting_status = meeting_status;
    if (response_status !== undefined) updateData.response_status = response_status;
    // If priority is being updated, also set lead_qualification accordingly:
    if (priority !== undefined) {
      const p = String(priority || "").trim().toLowerCase();
      if (p === "hot") {
        updateData.lead_qualification = "Qualified";
      } else if (p === "cold") {
        updateData.lead_qualification = "Unqualified";
      }
    }
    
    // Track when specific fields are updated for dashboard metrics
    // Update last_attempted_at when these fields change
    const shouldUpdateLastAttempted = 
      (first_call_done !== undefined && first_call_done !== previousFirstCallDone) ||
      (lead_qualification !== undefined && lead_qualification !== previousLeadQualification) ||
      (meeting_status !== undefined && meeting_status !== previousMeetingStatus) ||
      (response_status !== undefined && response_status !== previousResponseStatus) ||
      (status !== undefined && status !== previousStatus && [
        "responded",
        "converted",
        "srs",
        "demo completed",
        "demo scheduled"
      ].includes(String(status).toLowerCase()));
    
    if (shouldUpdateLastAttempted) {
      updateData.last_attempted_at = new Date().toISOString();
    }
    
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

    // Note: Initial task creation for new leads is handled in POST handler
    // Frontend should NOT create tasks when status changes to "New"
    
    // Only create tasks for status changes to non-"New" stages (if needed)
    // Skip "New" stage as initial task is created during lead creation
    if (status !== undefined && previousStatus !== undefined && String(status).toLowerCase() !== String(previousStatus).toLowerCase()) {
      const s = String(status).toLowerCase();
      
      // Skip task creation for "New" stage - handled by database trigger
      if (!(s === "new" || s === "new leads")) {
        let title = `Task for ${leadName}`;
        let type = "Follow-Up";
        
        if (s === "responded") {
          title = `Follow-up to ${leadName}`;
          type = "Follow-Up";
        } else if (s === "not responded" || s === "no response" || s === "not_responded") {
          title = `Re-attempt contact: ${leadName}`;
          type = "Call";
        } else if (s === "qualified") {
          title = `Qualification call with ${leadName}`;
          type = "Call";
        } else if (s === "srs") {
          title = `Prepare SRS for ${leadName}`;
          type = "Proposal";
        } else if (s === "converted") {
          title = `Closure with ${leadName}`;
          type = "Meeting";
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
                assigned_to: crmUser.id, // Store assigned sales person
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
      } else if (newStatus === "srs" && oldStatus !== "srs") {
        // SRS created/sent: increment proposals (SRS stage)
        await updateDailyMetrics({ proposals: 1 });
      } else if ((newStatus === "converted" || newStatus === "won" || newStatus === "closed") && 
                 oldStatus !== "converted" && oldStatus !== "won" && oldStatus !== "closed") {
        // Deal closed-won: increment converted
        await updateDailyMetrics({ converted: 1 });
      }
      
      // If status changed to Proposal, ensure the lead is added to prospects_table
      try {
        if (newStatus === "proposal") {
          const admin = supabaseAdmin();
          // check if already present
          const { data: existingProspect, error: prospectCheckError } = await admin
            .from("prospects_table")
            .select("id")
            .eq("lead_id", id)
            .single();
          if (!existingProspect) {
            await admin.from("prospects_table").insert({ lead_id: id, created_at: new Date().toISOString() });
          }
        }
      } catch (err) {
        console.warn("Failed to add lead to prospects_table on status=Proposal:", err);
      }
    }

    // Map the updated lead to frontend format
    const formattedLead = {
      id: updatedLead.id,
      name: updatedLead.lead_name,
      phone: updatedLead.phone || "",
      alternative_phone_number: updatedLead.alternative_phone_number || null,
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
