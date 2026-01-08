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
 * Generates strict answer for aggregate queries
 * For leads_table: Returns NUMBER ONLY (strict rule)
 * For other tables: Returns a single sentence with the computed value
 * @param {string} question - Original user question
 * @param {string} metric - The metric that was computed
 * @param {number} value - The computed value from database
 * @param {string} timeRange - Optional time range filter
 * @param {string} table - The table name (optional, for strict leads_table rules)
 * @returns {Promise<string>}
 */
export async function generateAggregateAnswer(question, metric, value, timeRange = null, table = null) {
  // STRICT RULE: For leads_table, return NUMBER ONLY
  if (table === "leads_table") {
    return String(value);
  }

  // For other tables, use the original format
  const timeRangeText = timeRange ? formatTimeRange(timeRange) : null;

  // Map common metrics to concise phrasing
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
  const prefix = timeRangeText ? `There are ${value} ${noun} ${timeRangeText}.` : `There are ${value} ${noun}.`;

  // Keep it a single, concise sentence
  return prefix;
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

