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

  const systemPrompt = `You are a Sales CRM Assistant.

Rules:
- Use ONLY the provided data.
- Do NOT invent numbers.
- Answer clearly and professionally.
- Match the user's question tone.`;

  const userPrompt = `The user said: "${question}"

Respond naturally and helpfully. Use a professional, elegant tone. Keep it brief and friendly.
You can help users understand their sales pipeline, analyze metrics, and get insights from their CRM data.`;

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

  return completion.choices[0]?.message?.content || "I'm here to help with your sales CRM questions.";
}

/**
 * Generates strict answer for aggregate queries
 * Returns a single sentence with the computed value
 * @param {string} question - Original user question
 * @param {string} metric - The metric that was computed
 * @param {number} value - The computed value from database
 * @param {string} timeRange - Optional time range filter
 * @returns {Promise<string>}
 */
export async function generateAggregateAnswer(question, metric, value, timeRange = null) {
  const timeRangeText = timeRange ? formatTimeRange(timeRange) : null;

  const systemPrompt = `You are a Sales CRM Assistant.

STRICT OUTPUT RULES FOR AGGREGATE QUERIES:
- Return ONLY a single sentence with the computed value
- Do NOT add bullet points
- Do NOT add extra explanation
- Do NOT add summaries
- Use ONLY the provided value: ${value}
- Do NOT invent numbers`;

  const userPrompt = `The user asked: "${question}"

The backend computed: ${value}
${timeRangeText ? `Time Range: ${timeRangeText}` : ""}

Generate a single sentence answer. Use ONLY the value ${value}. No extra text.`;

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
    temperature: 0.1, // Lower temperature for more deterministic output
  });

  return completion.choices[0]?.message?.content || `The result is ${value}.`;
}

/**
 * Generates strict answer for list queries
 * Returns ONLY bullet points with primary display field
 * NO AI generation - direct formatting for strict output
 * @param {string} question - Original user question (unused, kept for consistency)
 * @param {string} table - The table name
 * @param {Array} records - Array of records
 * @returns {string}
 */
export function generateListAnswer(question, table, records) {
  if (!records || records.length === 0) {
    return "No records found matching the specified criteria.";
  }

  // Get primary display field for the table
  const primaryField = PRIMARY_DISPLAY_FIELDS[table] || "name";
  
  // Extract primary field values
  const items = records
    .map(record => {
      // Try primary field first
      let value = record[primaryField];
      
      // Fallback to common field names
      if (!value) {
        value = record.title || record.name || record.lead_name || record.task_title || record.contact_name;
      }
      
      // If still no value, use first non-id field
      if (!value) {
        const fields = Object.keys(record).filter(k => k !== "id" && !k.endsWith("_id") && k !== "created_at" && k !== "updated_at");
        value = fields.length > 0 ? record[fields[0]] : "Record";
      }
      
      return value ? String(value) : "Record";
    })
    .filter(Boolean);

  // Format as bullet points - STRICT: Only bullet points, no extra text
  return items.map(item => `- ${item}`).join("\n");
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

