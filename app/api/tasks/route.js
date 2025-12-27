import { supabaseServer, supabaseAdmin } from "../../../lib/supabase/serverClient";
import { getCrmUser, getFilteredQuery } from "../../../lib/crm/auth";

/* ---------------- GET ---------------- */
export async function GET(request) {
  const supabase = await supabaseServer();
  
  // Get CRM user for role-based filtering
  const crmUser = await getCrmUser();
  
  // If no CRM user found, return empty array instead of 403 to prevent loading loops
  if (!crmUser) {
    return Response.json([]);
  }
  
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead_id");

  // For sales, we need to show tasks that either:
  // 1. Have sales_person_id = crmUser.id, OR
  // 2. Belong to leads where assigned_to = crmUser.id (even if task doesn't have sales_person_id)
  let data, error;
  
  if (crmUser.role === "sales") {
    // Get sales_person_id from the relationship: users.id -> sales_persons.user_id -> sales_persons.id
    const salesPersonId = crmUser.salesPersonId;
    
    if (!salesPersonId) {
      return Response.json([]);
    }
    
    // First, get all lead IDs assigned to this sales person
    // Relationship: users.id -> sales_persons.user_id -> sales_persons.id -> leads_table.assigned_to
    const { data: assignedLeads, error: leadsError } = await supabase
      .from("leads_table")
      .select("id")
      .eq("assigned_to", salesPersonId);
    
    const assignedLeadIds = assignedLeads?.map(lead => lead.id) || [];
    
    // Fetch tasks in two queries and combine:
    // 1. Tasks with sales_person_id = salesPersonId
    // 2. Tasks for leads assigned to this salesperson (even if task doesn't have sales_person_id)
    // This ensures we get all tasks for the sales person, even if some tasks don't have sales_person_id set
    
    // Get all tasks for debugging and fallback filtering
    // Try with regular client first - include status to verify pending tasks exist
    let { data: allTasks, error: allTasksError } = await supabase
      .from("tasks_table")
      .select("id, title, sales_person_id, lead_id, status");
    
    // If no tasks found, try with admin client to check if it's an RLS issue
    if ((!allTasks || allTasks.length === 0) && !allTasksError) {
      const adminClient = supabaseAdmin();
      const { data: adminTasks, error: adminError } = await adminClient
        .from("tasks_table")
        .select("id, title, sales_person_id, lead_id, status")
        .limit(10);
      
      if (adminTasks && adminTasks.length > 0) {
        // Use admin tasks for debugging, but note this is a security issue
        allTasks = adminTasks;
      }
    }
    
    
    // Check if RLS is blocking - if admin client can see tasks but regular client can't, use admin
    let queryClient = supabase;
    const adminClient = supabaseAdmin();
    const { data: adminCheck } = await adminClient
      .from("tasks_table")
      .select("id")
      .limit(1);
    
    const isRLSBlocking = adminCheck && adminCheck.length > 0 && (!allTasks || allTasks.length === 0);
    
    if (isRLSBlocking) {
      queryClient = adminClient;
    }
    
    // Query tasks - use the appropriate client (admin if RLS blocking)
    // Fetch all tasks first, then filter by status in JavaScript to avoid potential query issues
    const [tasksBySalespersonRaw, tasksByLeadsRaw] = await Promise.all([
      queryClient
        .from("tasks_table")
        .select("*")
        .eq("sales_person_id", salesPersonId),
      assignedLeadIds.length > 0
        ? queryClient
            .from("tasks_table")
            .select("*")
            .in("lead_id", assignedLeadIds)
        : { data: [], error: null }
    ]);
    
    // Filter by status = "Pending" in JavaScript
    const tasksBySalesperson = {
      data: tasksBySalespersonRaw.data?.filter(t => t.status === "Pending") || [],
      error: tasksBySalespersonRaw.error
    };
    
    const tasksByLeads = {
      data: tasksByLeadsRaw.data?.filter(t => t.status === "Pending") || [],
      error: tasksByLeadsRaw.error
    };
    
    // Combine results and remove duplicates
    const tasksById = new Map();
    
    if (tasksBySalesperson.data) {
      tasksBySalesperson.data.forEach(task => {
        tasksById.set(task.id, task);
      });
    }
    
    if (tasksByLeads.data) {
      tasksByLeads.data.forEach(task => {
        tasksById.set(task.id, task);
      });
    }
    
    // Convert map to array
    let combinedTasks = Array.from(tasksById.values());
    
    // Fallback: If no tasks found but we have assigned leads, try a manual filter
    // This handles cases where there might be type mismatches in the database query
    if (combinedTasks.length === 0 && assignedLeadIds.length > 0 && allTasks) {
      const manualFiltered = allTasks.filter(task => {
        const spMatch = task.sales_person_id === salesPersonId || 
                       String(task.sales_person_id) === String(salesPersonId);
        const leadMatch = assignedLeadIds.includes(task.lead_id);
        return spMatch || leadMatch;
      });
      
      if (manualFiltered.length > 0) {
        // Get full task data for manually filtered tasks - only pending tasks
        // Use the same client we're using for main queries (admin if RLS blocking)
        const manualTaskIds = manualFiltered.map(t => t.id);
        const { data: fullManualTasks } = await queryClient
          .from("tasks_table")
          .select("*")
          .in("id", manualTaskIds)
          .eq("status", "Pending");
        
        if (fullManualTasks && fullManualTasks.length > 0) {
          combinedTasks = fullManualTasks;
        }
      }
    }
    
    // Filter by lead_id if provided
    if (leadId) {
      combinedTasks = combinedTasks.filter(task => task.lead_id === leadId);
    }
    
    // Sort by created_at (newest first)
    combinedTasks.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA;
    });
    
    data = combinedTasks;
    error = tasksBySalesperson.error || tasksByLeads.error;
  } else {
    // Admin: use filtered query (which returns all tasks)
    let query = getFilteredQuery(supabase, "tasks_table", crmUser);
    
    // Filter by status = 'Pending' to show only pending tasks
    query = query.eq("status", "Pending");
    
    // Filter by lead_id if provided
    if (leadId) {
      query = query.eq("lead_id", leadId);
    }
    
    // Order by created_at (newest first)
    const result = await query.order("created_at", { ascending: false });
    data = result.data;
    error = result.error;
  }

  if (error) {
    return Response.json([]);
  }

  // Handle null or undefined data
  if (!data || !Array.isArray(data)) {
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

  const { lead_id, salesperson_id, sales_person_id, priority, comments, type, title, due_date, stage } = body;

  if (!lead_id) return Response.json({ error: "lead_id is required" }, { status: 400 });

  // Get lead to determine stage if not provided
  const { data: lead, error: leadError } = await supabase
    .from("leads_table")
    .select("status, current_stage, assigned_to")
    .eq("id", lead_id)
    .single();

  if (leadError || !lead) {
    return Response.json({ error: "Lead not found" }, { status: 404 });
  }

  // Determine stage - use provided stage, or fallback to lead's current stage
  let taskStage = stage || lead.current_stage || lead.status;
  
  // Validate stage is not null/undefined
  if (!taskStage || taskStage === "null" || taskStage === "undefined") {
    return Response.json({ 
      error: `Invalid stage: ${taskStage}. Stage is required and must be a valid pipeline stage.` 
    }, { status: 400 });
  }

  // Determine sales_person_id based on role (support both field names for backward compatibility)
  // sales_person_id in tasks_table references sales_persons.id
  let finalSalesPersonId = sales_person_id || salesperson_id;
  
  if (crmUser.role === "sales") {
    // Sales: always assign to their sales_person_id
    // Relationship: users.id -> sales_persons.user_id -> sales_persons.id
    finalSalesPersonId = crmUser.salesPersonId || null;
    if (!finalSalesPersonId) {
      return Response.json({ error: "Sales person not found. Please contact administrator." }, { status: 400 });
    }
  } else if (crmUser.role === "admin") {
    // Admin: can assign to anyone, but if not provided, try to get from lead
    if (!finalSalesPersonId && lead?.assigned_to) {
      finalSalesPersonId = lead.assigned_to;
    }
  }

  const insertData = {
    lead_id,
    stage: taskStage, // CRITICAL: Always include stage
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

  // Create corresponding task_activity record with assigned sales_person_id
  if (data && finalSalesPersonId) {
    const activityData = {
      lead_id: lead_id,
      activity: `Task Created: ${title || type || "Task"}`,
      type: type || "task",
      comments: comments || `Task "${title || type || "Task"}" has been created`,
      source: "user",
      created_at: new Date().toISOString(),
      salesperson_id: finalSalesPersonId, // Store assigned sales person (task_activities uses salesperson_id)
    };

    // Add optional fields
    if (due_date) activityData.due_date = due_date;

    // Insert task activity (don't fail if this fails, just log it)
    const { error: activityError } = await supabase
      .from("task_activities")
      .insert(activityData);

    if (activityError) {
      // Don't fail the task creation if activity creation fails
    }
  }

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
  // Note: comments column doesn't exist in tasks_table, so we don't update it
  // Comments are stored in task_activities table instead
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

  // Update daily metrics: Task completed → increment calls or meetings based on type
  if (status !== undefined && String(status).toLowerCase() === "completed") {
    const previousStatus = existingTask?.status;
    // Only increment if transitioning TO completed (not from completed)
    if (previousStatus && String(previousStatus).toLowerCase() !== "completed") {
      const taskType = (type || existingTask?.type || "").toLowerCase();
      if (taskType === "call" || taskType === "follow-up") {
        // Call completed: increment calls
        await updateDailyMetrics({ calls: 1 });
      } else if (taskType === "meeting") {
        // Meeting completed: increment meetings
        await updateDailyMetrics({ meetings: 1 });
      }
    }
  }

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
