/**
 * AI Answer Generator
 * Pass 2: Generates natural language answer from computed database results
 * AI must NOT invent numbers - only explain the computed data
 * STRICT: Answers must match query_type exactly
 */

import { callOllamaChat } from "./ollamaClient";
import { formatTimeRange } from "../timeRange";

/**
 * Maps table names to their primary display field
 */
const PRIMARY_DISPLAY_FIELDS = {
  "tasks_table": "title",
  "leads_table": "lead_name",
  "prospects_table": "lead_name",
  "appointments": "title",
  "bookings": "title"
};

/**
 * Generates natural language answer from computed database results
 * @param {string} question - Original user question
 * @param {string} metric - The metric that was computed
 * @param {number} value - The computed value from database
 * @param {string} timeRange - Optional time range filter
 * @returns {Promise<string>}
 */
export async function generateAnswer(question, metric, value, timeRange = null) {
  // No API key needed for local Ollama

  const timeRangeText = timeRange ? formatTimeRange(timeRange) : null;

  const systemPrompt = `You are a Sales CRM Assistant.

Rules:
- Use ONLY the provided data.
- Do NOT invent numbers.
- Answer clearly and professionally.
- Match the user's question tone.`;

  const userPrompt = `The user asked: "${question}"

The backend computed the following result from the CRM database:
- Metric: ${metric}
- Computed Value: ${value}
${timeRangeText ? `- Time Range: ${timeRangeText}` : ""}

Generate a natural, helpful answer based on this computed data. Use ONLY the computed value: ${value}. Do NOT invent numbers.`;

  // Call Ollama API
  const completion = await callOllamaChat([
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
  ], {
    temperature: 0.3,
  });

  return completion.choices[0]?.message?.content || "I couldn't generate an answer at this time.";
}

/**
 * Generates conversational response for greetings and general questions
 * @param {string} question - User's conversational question
 * @returns {Promise<string>}
 */
export async function generateConversationalAnswer(question) {
  // No API key needed for local Ollama

  const systemPrompt = `You are Loria AI, an in-app Sales CRM Assistant.

This prompt applies ONLY to general messages (greetings, small talk, acknowledgements).

GENERAL MESSAGE RULES (VERY STRICT):
- Keep replies SHORT (1 sentence max)
- Do NOT repeat the user's greeting
- Do NOT explain your capabilities unless asked
- Do NOT mention CRM, data, leads, or features unless the user asks
- Sound natural, calm, and human
- No marketing tone
- No over-politeness
- No emojis (except simple acknowledgements like "Ok" → "👍")
- No follow-up questions unless appropriate

ABSOLUTE DON'TS:
- Do NOT say "How can I help you today?" repeatedly
- Do NOT mention "sales CRM data" unless explicitly asked
- Do NOT sound like a chatbot or assistant intro
- Do NOT over-explain

GOAL:
The AI should feel like a quiet, professional in-app assistant, not a conversational chatbot.`;

  const userPrompt = `The user said: "${question}"

Respond following the strict rules. Keep it to 1 sentence maximum. Be natural, calm, and human.

Response examples:
- "Hello" → "Hi!"
- "Hi" → "Hello!"
- "How are you" → "I'm doing well, thanks!"
- "Thanks" → "You're welcome!"
- "Ok" → "👍"
- "Help" → "Sure — what do you need help with?"

Generate a short, natural response. Do NOT repeat greetings, do NOT explain capabilities, do NOT mention CRM unless asked.`;

  // Call Ollama API
  const completion = await callOllamaChat([
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userPrompt,
    },
  ], {
    temperature: 0.3,
  });

  return completion.choices[0]?.message?.content || "Hi!";
}

/**
 * Generates response for unsupported intents
 * @param {string} question - User's question
 * @returns {string}
 */
export function generateUnsupportedAnswer(question) {
  return "I'm here to help with sales and CRM-related questions. Let me know if you need help with leads, tasks, or performance insights.";
}

