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
  // Check if intent is conversational (support both "type" and "intent" fields)
  if (intent.type === "conversation" || intent.intent === "conversation") {
    return { valid: true, isConversation: true };
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
      return {
        valid: false,
        error: `Invalid metric: ${intent.metric || "undefined"}. Allowed metrics: ${ALLOWED_METRICS.join(", ")}`
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

