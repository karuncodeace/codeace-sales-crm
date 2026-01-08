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
  try {
    const supabase = supabaseAdmin();
    if (!supabase) {
      throw new Error("Failed to initialize Supabase admin client");
    }
    const salesPersonId = crmUser?.role === "sales" ? crmUser.salesPersonId : null;
    
    // Only apply user filtering when scope is "user"
    const shouldFilterByUser = scope === "user" && salesPersonId;

  // Convert time_range filter to dates if present
  let startDate = null;
  let endDate = null;
  if (filters?.time_range) {
    console.log(`Converting time_range filter: ${filters.time_range} to dates`);
    const { startDate: sd, endDate: ed } = convertTimeRangeToDates(filters.time_range);
    startDate = sd.toISOString();
    endDate = ed.toISOString();
    console.log(`Time range converted: ${startDate} to ${endDate}`);
    // Remove time_range from filters as we'll use date filters
    const { time_range, ...restFilters } = filters;
    filters = restFilters;
  } else {
    console.log("No time_range filter found in filters:", filters);
  }

  // Build base query with role-based filtering
  let query;

  switch (metric) {
    case "lead_count":
      // Build query step by step - apply filters BEFORE select
      query = supabase.from("leads_table");

      if (shouldFilterByUser) {
        query = query.eq("assigned_to", salesPersonId);
      }

      if (startDate) {
        console.log(`Applying created_at filter: gte(${startDate})`);
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        console.log(`Applying created_at filter: lte(${endDate})`);
        query = query.lte("created_at", endDate);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      // Apply select with count AFTER all filters
      query = query.select("*", { count: "exact", head: true });

      console.log("Executing lead_count query with filters:", {
        hasStartDate: !!startDate,
        hasEndDate: !!endDate,
        startDate,
        endDate,
        status: filters?.status
      });

      const { count: leadCount, error: leadError } = await query;
      if (leadError) {
        console.error("Lead count query error:", {
          error: leadError,
          message: leadError.message,
          code: leadError.code,
          details: leadError.details,
          hint: leadError.hint
        });
        throw new Error(`Supabase query error: ${leadError.message || leadError}`);
      }
      
      console.log(`Lead count result: ${leadCount} (filtered by created_at: ${startDate ? 'yes' : 'no'})`);
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
      // Build query - apply filters BEFORE select
      query = supabase.from("prospects_table");

      if (shouldFilterByUser) {
        query = query.eq("assigned_to", salesPersonId);
      }

      if (startDate) query = query.gte("created_at", startDate);
      if (endDate) query = query.lte("created_at", endDate);

      // Apply select with count AFTER all filters
      query = query.select("*", { count: "exact", head: true });

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
      // Build query - apply filters BEFORE select
      query = supabase.from("tasks_table");

      if (shouldFilterByUser) {
        query = query.eq("sales_person_id", salesPersonId);
      }

      query = query.eq("status", "Pending");

      if (startDate) query = query.gte("created_at", startDate);
      if (endDate) query = query.lte("created_at", endDate);

      // Apply select with count AFTER all filters
      query = query.select("*", { count: "exact", head: true });

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
      // Build query - apply filters BEFORE select
      query = supabase.from("bookings");

      if (startDate) query = query.gte("created_at", startDate);
      if (endDate) query = query.lte("created_at", endDate);

      // Apply select with count AFTER all filters
      query = query.select("*", { count: "exact", head: true });

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
  } catch (error) {
    console.error("executeMetricQuery error:", {
      metric,
      table,
      filters,
      error: error.message,
      stack: error.stack?.substring(0, 500)
    });
    throw error;
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
  try {
    // Validate inputs
    if (!table) {
      throw new Error("Table name is required");
    }
    
    if (!queryType) {
      throw new Error("Query type is required");
    }
    
    const supabase = supabaseAdmin();
    if (!supabase) {
      throw new Error("Failed to initialize Supabase admin client");
    }
    const salesPersonId = crmUser?.role === "sales" ? crmUser.salesPersonId : null;
  
  // Only apply user filtering when scope is "user"
  const shouldFilterByUser = scope === "user" && salesPersonId;

  // For aggregate queries, executeMetricQuery handles time_range conversion itself
  // So we should NOT convert it here for aggregate queries
  // Only convert for non-aggregate queries (list, record_lookup, field_lookup)
  let startDate = null;
  let endDate = null;
  let originalFilters = { ...filters }; // Preserve original filters
  
  if (queryType !== "aggregate" && filters?.time_range) {
    try {
      const { startDate: sd, endDate: ed } = convertTimeRangeToDates(filters.time_range);
      startDate = sd.toISOString();
      endDate = ed.toISOString();
      // Remove time_range from filters as we'll use date filters
      const { time_range, ...restFilters } = filters;
      filters = restFilters;
      console.log(`Converted time_range to dates for ${queryType} query: ${startDate} to ${endDate}`);
    } catch (error) {
      console.error("Error converting time_range:", error);
      throw new Error(`Invalid time_range filter: ${filters.time_range}`);
    }
  }

  // Build base query (only for non-aggregate queries)
  let query = null;
  if (queryType !== "aggregate") {
    try {
      query = supabase.from(table);
      
      // Validate query is a valid Supabase query builder
      if (!query) {
        throw new Error(`Query builder is null for table: ${table}`);
      }
      
      // Check if it has the essential methods
      if (typeof query.select !== "function" || typeof query.eq !== "function") {
        console.error("Invalid query builder created:", {
          table,
          hasSelect: typeof query.select === "function",
          hasEq: typeof query.eq === "function",
          queryType: typeof query,
          queryKeys: query ? Object.keys(query) : []
        });
        throw new Error(`Failed to create valid query builder for table: ${table}. Missing required methods.`);
      }
    } catch (initError) {
      console.error("Error initializing query builder:", initError);
      throw new Error(`Failed to initialize query builder for table ${table}: ${initError.message}`);
    }
  }
  
  console.log("Building query:", {
    queryType,
    table,
    filters: queryType === "aggregate" ? originalFilters : filters,
    time_range: originalFilters?.time_range,
    startDate,
    endDate,
    scope,
    shouldFilterByUser,
    salesPersonId
  });

  // Apply user filtering if needed (only for non-aggregate queries)
  if (queryType !== "aggregate" && shouldFilterByUser && salesPersonId && query) {
    // Validate query before applying user filter
    if (!query || typeof query.eq !== "function") {
      throw new Error(`Query builder is invalid before applying user filter for table: ${table}`);
    }
    
    // Determine the user filter column based on table
    try {
      if (table === "leads_table" || table === "prospects_table") {
        query = query.eq("assigned_to", salesPersonId);
      } else if (table === "tasks_table") {
        query = query.eq("sales_person_id", salesPersonId);
      } else if (table === "appointments") {
        query = query.eq("salesperson_id", salesPersonId);
      }
      // bookings table doesn't have user filtering
      
      // Validate query is still valid after user filtering
      if (!query || typeof query.eq !== "function" || typeof query.select !== "function") {
        throw new Error(`Query builder became invalid after applying user filter for table: ${table}`);
      }
    } catch (userFilterError) {
      console.error("Error applying user filter:", userFilterError);
      throw new Error(`Failed to apply user filter: ${userFilterError.message}`);
    }
  }

  // Apply filters dynamically (before time range to maintain query chain)
  // Only for non-aggregate queries
  if (queryType !== "aggregate" && filters && typeof filters === "object" && query) {
    // Validate query is valid before applying any filters
    if (!query) {
      console.error("Query is null/undefined before applying filters:", { table, queryType });
      throw new Error(`Query builder is null before applying filters. Table: ${table}`);
    }
    
    if (typeof query.eq !== "function" || typeof query.select !== "function") {
      console.error("Query state before applying filters:", {
        queryExists: !!query,
        hasEq: query && typeof query.eq === "function",
        hasSelect: query && typeof query.select === "function",
        queryType: typeof query,
        queryConstructor: query?.constructor?.name,
        queryMethods: query ? Object.getOwnPropertyNames(query).filter(name => typeof query[name] === "function").slice(0, 10) : [],
        table
      });
      
      // Try to rebuild the query if it's invalid
      console.log("Attempting to rebuild query...");
      try {
        query = supabase.from(table);
        if (!query || typeof query.eq !== "function" || typeof query.select !== "function") {
          throw new Error(`Failed to rebuild query builder for table: ${table}`);
        }
        console.log("Query rebuilt successfully");
      } catch (rebuildError) {
        throw new Error(`Query builder is invalid and cannot be rebuilt. Table: ${table}, Error: ${rebuildError.message}`);
      }
    }
    
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined) {
        // Skip time_range as it's handled separately below
        if (key === "time_range") {
          continue;
        }
        
        // Validate query is still valid before applying each filter
        if (!query || typeof query.eq !== "function") {
          console.error("Query state before applying filter:", {
            key,
            value,
            queryExists: !!query,
            hasEq: query && typeof query.eq === "function",
            hasSelect: query && typeof query.select === "function",
            queryType: typeof query,
            table
          });
          throw new Error(`Query builder became invalid before applying filter: ${key} = ${value}`);
        }
        
        try {
          // Store the query before applying filter for debugging
          const queryBefore = query;
          
          if (key === "id" || key === "lead_id" || key.endsWith("_id")) {
            // Handle ID-based filters
            // Special case: if key is "lead_id" and value looks like "LD-XXX", use "text" column instead
            if (key === "lead_id" && typeof value === "string" && value.match(/^LD-\d+/)) {
              console.log(`Applying lead_id filter (as text): text = ${value}`);
              query = query.eq("text", value);
            } else {
              console.log(`Applying ID filter: ${key} = ${value}`);
              query = query.eq(key, value);
            }
          } else if (key === "status") {
            // Handle status filter - normalize to match common database values
            const statusValue = String(value);
            // Normalize: "pending" -> "Pending", "PENDING" -> "Pending"
            const normalizedStatus = statusValue.charAt(0).toUpperCase() + statusValue.slice(1).toLowerCase();
            console.log(`Applying status filter: "${statusValue}" -> "${normalizedStatus}"`);
            query = query.eq(key, normalizedStatus);
          } else {
            // Default to equality filter
            console.log(`Applying equality filter: ${key} = ${value}`);
            query = query.eq(key, value);
          }
          
          // Validate that query was actually returned and is still valid
          if (!query) {
            throw new Error(`Query builder returned null/undefined after applying filter: ${key} = ${value}`);
          }
          
          // Validate query is still valid after applying filter
          if (typeof query.eq !== "function" || typeof query.select !== "function") {
            console.error("Query state after applying filter:", {
              key,
              value,
              queryExists: !!query,
              hasEq: query && typeof query.eq === "function",
              hasSelect: query && typeof query.select === "function",
              queryType: typeof query,
              queryConstructor: query?.constructor?.name,
              queryBeforeType: typeof queryBefore,
              queryBeforeHasEq: queryBefore && typeof queryBefore.eq === "function",
              table
            });
            throw new Error(`Query builder became invalid after applying filter: ${key} = ${value}. Query type: ${typeof query}, hasEq: ${typeof query.eq === "function"}`);
          }
        } catch (filterError) {
          console.error(`Error applying filter ${key} = ${value}:`, {
            error: filterError.message,
            stack: filterError.stack?.substring(0, 300),
            queryState: {
              queryExists: !!query,
              hasEq: query && typeof query.eq === "function",
              hasSelect: query && typeof query.select === "function"
            }
          });
          throw new Error(`Failed to apply filter ${key}: ${filterError.message}`);
        }
      }
    }
  }

  // Apply time range filters if present (after other filters to maintain query chain)
  // Only for non-aggregate queries (aggregate queries handle time_range in executeMetricQuery)
  if (queryType !== "aggregate" && startDate && endDate && query) {
    // Validate query is still a valid Supabase query builder
    if (!query || typeof query.gte !== "function") {
      console.error("Query state when applying time range:", {
        queryType: typeof query,
        hasGte: query && typeof query.gte === "function",
        hasSelect: query && typeof query.select === "function",
        table,
        startDate,
        endDate
      });
      throw new Error("Query builder is not valid when applying time range filter. This may indicate a filter application error.");
    }
    
    try {
      query = query.gte("created_at", startDate);
      query = query.lte("created_at", endDate);
      console.log("Applied time range filter:", { startDate, endDate });
    } catch (timeRangeError) {
      console.error("Error applying time range filter:", timeRangeError);
      throw new Error(`Failed to apply time range filter: ${timeRangeError.message}`);
    }
  }

  // Execute based on query type
  switch (queryType) {
    case "aggregate":
      // Use existing executeMetricQuery for aggregate queries
      // executeMetricQuery handles its own time_range conversion, so pass original filters
      if (!metric) {
        throw new Error("Metric is required for aggregate queries");
      }
      console.log("Calling executeMetricQuery with filters:", originalFilters);
      try {
        return await executeMetricQuery(metric, table, originalFilters, crmUser, scope);
      } catch (metricError) {
        console.error("executeMetricQuery error:", {
          metric,
          table,
          filters: originalFilters,
          error: metricError.message,
          stack: metricError.stack?.substring(0, 300)
        });
        throw metricError;
      }

    case "record_lookup":
      // Validate query before execution
      if (!query || typeof query.select !== "function") {
        throw new Error(`Query builder is invalid for record_lookup on table: ${table}`);
      }
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
      // Validate query before execution
      if (!query || typeof query.select !== "function") {
        throw new Error(`Query builder is invalid for field_lookup on table: ${table}`);
      }
      if (!field) {
        throw new Error("Field name is required for field_lookup query");
      }
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
      // Validate query before execution
      if (!query || typeof query.select !== "function") {
        throw new Error(`Query builder is invalid for list query on table: ${table}`);
      }
      // Fetch multiple records (limit to 100 for safety)
      console.log("Executing list query for table:", table);
      const { data: records, error: listError } = await query.select("*").limit(100);
      if (listError) {
        console.error("List query error:", {
          table,
          filters,
          error: listError,
          errorMessage: listError.message,
          errorCode: listError.code,
          errorDetails: listError.details,
          errorHint: listError.hint
        });
        throw new Error(`Supabase query error: ${listError.message || listError}. Table: ${table}, Filters: ${JSON.stringify(filters)}`);
      }
      console.log("List query successful:", {
        table,
        recordCount: records?.length || 0
      });
      return { data: records || [] };

    default:
      throw new Error(`Unknown query type: ${queryType}`);
  }
  } catch (error) {
    console.error("executeQuery error:", {
      queryType,
      metric,
      table,
      field,
      filters,
      error: error.message,
      stack: error.stack?.substring(0, 500)
    });
    throw error;
  }
}