/**
 * Generates natural, professional answer for aggregate queries
 * Wraps numbers in natural language and verifies filters
 * @param {string} question - Original user question
 * @param {string} metric - The metric that was computed
 * @param {number} value - The computed value from database
 * @param {string} timeRange - Optional time range filter
 * @param {string} table - The table name
 * @param {object} filters - The filters that were applied (optional)
 * @param {boolean} filterVerified - Whether filters were successfully applied (optional)
 * @returns {string}
 */
export function generateAggregateAnswer(question, metric, value, timeRange = null, table = null, filters = {}, filterVerified = true) {
  // Fail-safe: If filters were requested but not verified, return fail-safe message
  const hasFilters = filters && Object.keys(filters).length > 0 && !filters.time_range;
  if (hasFilters && !filterVerified) {
    return "I'm unable to reliably calculate that with the current data, but I can help with overall lead counts or summaries.";
  }

  // Map metrics to natural phrasing
  const metricPhrases = {
    lead_count: "leads",
    qualified_lead_count: "qualified leads",
    prospect_count: "prospects",
    stage_count: "leads in this stage",
    call_count: "leads with first call done",
    followup_count: "follow-up leads",
    task_pending_count: "pending tasks",
    task_overdue_count: "overdue tasks",
    meeting_scheduled_count: "scheduled meetings",
    meeting_conducted_count: "conducted meetings",
    booking_count: "bookings",
    conversion_probability: "conversion probability",
  };

  const noun = metricPhrases[metric] || "items";
  const timeRangeText = timeRange ? formatTimeRange(timeRange) : null;

  // Build natural language response based on filters
  let response = "";

  // Check for assigned_to filter
  if (filters?.assigned_to) {
    const assignedTo = filters.assigned_to;
    if (timeRangeText) {
      response = `There are ${value} ${noun} assigned to ${assignedTo} ${timeRangeText}.`;
    } else {
      response = `${assignedTo} is handling ${value} ${noun}.`;
    }
  }
  // Check for status filter
  else if (filters?.status) {
    const status = filters.status;
    if (timeRangeText) {
      response = `There are ${value} ${status.toLowerCase()} ${noun} ${timeRangeText}.`;
    } else {
      response = `There are ${value} ${status.toLowerCase()} ${noun}.`;
    }
  }
  // Check for priority filter
  else if (filters?.priority) {
    const priority = filters.priority;
    if (timeRangeText) {
      response = `There are ${value} ${priority.toLowerCase()}-priority ${noun} ${timeRangeText}.`;
    } else {
      response = `You currently have ${value} ${priority.toLowerCase()}-priority ${noun}.`;
    }
  }
  // Check for industry_type filter
  else if (filters?.industry_type) {
    const industry = filters.industry_type;
    if (timeRangeText) {
      response = `There are ${value} ${noun} from the ${industry} industry ${timeRangeText}.`;
    } else {
      response = `There are ${value} ${noun} from the ${industry} industry.`;
    }
  }
  // Check for current_stage filter
  else if (filters?.current_stage) {
    const stage = filters.current_stage;
    if (timeRangeText) {
      response = `There are ${value} ${noun} in the ${stage} stage ${timeRangeText}.`;
    } else {
      response = `There are ${value} ${noun} in the ${stage} stage.`;
    }
  }
  // Check for lead_source filter
  else if (filters?.lead_source) {
    const source = filters.lead_source;
    if (timeRangeText) {
      response = `There are ${value} ${noun} from ${source} ${timeRangeText}.`;
    } else {
      response = `There are ${value} ${noun} from ${source}.`;
    }
  }
  // Generic response with time range
  else if (timeRangeText) {
    response = `There are ${value} ${noun} ${timeRangeText}.`;
  }
  // Generic response without filters
  else {
    response = `There are ${value} ${noun}.`;
  }

  // Ensure response is natural and professional (always full sentence, never raw number)
  return response;
}

