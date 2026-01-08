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

STEP 1: Check if the message is a general_message FIRST (before checking for CRM queries):
- "general_message" → ANY conversational message including:
  * Greetings: Hi, Hello, Hey, Hii, Hyy, Good morning, etc. (even with typos or variations)
  * Questions about you: How are you, Who are you, What are you, etc.
  * Help requests: What can you do, Help, How do I use this, etc.
  * Acknowledgements: Thanks, Thank you, Appreciate it, Ok, Okay, etc.
  * General chit-chat: How's it going, Nice to meet you, etc.
  * Any friendly message that does NOT ask for CRM data

STEP 2: If NOT general_message, check if it's a CRM query:
- "crm_query" → Questions about CRM data (leads, tasks, bookings, meetings, metrics, counts, lists, records)
  * Must contain words like: lead, task, booking, meeting, count, total, list, show, get, etc.
  * Must reference specific CRM entities or data

STEP 3: If NOT general_message and NOT crm_query:
- "unsupported" → Topics completely outside CRM scope (politics, movies, coding help, personal advice unrelated to sales)

INTENT TYPE: "crm_query"
The JSON MUST match this EXACT shape:
{
  "intent_type": "crm_query",
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

TIME RANGE DETECTION RULES (CRITICAL - Always check for time references):
- If question contains "today", "this day" → ALWAYS add filters: {"time_range": "today"}
- If question contains "arrived", "arrive", "arrives", "have arrived", "have been arrived", "were arrived", "came", "came in", "added", "created", "were created", "have been created" WITH "today" → filters: {"time_range": "today"}
- If question contains "for today", "in today", "on today" → filters: {"time_range": "today"}
- If question contains "this week", "current week" → filters: {"time_range": "this_week"}
- If question contains "last week", "previous week" → filters: {"time_range": "last_week"}
- If question contains "this month", "current month" → filters: {"time_range": "this_month"}
- If question contains "last month", "previous month" → filters: {"time_range": "last_month"}
- If question contains "last 7 days", "past week" → filters: {"time_range": "last_7_days"}
- If question contains "last 30 days", "past month" → filters: {"time_range": "last_30_days"}

IMPORTANT: When a question asks about counts/numbers AND mentions "today", you MUST include {"time_range": "today"} in filters. This filters by created_at column.

SUPPORTED METRICS (for aggregate queries only):
${ALLOWED_METRICS.join(",\n")}

ALLOWED TABLES:
${ALLOWED_TABLES.join(",\n")}

ALLOWED FILTER KEYS:
${ALLOWED_FILTER_KEYS.join(",\n")}

---------------------------------------
STRICT LEADS_TABLE RULES (CRITICAL)
---------------------------------------
When table = "leads_table", you MUST follow these strict rules:

ALLOWED COLUMNS FOR LEADS_TABLE (ONLY THESE):
id, lead_name, contact_name, email, phone, lead_source, industry_type, company_size, turnover,
status, priority, current_stage, lead_qualification, meeting_status,
assigned_to, due_date, created_at, last_attempted_at, attempt_count, first_call_done,
lead_score, responsiveness_score, conversion_chance, conversion_probability_score, total_score,
email_status, whatsapp_status, n8n_status, recording_links, next_stage_notes, is_manual

SCOPE VALIDATION:
- If question asks for data NOT in the above columns → intent_type = "unsupported"
- If question asks about tables other than leads_table → intent_type = "unsupported"
- If question cannot be answered with leads_table data → intent_type = "unsupported"

OUTPUT TYPE DETECTION FOR LEADS_TABLE:
- Count questions → query_type = "aggregate", return NUMBER ONLY
- List questions → query_type = "list", return BULLET POINTS with lead_name ONLY
- Field lookup → query_type = "field_lookup", return FIELD VALUE ONLY
- Record lookup → query_type = "record_lookup", return SHORT SENTENCE

FILTER MAPPING FOR LEADS_TABLE:
- "lead_id" with value like "LD-XXX" → use filter: {"text": "LD-XXX"} (text column stores lead IDs)
- Status filters → use "status" column
- Priority filters → use "priority" column
- Industry filters → use "industry_type" column
- Assignment filters → use "assigned_to" column
- Time filters → use "created_at", "last_attempted_at", or "due_date" columns

EXAMPLES:
- "What is the total lead count?" → {"intent_type": "crm_query", "query_type": "aggregate", "metric": "lead_count", "table": "leads_table", "scope": "global", "filters": {}}
- "What is the lead count for today?" → {"intent_type": "crm_query", "query_type": "aggregate", "metric": "lead_count", "table": "leads_table", "scope": "global", "filters": {"time_range": "today"}}
- "How many leads have arrived today?" → {"intent_type": "crm_query", "query_type": "aggregate", "metric": "lead_count", "table": "leads_table", "scope": "global", "filters": {"time_range": "today"}}
- "How many leads have been arrived today" → {"intent_type": "crm_query", "query_type": "aggregate", "metric": "lead_count", "table": "leads_table", "scope": "global", "filters": {"time_range": "today"}}
- "What is the lead count today?" → {"intent_type": "crm_query", "query_type": "aggregate", "metric": "lead_count", "table": "leads_table", "scope": "global", "filters": {"time_range": "today"}}
- "What is the lead name of LD-101?" → {"intent_type": "crm_query", "query_type": "field_lookup", "table": "leads_table", "field": "lead_name", "scope": "global", "filters": {"lead_id": "LD-101"}}
- "Show all pending tasks" → {"intent_type": "crm_query", "query_type": "list", "table": "tasks_table", "scope": "global", "filters": {"status": "Pending"}}
- "List tasks created today" → {"intent_type": "crm_query", "query_type": "list", "table": "tasks_table", "scope": "global", "filters": {"time_range": "today"}}

INTENT TYPE: "general_message"
If the message is ANY conversational message (greeting, question about you, help request, acknowledgement, general chit-chat), respond EXACTLY with:
{
  "intent_type": "general_message"
}

CRITICAL: These are ALWAYS general_message (even with typos):
- "Hi", "Hello", "Hey", "Hii", "Hyy", "Hiii", "Hallo", "Hlo" , etc.
- "How are you", "How r u", "How are u", "Who are you", "What are you"
- "What can you do", "Help", "How do I use this"
- "Thanks", "Thank you", "Thx", "Ok", "Okay", "K"
- "How's it going", "Nice to meet you", "What's up"
- Any friendly conversational message that does NOT ask for CRM data

If the message is just a greeting or casual conversation, it MUST be classified as "general_message".

INTENT TYPE: "unsupported"
If the question is about topics outside CRM scope, respond EXACTLY with:
{
  "intent_type": "unsupported"
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

  // Fallback: Check if question is clearly a general message FIRST (before parsing)
  // This helps us handle cases where AI output is malformed
  const questionLower = question.toLowerCase().trim();
  const generalMessagePatterns = [
    /^(hi|hello|hey|hii|hyy|hiii|hallo|hiya|greetings)(\s|$|[!?.])/i,
    /^(how are you|how r u|how are u|who are you|what are you)(\s|$|[!?.])/i,
    /^(thanks|thank you|thx|ty|ok|okay|k|sure|yep|yeah)(\s|$|[!?.])/i,
    /^(what's up|whats up|sup|how's it going|hows it going)(\s|$|[!?.])/i,
    /^(help|what can you do)(\s|$|[!?.])/i,
  ];

  const isGeneralMessage = generalMessagePatterns.some(pattern => pattern.test(questionLower));

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
    // If it's clearly a general message, return that instead of throwing
    if (isGeneralMessage) {
      console.warn("AI output malformed but question is clearly a general message. Returning general_message intent.");
      return { intent_type: "general_message" };
    }
    throw new Error("Failed to understand the question. Please try rephrasing.");
  }

  // Attempt JSON.parse() with error handling
  let parsedIntent;
  try {
    parsedIntent = JSON.parse(cleanedText);
  } catch (parseError) {
    // JSON.parse failed - log and check if it's a general message
    console.error("JSON parse failed:", parseError.message);
    console.error("Attempted to parse:", cleanedText.substring(0, 200));
    // If it's clearly a general message, return that instead of throwing
    if (isGeneralMessage) {
      console.warn("JSON parse failed but question is clearly a general message. Returning general_message intent.");
      return { intent_type: "general_message" };
    }
    throw new Error("Failed to understand the question. Please try rephrasing.");
  }

  // Handle intent_type classification
  if (!parsedIntent.intent_type) {
    // Legacy support: check for old "type" field
    if (parsedIntent.type === "conversation") {
      parsedIntent.intent_type = "general_message";
    } else if (parsedIntent.error === "unsupported_query") {
      parsedIntent.intent_type = "unsupported";
    } else if (parsedIntent.query_type) {
      // Has query_type, so it's a crm_query
      parsedIntent.intent_type = "crm_query";
    } else if (isGeneralMessage) {
      // Fallback: if it matches general message patterns, classify as general_message
      console.warn("Question matches general message pattern, classifying as general_message. Question:", question);
      parsedIntent.intent_type = "general_message";
    } else {
      // If no query_type and no explicit intent_type, default to general_message
      // This handles cases where the AI didn't classify properly
      console.warn("No intent_type found, defaulting to general_message. Parsed intent:", JSON.stringify(parsedIntent));
      parsedIntent.intent_type = "general_message";
    }
  }

  // Override: If question is clearly a general message but AI classified it wrong, fix it
  if (isGeneralMessage && parsedIntent.intent_type === "crm_query" && !parsedIntent.query_type) {
    console.warn("Question is clearly a general message but was misclassified. Overriding to general_message. Question:", question);
    parsedIntent.intent_type = "general_message";
  }

  // Handle unsupported intent
  if (parsedIntent.intent_type === "unsupported") {
    return parsedIntent;
  }

  // Handle general_message intent - return early, no validation needed
  if (parsedIntent.intent_type === "general_message") {
    return parsedIntent;
  }

  // Continue validation for crm_query intents only
  if (parsedIntent.intent_type !== "crm_query") {
    console.error("Invalid intent_type:", parsedIntent.intent_type);
    // Instead of throwing, default to general_message for safety
    return { intent_type: "general_message" };
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

