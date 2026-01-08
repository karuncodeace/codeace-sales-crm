/**
 * Metric to Database Query Resolver
 * Maps each metric to a predefined Supabase query
 * NO dynamic SQL - only Supabase query builder
 */

import { supabaseAdmin } from "./supabase/serverClient";
import { convertTimeRangeToDates } from "./timeRange";

/**
 * Executes a predefined database query for a given metric
 * @param {string} metric - The metric name
 * @param {string} table - The table name
 * @param {object} filters - The validated filters
 * @param {object} crmUser - The CRM user for role-based filtering
 * @param {string} scope - The data scope: "user" or "global"
 * @returns {Promise<{value: number, data?: any[]}>}
 */
export async function executeMetricQuery(metric, table, filters, crmUser, scope = "global") {
  const supabase = supabaseAdmin();
  const salesPersonId = crmUser?.role === "sales" ? crmUser.salesPersonId : null;
  
  // Only apply user filtering when scope is "user"
  const shouldFilterByUser = scope === "user" && salesPersonId;

  // Convert time_range filter to dates if present
  let startDate = null;
  let endDate = null;
  if (filters?.time_range) {
    const { startDate: sd, endDate: ed } = convertTimeRangeToDates(filters.time_range);
    startDate = sd.toISOString();
    endDate = ed.toISOString();
    // Remove time_range from filters as we'll use date filters
    const { time_range, ...restFilters } = filters;
    filters = restFilters;
  }

  // Build base query with role-based filtering
  let query;

  switch (metric) {
    case "lead_count":
      query = supabase
        .from("leads_table")
        .select("*", { count: "exact", head: true });

      if (shouldFilterByUser) {
        query = query.eq("assigned_to", salesPersonId);
      }

      if (startDate) query = query.gte("created_at", startDate);
      if (endDate) query = query.lte("created_at", endDate);

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { count: leadCount, error: leadError } = await query;
      if (leadError) {
        throw new Error(`Supabase query error: ${leadError.message || leadError}`);
      }
      return { value: leadCount || 0 };

    case "qualified_lead_count":
      query = supabase
        .from("leads_table")
        .select("id, lead_qualification, created_at, last_attempted_at, assigned_to");

      if (shouldFilterByUser) {
        query = query.eq("assigned_to", salesPersonId);
      }

      const { data: qualifiedLeads, error: qualifiedError } = await query;
      if (qualifiedError) {
        throw new Error(`Supabase query error: ${qualifiedError.message || qualifiedError}`);
      }
      const qualifiedCount = (qualifiedLeads || []).filter(lead => {
        const qualification = String(lead.lead_qualification || "").toLowerCase();
        if (!qualification.includes("qualified")) return false;

        // Apply date filtering if time_range was specified
        if (startDate || endDate) {
          const dateToCheck = lead.last_attempted_at || lead.created_at;
          if (!dateToCheck) return false;

          const checkDate = new Date(dateToCheck);
          if (startDate && checkDate < new Date(startDate)) return false;
          if (endDate && checkDate > new Date(endDate)) return false;
        }

        return true;
      }).length;

      return { value: qualifiedCount };

    case "prospect_count":
      query = supabase
        .from("prospects_table")
        .select("*", { count: "exact", head: true });

      if (shouldFilterByUser) {
        query = query.eq("assigned_to", salesPersonId);
      }

      if (startDate) query = query.gte("created_at", startDate);
      if (endDate) query = query.lte("created_at", endDate);

      const { count: prospectCount, error: prospectError } = await query;
      if (prospectError) {
        throw new Error(`Supabase query error: ${prospectError.message || prospectError}`);
      }
      return { value: prospectCount || 0 };

    case "call_count":
      query = supabase
        .from("leads_table")
        .select("id, first_call_done, last_attempted_at, created_at, assigned_to");

      if (shouldFilterByUser) {
        query = query.eq("assigned_to", salesPersonId);
      }

      const { data: callLeads, error: callError } = await query;
      if (callError) {
        throw new Error(`Supabase query error: ${callError.message || callError}`);
      }
      const callCount = (callLeads || []).filter(lead => {
        const firstCall = String(lead.first_call_done || "").toLowerCase();
        if (firstCall !== "done") return false;

        // Apply date filtering if time_range was specified
        if (startDate || endDate) {
          const dateToCheck = lead.last_attempted_at || lead.created_at;
          if (!dateToCheck) return false;

          const checkDate = new Date(dateToCheck);
          if (startDate && checkDate < new Date(startDate)) return false;
          if (endDate && checkDate > new Date(endDate)) return false;
        }

        return true;
      }).length;

      return { value: callCount };

    case "followup_count":
      query = supabase
        .from("leads_table")
        .select("id, status, last_attempted_at, created_at, assigned_to")
        .eq("status", "Follow up");

      if (shouldFilterByUser) {
        query = query.eq("assigned_to", salesPersonId);
      }

      const { data: followupLeads, error: followupError } = await query;
      if (followupError) {
        throw new Error(`Supabase query error: ${followupError.message || followupError}`);
      }
      const followupCount = (followupLeads || []).filter(lead => {
        // Apply date filtering if time_range was specified
        if (startDate || endDate) {
          const dateToCheck = lead.last_attempted_at || lead.created_at;
          if (!dateToCheck) return false;

          const checkDate = new Date(dateToCheck);
          if (startDate && checkDate < new Date(startDate)) return false;
          if (endDate && checkDate > new Date(endDate)) return false;
        }

        return true;
      }).length;

      return { value: followupCount };

    case "task_pending_count":
      query = supabase
        .from("tasks_table")
        .select("*", { count: "exact", head: true })
        .eq("status", "Pending");

      if (shouldFilterByUser) {
        query = query.eq("sales_person_id", salesPersonId);
      }

      if (startDate) query = query.gte("created_at", startDate);
      if (endDate) query = query.lte("created_at", endDate);

      const { count: pendingTaskCount, error: pendingError } = await query;
      if (pendingError) {
        throw new Error(`Supabase query error: ${pendingError.message || pendingError}`);
      }
      return { value: pendingTaskCount || 0 };

    case "task_overdue_count":
      query = supabase
        .from("tasks_table")
        .select("id, due_date, status, sales_person_id");

      if (shouldFilterByUser) {
        query = query.eq("sales_person_id", salesPersonId);
      }

      const { data: allTasks, error: tasksError } = await query;
      if (tasksError) {
        throw new Error(`Supabase query error: ${tasksError.message || tasksError}`);
      }
      const now = new Date();
      const overdueCount = (allTasks || []).filter(task => {
        if (task.status === "Completed") return false;
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        return dueDate < now;
      }).length;

      return { value: overdueCount };

    case "meeting_scheduled_count":
      query = supabase
        .from("appointments")
        .select("id, status, salesperson_id");

      if (shouldFilterByUser) {
        query = query.eq("salesperson_id", salesPersonId);
      }

      query = query.eq("status", "scheduled");

      if (startDate) query = query.gte("created_at", startDate);
      if (endDate) query = query.lte("created_at", endDate);

      const { count: scheduledCount, error: scheduledError } = await query;
      if (scheduledError) {
        throw new Error(`Supabase query error: ${scheduledError.message || scheduledError}`);
      }
      return { value: scheduledCount || 0 };

    case "meeting_conducted_count":
      query = supabase
        .from("appointments")
        .select("id, status, salesperson_id");

      if (shouldFilterByUser) {
        query = query.eq("salesperson_id", salesPersonId);
      }

      query = query.eq("status", "completed");

      if (startDate) query = query.gte("created_at", startDate);
      if (endDate) query = query.lte("created_at", endDate);

      const { count: conductedCount, error: conductedError } = await query;
      if (conductedError) {
        throw new Error(`Supabase query error: ${conductedError.message || conductedError}`);
      }
      return { value: conductedCount || 0 };

    case "booking_count":
      query = supabase
        .from("bookings")
        .select("*", { count: "exact", head: true });

      if (startDate) query = query.gte("created_at", startDate);
      if (endDate) query = query.lte("created_at", endDate);

      const { count: bookingCount, error: bookingError } = await query;
      if (bookingError) {
        throw new Error(`Supabase query error: ${bookingError.message || bookingError}`);
      }
      return { value: bookingCount || 0 };

    case "conversion_probability":
      // Calculate average conversion probability from existing scores
      query = supabase
        .from("leads_table")
        .select("total_score, status, assigned_to");

      if (shouldFilterByUser) {
        query = query.eq("assigned_to", salesPersonId);
      }

      if (startDate) query = query.gte("created_at", startDate);
      if (endDate) query = query.lte("created_at", endDate);

      const { data: leadsWithScores, error: scoresError } = await query;
      if (scoresError) {
        throw new Error(`Supabase query error: ${scoresError.message || scoresError}`);
      }

      if (!leadsWithScores || leadsWithScores.length === 0) {
        return { value: 0 };
      }

      // Calculate average score (assuming score is 0-100, convert to probability 0-1)
      const validScores = leadsWithScores
        .map(lead => {
          const score = lead.total_score !== null && lead.total_score !== undefined
            ? Number(lead.total_score)
            : null;
          return score !== null ? score / 100 : null;
        })
        .filter(score => score !== null);

      const avgProbability = validScores.length > 0
        ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
        : 0;

      return { value: Math.round(avgProbability * 100) }; // Return as percentage

    case "stage_count":
      query = supabase
        .from("leads_table")
        .select("status, assigned_to");

      if (shouldFilterByUser) {
        query = query.eq("assigned_to", salesPersonId);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (startDate) query = query.gte("created_at", startDate);
      if (endDate) query = query.lte("created_at", endDate);

      const { count: stageCount, error: stageError } = await query;
      if (stageError) {
        throw new Error(`Supabase query error: ${stageError.message || stageError}`);
      }
      return { value: stageCount || 0 };

    default:
      throw new Error(`Unknown metric: ${metric}`);
  }
}

/**
 * Executes a database query based on query type
 * Handles aggregate, record_lookup, field_lookup, and list query types
 * @param {string} queryType - The query type: "aggregate", "record_lookup", "field_lookup", "list"
 * @param {string} metric - The metric name (required only for aggregate)
 * @param {string} table - The table name
 * @param {string} field - The field name (required only for field_lookup)
 * @param {object} filters - The validated filters
 * @param {object} crmUser - The CRM user for role-based filtering
 * @param {string} scope - The data scope: "user" or "global"
 * @returns {Promise<{value?: any, data?: any[], record?: any}>}
 */
export async function executeQuery(queryType, metric, table, field, filters, crmUser, scope = "global") {
  const supabase = supabaseAdmin();
  const salesPersonId = crmUser?.role === "sales" ? crmUser.salesPersonId : null;
  
  // Only apply user filtering when scope is "user"
  const shouldFilterByUser = scope === "user" && salesPersonId;

  // Build base query
  let query = supabase.from(table);

  // Apply user filtering if needed
  if (shouldFilterByUser) {
    // Determine the user filter column based on table
    if (table === "leads_table" || table === "prospects_table") {
      query = query.eq("assigned_to", salesPersonId);
    } else if (table === "tasks_table") {
      query = query.eq("sales_person_id", salesPersonId);
    } else if (table === "appointments") {
      query = query.eq("salesperson_id", salesPersonId);
    }
    // bookings table doesn't have user filtering
  }

  // Apply filters dynamically
  if (filters && typeof filters === "object") {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined) {
        // Handle special filter keys
        if (key === "time_range") {
          const { startDate, endDate } = convertTimeRangeToDates(value);
          query = query.gte("created_at", startDate.toISOString());
          query = query.lte("created_at", endDate.toISOString());
        } else if (key === "id" || key === "lead_id" || key.endsWith("_id")) {
          // Handle ID-based filters
          query = query.eq(key, value);
        } else {
          // Default to equality filter
          query = query.eq(key, value);
        }
      }
    }
  }

  // Execute based on query type
  switch (queryType) {
    case "aggregate":
      // Use existing executeMetricQuery for aggregate queries
      return await executeMetricQuery(metric, table, filters, crmUser, scope);

    case "record_lookup":
      // Fetch a single record
      const { data: record, error: recordError } = await query.select("*").single();
      if (recordError) {
        // Handle "not found" errors gracefully
        if (recordError.code === "PGRST116" || recordError.message?.includes("No rows")) {
          return { record: null };
        }
        throw new Error(`Supabase query error: ${recordError.message || recordError}`);
      }
      return { record: record || null };

    case "field_lookup":
      // Fetch a single record and return only the requested field
      const { data: fieldRecord, error: fieldError } = await query.select(field).single();
      if (fieldError) {
        // Handle "not found" errors gracefully
        if (fieldError.code === "PGRST116" || fieldError.message?.includes("No rows")) {
          return { value: null };
        }
        throw new Error(`Supabase query error: ${fieldError.message || fieldError}`);
      }
      return { value: fieldRecord?.[field] || null };

    case "list":
      // Fetch multiple records (limit to 100 for safety)
      const { data: records, error: listError } = await query.select("*").limit(100);
      if (listError) {
        throw new Error(`Supabase query error: ${listError.message || listError}`);
      }
      return { data: records || [] };

    default:
      throw new Error(`Unknown query type: ${queryType}`);
  }
}

