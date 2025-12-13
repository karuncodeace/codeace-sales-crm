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

  // For salesperson, we need to show tasks that either:
  // 1. Have sales_person_id = crmUser.id, OR
  // 2. Belong to leads where assigned_to = crmUser.id (even if task doesn't have sales_person_id)
  let data, error;
  
  if (crmUser.role === "salesperson") {
    // First, get all lead IDs assigned to this salesperson
    const { data: assignedLeads, error: leadsError } = await supabase
      .from("leads_table")
      .select("id")
      .eq("assigned_to", crmUser.id);
    
    const assignedLeadIds = assignedLeads?.map(lead => lead.id) || [];
    
    console.log("🔍 Tasks API: Fetching tasks for salesperson", { 
      userId: crmUser.id, 
      email: crmUser.email,
      assignedLeadIds: assignedLeadIds.length,
      leadId: leadId || "all"
    });
    
    // Fetch tasks in two queries and combine:
    // 1. Tasks with sales_person_id = crmUser.id
    // 2. Tasks for leads assigned to this salesperson
    const [tasksBySalesperson, tasksByLeads] = await Promise.all([
      supabase
        .from("tasks_table")
        .select("*")
        .eq("sales_person_id", crmUser.id),
      assignedLeadIds.length > 0
        ? supabase
            .from("tasks_table")
            .select("*")
            .in("lead_id", assignedLeadIds)
        : { data: [], error: null }
    ]);
    
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
    
    // For debugging
    const { data: allTasks } = await supabase
      .from("tasks_table")
      .select("id, title, sales_person_id, lead_id");
    
    if (allTasks) {
      console.log("🔍 DEBUG: All tasks in database:", {
        totalTasks: allTasks?.length || 0,
        tasksWithSalesPersonId: allTasks?.filter(t => t.sales_person_id).length || 0,
        tasksForAssignedLeads: allTasks?.filter(t => assignedLeadIds.includes(t.lead_id)).length || 0,
        uniqueSalesPersonIds: [...new Set(allTasks?.map(t => t.sales_person_id).filter(Boolean))],
        lookingFor: crmUser.id,
        matchingTasks: allTasks?.filter(t => t.sales_person_id === crmUser.id || assignedLeadIds.includes(t.lead_id)).length || 0,
        sampleTasks: allTasks?.slice(0, 5).map(t => ({ id: t.id, title: t.title, sales_person_id: t.sales_person_id, lead_id: t.lead_id }))
      });
    }
    
    console.log("✅ Tasks API: Query result", { 
      dataCount: data?.length || 0, 
      returnedTaskIds: data?.map(t => ({ id: t.id, title: t.title, sales_person_id: t.sales_person_id })) || []
    });
  } else {
    // Admin: use filtered query (which returns all tasks)
    let query = getFilteredQuery(supabase, "tasks_table", crmUser);
    
    console.log("🔍 Tasks API: Fetching tasks for admin", { 
      userId: crmUser.id, 
      email: crmUser.email,
      leadId: leadId || "all"
    });
    
    // Filter by lead_id if provided
    if (leadId) {
      query = query.eq("lead_id", leadId);
    }
    
    // Order by created_at (newest first)
    const result = await query.order("created_at", { ascending: false });
    data = result.data;
    error = result.error;
    
    console.log("✅ Tasks API: Query result", { 
      dataCount: data?.length || 0, 
      returnedTaskIds: data?.map(t => ({ id: t.id, title: t.title, sales_person_id: t.sales_person_id })) || []
    });
  }

  if (error) {
    console.error("Tasks API Error:", error.message);
    return Response.json([]);
  }

  console.log("✅ Tasks API: Query result", { 
    dataCount: data?.length || 0, 
    returnedTaskIds: data?.map(t => ({ id: t.id, title: t.title, sales_person_id: t.sales_person_id })) || []
  });

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
  let finalSalesPersonId = sales_person_id || salesperson_id;
  
  if (crmUser.role === "salesperson") {
    // Salesperson: always assign to themselves
    finalSalesPersonId = crmUser.id;
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
      console.error("Error creating task activity:", activityError);
      // Don't fail the task creation if activity creation fails
    } else {
      console.log("Task activity created successfully for task:", data.id);
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
