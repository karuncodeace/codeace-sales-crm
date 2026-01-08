/**
 * AI Intent Extractor
 * Pass 1: Extracts structured intent from natural language questions
 * Returns ONLY JSON - no natural language, no SQL, no calculations
 */

import { callOllamaChat } from "./ollamaClient";
import { ALLOWED_METRICS, ALLOWED_TABLES, ALLOWED_FILTER_KEYS } from "../aiValidation";

/**
 * Extracts structured intent from user question
 * @param {string} question - User's natural language question
 * @returns {Promise<{type: string, metric?: string, table?: string, filters?: object}>}
 */
export async function extractIntent(question) {
  // No API key needed for local Ollama

  const systemPrompt = `You are a Sales CRM Intent Extractor.

CRITICAL RULES:
- Respond ONLY with raw JSON.
- Do NOT include explanations.
- Do NOT include markdown.
- Do NOT include backticks.
- Do NOT include text before or after JSON.

The JSON MUST match this EXACT shape:
{
  "query_type": "aggregate" | "record_lookup" | "field_lookup" | "list",
  "metric": "<supported_metric>",  // Required only if query_type = "aggregate"
  "table": "<allowed_table>",
  "field": "<column_name>",  // Required only if query_type = "field_lookup"
  "scope": "user" | "global",
  "filters": {}
}

QUERY TYPE DETECTION RULES:
- If question asks for counts/totals/rates → query_type = "aggregate"
- If question asks about a specific record (e.g., "lead LD-101", "task with id...") → query_type = "record_lookup"
- If question asks for a specific column value (e.g., "name of lead...", "email of...") → query_type = "field_lookup"
- If question asks for multiple items/listings (e.g., "show all...", "list...", "get all...") → query_type = "list"

SCOPE DETECTION RULES:
- If question contains "my", "me", "mine", "I have", "I've" → scope = "user"
- If question contains "total", "overall", "all", "entire", "company", "everyone", "every" → scope = "global"
- If scope is unclear or ambiguous → default to "global"

SUPPORTED METRICS (for aggregate queries only):
${ALLOWED_METRICS.join(",\n")}

ALLOWED TABLES:
${ALLOWED_TABLES.join(",\n")}

ALLOWED FILTER KEYS:
${ALLOWED_FILTER_KEYS.join(",\n")}

EXAMPLES:
- "What is the total lead count?" → {"query_type": "aggregate", "metric": "lead_count", "table": "leads_table", "scope": "global", "filters": {}}
- "What is the lead name of LD-101?" → {"query_type": "field_lookup", "table": "leads_table", "field": "lead_name", "scope": "global", "filters": {"lead_id": "LD-101"}}
- "Show all pending tasks" → {"query_type": "list", "table": "tasks_table", "scope": "global", "filters": {"status": "Pending"}}
- "Get lead with id abc-123" → {"query_type": "record_lookup", "table": "leads_table", "scope": "global", "filters": {"id": "abc-123"}}

If the question cannot be mapped, return:
{ "error": "unsupported_query" }

If the question is conversational (greeting, general question), respond EXACTLY with:
{
  "type": "conversation"
}`;

  // Call Ollama API
  let rawOutput;
  try {
    const completion = await callOllamaChat([
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: question,
      },
    ], {
      temperature: 0,
    });

    rawOutput = completion.choices[0]?.message?.content || "";
  } catch (error) {
    // Log minimal error details
    console.error("Intent extraction API error:", error.message);
    throw new Error("Failed to understand the question. Please try rephrasing.");
  }

  // MANDATORY: Log raw AI output for debugging
  console.log("RAW AI INTENT OUTPUT:", rawOutput);

  // Clean up response: remove markdown, whitespace, extract JSON
  let cleanedText = rawOutput
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Extract JSON object if wrapped in text
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanedText = jsonMatch[0];
  }

  // SAFE JSON parsing: Reject output that does not start with {
  if (!cleanedText.trim().startsWith("{")) {
    console.error("AI output does not start with '{':", cleanedText.substring(0, 100));
    throw new Error("Failed to understand the question. Please try rephrasing.");
  }

  // Attempt JSON.parse() with error handling
  let parsedIntent;
  try {
    parsedIntent = JSON.parse(cleanedText);
  } catch (parseError) {
    // JSON.parse failed - log and throw controlled error
    console.error("JSON parse failed:", parseError.message);
    console.error("Attempted to parse:", cleanedText.substring(0, 200));
    throw new Error("Failed to understand the question. Please try rephrasing.");
  }

  // Handle unsupported query response
  if (parsedIntent.error === "unsupported_query") {
    console.error("AI returned unsupported_query");
    throw new Error("Failed to understand the question. Please try rephrasing.");
  }

  // Validate required keys
  // For conversational responses, only "type" is required
  if (parsedIntent.type === "conversation") {
    return parsedIntent;
  }

  // Validate query_type field
  const validQueryTypes = ["aggregate", "record_lookup", "field_lookup", "list"];
  if (!parsedIntent.query_type || !validQueryTypes.includes(parsedIntent.query_type)) {
    console.error("Missing or invalid 'query_type' field. Parsed intent:", JSON.stringify(parsedIntent));
    throw new Error("Failed to understand the question. Please try rephrasing.");
  }

  // Validate table field (required for all query types)
  if (!parsedIntent.table || typeof parsedIntent.table !== "string") {
    console.error("Missing or invalid 'table' field. Parsed intent:", JSON.stringify(parsedIntent));
    throw new Error("Failed to understand the question. Please try rephrasing.");
  }

  // Validate metric field (required only for aggregate queries)
  if (parsedIntent.query_type === "aggregate") {
    if (!parsedIntent.metric || typeof parsedIntent.metric !== "string") {
      console.error("Missing or invalid 'metric' field for aggregate query. Parsed intent:", JSON.stringify(parsedIntent));
      throw new Error("Failed to understand the question. Please try rephrasing.");
    }
  }

  // Validate field field (required only for field_lookup queries)
  if (parsedIntent.query_type === "field_lookup") {
    if (!parsedIntent.field || typeof parsedIntent.field !== "string") {
      console.error("Missing or invalid 'field' field for field_lookup query. Parsed intent:", JSON.stringify(parsedIntent));
      throw new Error("Failed to understand the question. Please try rephrasing.");
    }
  }

  // filters is required but can be empty object
  if (!parsedIntent.filters || typeof parsedIntent.filters !== "object" || Array.isArray(parsedIntent.filters)) {
    console.error("Missing or invalid 'filters' field. Parsed intent:", JSON.stringify(parsedIntent));
    throw new Error("Failed to understand the question. Please try rephrasing.");
  }

  // Validate scope field
  if (!parsedIntent.scope || (parsedIntent.scope !== "user" && parsedIntent.scope !== "global")) {
    // Default to "global" if scope is missing or invalid
    console.warn("Missing or invalid 'scope' field, defaulting to 'global'. Parsed intent:", JSON.stringify(parsedIntent));
    parsedIntent.scope = "global";
  }

  // All validations passed
  return parsedIntent;
}

