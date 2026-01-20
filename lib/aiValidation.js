/**
 * Validation module for AI-extracted intents
 * Strictly validates metrics, tables, and filters before database queries
 */

// ALLOWED TABLES - strict whitelist
export const ALLOWED_TABLES = [
  "leads_table",
  "prospects_table",
  "tasks_table",
  "appointments",
  "bookings"
];

// ALLOWED METRICS - strict whitelist
export const ALLOWED_METRICS = [
  "lead_count",
  "qualified_lead_count",
  "prospect_count",
  "stage_count",
  "call_count",
  "followup_count",
  "task_pending_count",
  "task_overdue_count",
  "meeting_scheduled_count",
  "meeting_conducted_count",
  "booking_count",
  "conversion_probability"
];

// ALLOWED FILTER KEYS - strict whitelist
export const ALLOWED_FILTER_KEYS = [
  "time_range",
  "status",
  "current_stage",
  "next_stage",
  "type",
  "assigned_to",
  "salesperson_id"
];

/**
 * Validates the AI-extracted intent JSON
 * @param {object} intent - The parsed JSON from AI
 * @returns {{valid: boolean, error?: string}}
 */
export function validateIntent(intent) {
  // Check intent_type classification
  const intentType = intent.intent_type || 
                     (intent.type === "conversation" ? "general_message" : null) ||
                     (intent.error === "unsupported_query" ? "unsupported" : null);

  // Handle unsupported intents
  if (intentType === "unsupported") {
    return { valid: true, isConversation: false, intentType: "unsupported" };
  }

  // Handle general_message intents (greetings, help, acknowledgements)
  if (intentType === "general_message" || intent.type === "conversation" || intent.intent === "conversation") {
    return { valid: true, isConversation: true, intentType: "general_message" };
  }

  // Validate query_type field
  const validQueryTypes = ["aggregate", "record_lookup", "field_lookup", "list"];
  if (!intent.query_type || !validQueryTypes.includes(intent.query_type)) {
    return {
      valid: false,
      error: `Invalid query_type: ${intent.query_type || "undefined"}. Allowed types: ${validQueryTypes.join(", ")}`
    };
  }

  // Check if table is allowed
  if (!intent.table || !ALLOWED_TABLES.includes(intent.table)) {
    return {
      valid: false,
      error: `Invalid table: ${intent.table || "undefined"}. Allowed tables: ${ALLOWED_TABLES.join(", ")}`
    };
  }

  // Validate metric field (required only for aggregate queries)
  if (intent.query_type === "aggregate") {
    if (!intent.metric || !ALLOWED_METRICS.includes(intent.metric)) {
      // Check if the "metric" is actually a filter field (common mistake)
      const commonFilterFields = [
        "assigned_to", "status", "industry_type", "priority", "lead_source", 
        "current_stage", "lead_qualification", "meeting_status", "email_status",
        "whatsapp_status", "n8n_status", "company_size", "turnover"
      ];
      if (intent.metric && commonFilterFields.includes(intent.metric)) {
        return {
          valid: false,
          error: `CRITICAL ERROR: "${intent.metric}" is a COLUMN, not a METRIC. Columns must ONLY be used as FILTERS, never as metrics. For counts, use metric "lead_count" with filters: {"${intent.metric}": "value"}. Example: {"metric": "lead_count", "filters": {"${intent.metric}": "value"}}.`
        };
      }
      return {
        valid: false,
        error: `Invalid metric: ${intent.metric || "undefined"}. Allowed metrics (ONLY these): ${ALLOWED_METRICS.join(", ")}. Remember: Columns like assigned_to, status, priority are FILTERS, not METRICS.`
      };
    }
  }

  // Validate field field (required only for field_lookup queries)
  if (intent.query_type === "field_lookup") {
    if (!intent.field || typeof intent.field !== "string") {
      return {
        valid: false,
        error: `Missing or invalid 'field' field for field_lookup query.`
      };
    }
  }

  // Check if filters contain only allowed keys
  // For non-aggregate queries, allow any filter keys (id, lead_id, etc.)
  if (intent.filters && typeof intent.filters === "object") {
    if (intent.query_type === "aggregate") {
      // For aggregate queries, only allow predefined filter keys
      const filterKeys = Object.keys(intent.filters);
      const invalidKeys = filterKeys.filter(key => !ALLOWED_FILTER_KEYS.includes(key));

      if (invalidKeys.length > 0) {
        return {
          valid: false,
          error: `Invalid filter keys: ${invalidKeys.join(", ")}. Allowed keys: ${ALLOWED_FILTER_KEYS.join(", ")}`
        };
      }
    }
    // For other query types, allow any filter keys (they might use id, lead_id, etc.)
  }

  // Validate scope field (must be "user" or "global")
  if (intent.scope && intent.scope !== "user" && intent.scope !== "global") {
    return {
      valid: false,
      error: `Invalid scope: ${intent.scope}. Allowed values: "user", "global"`
    };
  }

  // Default to "global" if scope is missing
  if (!intent.scope) {
    intent.scope = "global";
  }

  return { valid: true, isConversation: false };
}

/**
 * Validates that no revenue or money-related metrics are requested
 * @param {string} metric - The metric name
 * @returns {boolean}
 */
export function isRevenueMetric(metric) {
  const revenueKeywords = ["revenue", "money", "price", "cost", "amount", "payment", "income", "sales_value"];
  const metricLower = (metric || "").toLowerCase();
  return revenueKeywords.some(keyword => metricLower.includes(keyword));
}

/**
 * Allowed columns for leads_table (strict whitelist)
 */
export const LEADS_TABLE_ALLOWED_COLUMNS = [
  "id",
  "lead_name",
  "contact_name",
  "email",
  "phone",
  "lead_source",
  "industry_type",
  "company_size",
  "turnover",
  "status",
  "priority",
  "current_stage",
  "lead_qualification",
  "meeting_status",
  "response_status",
  "assigned_to",
  "due_date",
  "created_at",
  "last_attempted_at",
  "attempt_count",
  "first_call_done",
  "lead_score",
  "responsiveness_score",
  "conversion_chance",
  "conversion_probability_score",
  "total_score",
  "email_status",
  "whatsapp_status",
  "n8n_status",
  "recording_links",
  "next_stage_notes",
  "is_manual",
  "text" // Special column for lead IDs like "LD-101"
];

/**
 * Validates if a field is allowed for leads_table
 * @param {string} field - The field name to validate
 * @returns {boolean}
 */
export function isAllowedLeadsTableField(field) {
  return LEADS_TABLE_ALLOWED_COLUMNS.includes(field);
}

/**
 * Validates if a leads_table query is within scope
 * Returns null if valid, or error message if out of scope
 * @param {object} intent - The parsed intent
 * @returns {string|null} - Error message or null if valid
 */
export function validateLeadsTableScope(intent) {
  // Only validate if table is leads_table
  if (intent.table !== "leads_table") {
    return null; // Not a leads_table query, skip validation
  }

  // Check field_lookup queries
  if (intent.query_type === "field_lookup") {
    if (!intent.field || !isAllowedLeadsTableField(intent.field)) {
      return "This information is not available in the leads data.";
    }
  }

  // Check filters for invalid column references
  if (intent.filters && typeof intent.filters === "object") {
    for (const [key, value] of Object.entries(intent.filters)) {
      // Skip special filter keys
      if (key === "time_range" || key === "lead_id" || key === "id") {
        continue;
      }
      // Check if filter key is an allowed column
      if (!isAllowedLeadsTableField(key)) {
        return "This information is not available in the leads data.";
      }
    }
  }

  return null; // Valid
}