/**
 * Generates strict answer for list queries
 * For leads_table: Returns ONLY bullet points with lead_name (strict rule)
 * For other tables: Returns bullet points with primary display field
 * NO AI generation - direct formatting for strict output
 * @param {string} question - Original user question (unused, kept for consistency)
 * @param {string} table - The table name
 * @param {Array} records - Array of records
 * @returns {string}
 */
export function generateListAnswer(question, table, records) {
  // Handle null/undefined records
  if (!records) {
    console.warn("generateListAnswer: records is null or undefined");
    return "No records found matching the specified criteria.";
  }

  // Handle empty array
  if (!Array.isArray(records) || records.length === 0) {
    return "No records found matching the specified criteria.";
  }

  // STRICT RULE: For leads_table, ONLY use lead_name
  if (table === "leads_table") {
    const items = records
      .map(record => {
        if (!record || typeof record !== "object") {
          return null;
        }
        // ONLY lead_name for leads_table
        const value = record.lead_name;
        return value ? String(value) : null;
      })
      .filter(Boolean);

    if (items.length === 0) {
      return "No records found matching the specified criteria.";
    }

    // Format as bullet points - STRICT: Only bullet points, no extra text
    return items.map(item => `• ${item}`).join("\n");
  }

  // For other tables, use the original logic
  const primaryField = PRIMARY_DISPLAY_FIELDS[table] || "name";
  
  // Extract primary field values
  const items = records
    .map(record => {
      if (!record || typeof record !== "object") {
        return null;
      }
      
      // Try primary field first
      let value = record[primaryField];
      
      // Fallback to common field names
      if (!value) {
        value = record.title || record.name || record.lead_name || record.task_title || record.contact_name;
      }
      
      // If still no value, use first non-id field
      if (!value) {
        const fields = Object.keys(record).filter(k => k !== "id" && !k.endsWith("_id") && k !== "created_at" && k !== "updated_at");
        value = fields.length > 0 ? record[fields[0]] : null;
      }
      
      return value ? String(value) : null;
    })
    .filter(Boolean); // Remove null/undefined values

  // If no valid items after filtering, return no records message
  if (items.length === 0) {
    return "No records found matching the specified criteria.";
  }

  // Format as bullet points - STRICT: Only bullet points, no extra text
  const result = items.map(item => `- ${item}`).join("\n");
  
  // Ensure we always return a non-empty string
  return result || "No records found matching the specified criteria.";
}

/**
 * Generates strict answer for record_lookup queries
 * Returns a short sentence describing the record
 * @param {string} question - Original user question
 * @param {object} record - The record data
 * @param {string} table - The table name
 * @returns {Promise<string>}
 */
export async function generateRecordAnswer(question, record, table) {
  if (!record) {
    return "No record found matching the specified criteria.";
  }

  const primaryField = PRIMARY_DISPLAY_FIELDS[table] || "name";
  const primaryValue = record[primaryField] || record.title || record.name || record.lead_name || "Record";

  const systemPrompt = `You are a Sales CRM Assistant.

STRICT OUTPUT RULES FOR RECORD LOOKUP:
- Return ONLY a short sentence describing the record
- Do NOT add bullet points
- Do NOT list raw fields
- Do NOT add extra explanation
- Focus on the primary identifier: ${primaryValue}`;

  const userPrompt = `The user asked: "${question}"

Record found:
- Primary: ${primaryValue}
- Table: ${table}

Generate a short sentence describing this record. No bullet points. No raw fields.`;

  const completion = await callOllamaChat([
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
  ], {
    temperature: 0.1,
  });

  return completion.choices[0]?.message?.content || `Found record: ${primaryValue}.`;
}

/**
 * Generates strict answer for field_lookup queries
 * Returns ONLY the field value
 * @param {string} question - Original user question
 * @param {string} field - The field name
 * @param {any} value - The field value
 * @returns {string}
 */
export function generateFieldAnswer(question, field, value) {
  if (value === null || value === undefined) {
    return `No value found for ${field} matching the specified criteria.`;
  }
  
  // Return ONLY the field value, no sentence framing
  return String(value);
}

