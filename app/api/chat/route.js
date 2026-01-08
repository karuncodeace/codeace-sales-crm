export const runtime = "nodejs";

import { callOllamaChat } from "../../../lib/ai/ollamaClient";
import { supabaseAdmin } from "../../../lib/supabase/serverClient";

export async function POST(request) {
    try {
        const { message, history } = await request.json();

        // No API key needed for local Ollama

        // 1. First turn: Analyze intent and generate Supabase query if needed
        const schemaDescription = `
      Table: leads_table
      Columns:
      - id (uuid)
      - created_at (timestamp)
      - first_name (text)
      - last_name (text)
      - email (text)
      - phone (text)
      - company (text)
      - status (text, e.g. "New", "Follow up", "Won", "Lost", "Closed")
      - first_call_done (text, e.g. "Done", "Not Done")
      - lead_qualification (text, e.g. "Qualified", "Not Qualified")
      - meeting_status (text, e.g. "Scheduled", "Completed")
      - assigned_to (text/uuid)
      - last_attempted_at (timestamp)
      - notes (text)
    `;

        const systemPrompt = `
      You are an AI assistant for a Sales CRM. You have READ-ONLY access to the "leads_table" in Supabase.
      
      User Schema:
      ${schemaDescription}

      Your goal is to answer the user's question. 
      If the user asks for data (e.g., "count leads", "show me won deals", "who did I call?"), you should generate a structured JSON object representing a Supabase Query.
      If the user simply says "hello" or asks a general question, return a conversational JSON response.

      Output JSON Format:
      {
        "type": "query" | "conversation",
        "reply": "Conversational response if type is conversation, or a brief explanation if type is query",
        "query": { // Only if type is "query"
          "table": "leads_table",
          "select": "columns to select, e.g. * or count",
          "count": boolean, // true if counting
          "filters": [
            { "column": "col_name", "operator": "eq|neq|gt|gte|lt|lte|ilike|is", "value": "val" }
          ],
          "order": { "column": "col_name", "ascending": boolean },
          "limit": number // default 10
        }
      }

      Valid operators: eq (equal), neq (not equal), gt (greater), gte (greater/equal), lt (less), lte (less/equal), ilike (case-insensitive search), is (for null).
      
      Examples:
      User: "How many won leads?"
      JSON: { "type": "query", "reply": "Checking won leads...", "query": { "table": "leads_table", "select": "*", "count": true, "filters": [{ "column": "status", "operator": "ilike", "value": "Won" }] } }
      
      User: "Show me 5 recent leads"
      JSON: { "type": "query", "reply": "Here are 5 recent leads.", "query": { "table": "leads_table", "select": "first_name, last_name, status, created_at", "order": { "column": "created_at", "ascending": false }, "limit": 5 } }

      User: "Hello"
      JSON: { "type": "conversation", "reply": "Hello! How can I help you with your sales data today?" }
    `;

        const completion = await callOllamaChat([
            {
                role: "system",
                content: systemPrompt,
            },
            {
                role: "user",
                content: message,
            },
        ], {
            temperature: 0,
        });

        const responseText = completion.choices[0]?.message?.content || "";

        // Clean up potential markdown code blocks 
        const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(cleanedText);
        } catch (e) {
            // Fallback if model fails to output valid JSON
            console.error("Failed to parse Ollama JSON:", e);
            return Response.json({ reply: responseText }); // Just return raw text
        }

        if (parsedResponse.type === "conversation") {
            return Response.json({ reply: parsedResponse.reply });
        }

        if (parsedResponse.type === "query") {
            // Execute the interpreted query
            const supabase = supabaseAdmin();
            const q = parsedResponse.query;

            let queryBuilder = supabase.from(q.table).select(q.select || "*", { count: q.count ? "exact" : null });

            if (q.filters) {
                q.filters.forEach(filter => {
                    if (filter.operator === "eq") queryBuilder = queryBuilder.eq(filter.column, filter.value);
                    else if (filter.operator === "neq") queryBuilder = queryBuilder.neq(filter.column, filter.value);
                    else if (filter.operator === "gt") queryBuilder = queryBuilder.gt(filter.column, filter.value);
                    else if (filter.operator === "gte") queryBuilder = queryBuilder.gte(filter.column, filter.value);
                    else if (filter.operator === "lt") queryBuilder = queryBuilder.lt(filter.column, filter.value);
                    else if (filter.operator === "lte") queryBuilder = queryBuilder.lte(filter.column, filter.value);
                    else if (filter.operator === "ilike") queryBuilder = queryBuilder.ilike(filter.column, `%${filter.value}%`);
                    else if (filter.operator === "is") queryBuilder = queryBuilder.is(filter.column, filter.value);
                });
            }

            if (q.order && !q.count) { // Counting doesn't accept order usually in simple count queries, but select(*, count) does
                queryBuilder = queryBuilder.order(q.order.column, { ascending: q.order.ascending });
            }

            if (q.limit && !q.count) {
                queryBuilder = queryBuilder.limit(q.limit);
            } else if (!q.count) {
                queryBuilder = queryBuilder.limit(10); // Safety limit
            }

            const { data, count, error } = await queryBuilder;

            if (error) {
                return Response.json({ reply: `I encountered an error accessing the database: ${error.message}` });
            }

            // 2. Second turn: Summarize the data
            const summaryPrompt = `
        User asked: "${message}"
        
        Database Result:
        Count: ${count}
        Data: ${JSON.stringify(data)}

        Please answer the user's question naturally based on this data. Use the Instrument Serif font style in your tone (professional, elegant). 
        Format the answer nicely. If lists are returned, present them clearly.
      `;

            const summaryCompletion = await callOllamaChat([
                    {
                        role: "system",
                        content: "You are a Sales CRM Assistant. Answer questions clearly and professionally based on the provided data.",
                    },
                    {
                        role: "user",
                        content: summaryPrompt,
                    },
                ], {
                    temperature: 0.3,
                });
            return Response.json({ reply: summaryCompletion.choices[0]?.message?.content || "I couldn't generate a summary." });
        }

    } catch (error) {
        console.error("Chat API Error:", error);
        return Response.json(
            {
                error: "Internal Server Error",
                details: error.message,
                stack: error.stack
            },
            { status: 500 }
        );
    }
}
