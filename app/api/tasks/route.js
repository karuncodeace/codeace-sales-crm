import { supabaseServer } from "../../../lib/supabase/serverClient";
import { getCrmUser, getFilteredQuery } from "../../../lib/crm/auth";
import { updateDailyMetrics } from "../../../lib/sales-metrics/updateMetrics";

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

  let data, error;
  
  if (crmUser.role === "sales") {
    // Get sales_person_id from the relationship: users.id -> sales_persons.user_id -> sales_persons.id
    const salesPersonId = crmUser.salesPersonId;
    
    if (!salesPersonId) {
      console.warn("Tasks API: Sales user has no salesPersonId", {
        userId: crmUser.id,
        email: crmUser.email,
        role: crmUser.role
      });
      return Response.json([]);
    }
    
    // Directly query tasks_table for the current logged-in user's sales_person_id
    // Note: Only sales_person_id exists (salesperson_id column doesn't exist based on diagnostics)
    let query = supabase
      .from("tasks_table")
      .select("*")
      .eq("sales_person_id", salesPersonId);
    
    // Filter by lead_id if provided
    if (leadId) {
      query = query.eq("lead_id", leadId);
    }
    
    // Order by created_at (newest first)
    const result = await query.order("created_at", { ascending: false });
    
    data = result.data || [];
    error = result.error;
    
    if (error) {
      console.error("Tasks API: Query error", error.message);
    }
  } else {
    // Admin: use filtered query (which returns all tasks)
    let query = getFilteredQuery(supabase, "tasks_table", crmUser);
    
    // Don't filter by status - return all tasks (pending and completed)
    // Frontend will handle filtering and separation
    
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

  // DEBUG: Log the title being received
  console.log("📝 Task Creation - Title received from frontend:", title);
  console.log("📝 Task Creation - Full body:", JSON.stringify(body, null, 2));

  if (!lead_id) return Response.json({ error: "lead_id is required" }, { status: 400 });

  // Get lead to determine stage and priority if not provided
  const { data: lead, error: leadError } = await supabase
    .from("leads_table")
    .select("status, current_stage, assigned_to, priority")
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
    priority: priority || lead.priority || "Medium", // Use lead's priority if not provided
    comments: comments || null,
  };

  // Add optional fields
  if (finalSalesPersonId) insertData.sales_person_id = finalSalesPersonId;
  // Always use the provided title - do NOT generate titles, use exactly what user provided
  if (title && title.trim()) {
    insertData.title = title.trim();
    // DEBUG: Log the title being inserted
    console.log("📝 Task Creation - Title being inserted:", insertData.title);
  } else {
    // If no title provided, return error (title should always be provided)
    console.error("❌ Task Creation - No title provided!");
    return Response.json({ error: "Task title is required" }, { status: 400 });
  }
  if (due_date) insertData.due_date = due_date;

  // Check for existing task with same lead_id, stage, and title (to avoid unique constraint violation)
  // The uq_task_per_stage constraint includes lead_id, stage, and title
  // Use case-insensitive comparison and trim whitespace for title matching
  // IMPORTANT: Don't filter by status - check ALL tasks regardless of status
  const titleToMatch = insertData.title.trim().toLowerCase();
  
  console.log("🔍 Task Creation - Checking for duplicates:", {
    lead_id,
    stage: taskStage,
    title: insertData.title,
    titleToMatch
  });
  
  const { data: existingTasks, error: checkError } = await supabase
    .from("tasks_table")
    .select("id, title, status, stage")
    .eq("lead_id", lead_id)
    .eq("stage", taskStage);
    // NOTE: Not filtering by status - check ALL tasks (Pending, Completed, etc.)

  if (checkError) {
    console.error("❌ Task Creation - Error checking for duplicates:", checkError);
    // Continue with insert even if check fails
  }

  // Check if any existing task has the same title (case-insensitive, trimmed)
  const existingTask = existingTasks?.find(
    (task) => task.title?.trim().toLowerCase() === titleToMatch
  );

  if (existingTask) {
    console.warn("⚠️ Task Creation - Task already exists for this lead, stage, and title:", {
      lead_id,
      stage: taskStage,
      title: insertData.title,
      existingTask: existingTask,
      allMatchingTasks: existingTasks
    });
    // Return the existing task instead of creating a duplicate
    return Response.json({ 
      success: true, 
      task: existingTask,
      message: "Task already exists for this stage and title"
    });
  }
  
  console.log("✅ Task Creation - No duplicate found, proceeding with insert");

  // DEBUG: Log the full insert data
  console.log("📝 Task Creation - Full insertData:", JSON.stringify(insertData, null, 2));

  const { data, error } = await supabase
    .from("tasks_table")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("❌ Task Creation - Database error:", error);
    // Check if it's a duplicate key error
    if (error.code === '23505' || error.message.includes('duplicate key') || error.message.includes('uq_task_per_stage')) {
      console.error("❌ Task Creation - Duplicate key constraint violation:", {
        errorCode: error.code,
        errorMessage: error.message,
        lead_id,
        stage: taskStage,
        title: insertData.title
      });
      
      // Try to fetch the existing task (matching lead_id, stage, and title)
      // Use case-insensitive comparison for title
      // IMPORTANT: Don't filter by status - check ALL tasks
      const titleToMatch = insertData.title.trim().toLowerCase();
      
      const { data: existingTasksData, error: fetchError } = await supabase
        .from("tasks_table")
        .select("*")
        .eq("lead_id", lead_id)
        .eq("stage", taskStage);
        // NOTE: Not filtering by status - check ALL tasks
      
      if (fetchError) {
        console.error("❌ Task Creation - Error fetching existing task after duplicate error:", fetchError);
      }
      
      // Find task with matching title (case-insensitive)
      const existingTaskData = existingTasksData?.find(
        (task) => task.title?.trim().toLowerCase() === titleToMatch
      );
      
      if (existingTaskData) {
        console.warn("⚠️ Task Creation - Duplicate key error, returning existing task:", {
          lead_id,
          stage: taskStage,
          title: insertData.title,
          existingTask: existingTaskData,
          allMatchingTasks: existingTasksData
        });
        return Response.json({ 
          success: true, 
          task: existingTaskData,
          message: "Task already exists for this stage and title"
        });
      } else {
        // Couldn't find the existing task - this shouldn't happen, but log it
        console.error("❌ Task Creation - Duplicate key error but couldn't find existing task:", {
          lead_id,
          stage: taskStage,
          title: insertData.title,
          allTasksForLeadStage: existingTasksData
        });
      }
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  // DEBUG: Log what was returned from database
  console.log("📝 Task Creation - Task returned from database:", JSON.stringify(data, null, 2));
  console.log("📝 Task Creation - Title in returned task:", data?.title);

  // Create corresponding task_activity record with assigned sales_person_id
  if (data && finalSalesPersonId) {
    const activityData = {
      lead_id: lead_id,
      activity: `Task Created: ${title || type || "Task"}`,
      type: type || "task",
      comments: comments || `Task "${title || type || "Task"}" has been created`,
      source: "user",
      created_at: new Date().toISOString(),
      assigned_to: finalSalesPersonId, // Store assigned sales person (task_activities uses assigned_to)
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
  if (status !== undefined) {
    updateData.status = status;
    // Set completed_at when marking as completed
    if (String(status).toLowerCase() === "completed") {
      const previousStatus = existingTask?.status;
      // Only set completed_at if transitioning TO completed (not already completed)
      if (!previousStatus || String(previousStatus).toLowerCase() !== "completed") {
        updateData.completed_at = new Date().toISOString();
      }
    } else {
      // Clear completed_at when unmarking as completed
      updateData.completed_at = null;
    }
  }
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

  if (error) {
    console.error("Tasks API PATCH: Update error", {
      error: error.message,
      code: error.code,
      details: error.details,
      taskId: id,
      leadId: lead_id,
    });
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    console.error("Tasks API PATCH: No data returned after update", { taskId: id, leadId: lead_id });
    return Response.json({ error: "Task not found or update failed" }, { status: 404 });
  }

  const updatedTask = Array.isArray(data) ? data[0] : data;

  // Update daily metrics when task is completed (don't fail if this fails)
  if (status !== undefined && String(status).toLowerCase() === "completed") {
    const previousStatus = existingTask?.status;
    // Only increment if transitioning TO completed (not from completed)
    if (previousStatus && String(previousStatus).toLowerCase() !== "completed") {
      try {
        const taskType = (type || updatedTask?.type || existingTask?.type || "").toLowerCase();
        if (taskType === "call" || taskType === "follow-up") {
          await updateDailyMetrics({ calls: 1 });
        } else if (taskType === "meeting") {
          await updateDailyMetrics({ meetings: 1 });
        }
      } catch (metricsError) {
        // Don't fail the task update if metrics update fails
        console.warn("Tasks API PATCH: Failed to update daily metrics", metricsError);
      }
    }
  }

  return Response.json({ success: true, task: updatedTask });
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
