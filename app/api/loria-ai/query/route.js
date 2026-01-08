export const runtime = "nodejs";

/**
 * Loria AI Query API Endpoint
 * Production-grade two-pass AI backend for Sales CRM
 * 
 * Architecture:
 * 1. Pass 1: AI extracts structured intent (JSON only)
 * 2. Validation: Strict validation of metrics, tables, filters
 * 3. Time Range: Convert relative time to actual dates
 * 4. Query: Execute predefined database query
 * 5. Pass 2: AI generates natural language answer from computed data
 * 
 * CRITICAL: This endpoint ALWAYS returns JSON, never HTML.
 */

import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "../../../../lib/supabase/serverClient";
import { validateIntent, isRevenueMetric } from "../../../../lib/aiValidation";
import { executeMetricQuery, executeQuery } from "../../../../lib/metricResolver";
import { extractIntent } from "../../../../lib/ai/intentExtractor";
import { 
  generateAnswer, 
  generateConversationalAnswer,
  generateAggregateAnswer,
  generateListAnswer,
  generateRecordAnswer,
  generateFieldAnswer
} from "../../../../lib/ai/answerGenerator";

/**
 * Main POST handler
 * Wrapped in try-catch to ensure JSON responses in all cases
 */
export async function POST(request) {
  try {
    // ==========================================
    // REQUEST BODY PARSING
    // ==========================================
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      console.error("Request body parsing error:", error);
      return Response.json(
        {
          error: "invalid_request_body",
          message: "Request body must be valid JSON"
        },
        { status: 400 }
      );
    }

    // Validate question field
    if (!requestBody.question || typeof requestBody.question !== "string") {
      return Response.json(
        {
          error: "question_required",
          message: "The 'question' field is required and must be a string"
        },
        { status: 400 }
      );
    }

    const { question } = requestBody;

    // ==========================================
    // AUTHENTICATION - Support both Bearer token and Cookie auth
    // ==========================================
    let authenticatedUser = null;
    let supabaseClient = null;

    // Check for Authorization header first (preferred for external clients)
    const authHeader = request.headers.get("authorization");
    
    if (authHeader?.startsWith("Bearer ")) {
      // Bearer token authentication (for external API clients)
      const accessToken = authHeader.split(" ")[1];
      
      if (!accessToken) {
        return Response.json(
          {
            error: "not_authorized",
            message: "Authentication required."
          },
          { status: 401 }
        );
      }

      // Create Supabase client with Bearer token
      supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        }
      );

      // Validate the access token
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(accessToken);

      if (!user || authError) {
        return Response.json(
          {
            error: "not_authorized",
            message: "Invalid or expired session."
          },
          { status: 401 }
        );
      }

      authenticatedUser = user;
    } else {
      // Cookie-based authentication (existing behavior for frontend)
      try {
        supabaseClient = await supabaseServer();
        
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !user) {
          return Response.json(
            {
              error: "not_authorized",
              message: "Authentication required."
            },
            { status: 401 }
          );
        }

        authenticatedUser = user;
      } catch (error) {
        return Response.json(
          {
            error: "not_authorized",
            message: "Authentication validation failed."
          },
          { status: 401 }
        );
      }
    }

    // Get CRM user info from users table
    if (!authenticatedUser?.email) {
      return Response.json(
        {
          error: "not_authorized",
          message: "User email not found."
        },
        { status: 401 }
      );
    }

    // Look up user in CRM users table
    const { data: dbUser, error: userError } = await supabaseClient
      .from("users")
      .select("id, email, role")
      .ilike("email", authenticatedUser.email)
      .maybeSingle();

    if (!dbUser || userError) {
      return Response.json(
        {
          error: "not_authorized",
          message: "User not found in CRM system."
        },
        { status: 401 }
      );
    }

    // Get sales_person_id if role is sales
    let salesPersonId = null;
    if (dbUser.role?.toLowerCase() === "sales") {
      const { data: salesPerson } = await supabaseClient
        .from("sales_persons")
        .select("id")
        .eq("user_id", dbUser.id)
        .maybeSingle();
      
      salesPersonId = salesPerson?.id || null;
    }

    const crmUser = {
      id: dbUser.id,
      role: (dbUser.role || "sales").toLowerCase().trim(),
      email: dbUser.email,
      salesPersonId: salesPersonId
    };

    // ==========================================
    // PASS 1: AI INTENT EXTRACTION
    // ==========================================
    let parsedIntent;
    try {
      parsedIntent = await extractIntent(question);
    } catch (error) {
      // Log minimal error details (no stack traces or sensitive info)
      console.error("Intent extraction error:", error.message);
      return Response.json(
        {
          error: "intent_extraction_failed",
          message: "Failed to understand the question. Please try rephrasing."
        },
        { status: 400 }
      );
    }

    // ==========================================
    // VALIDATION LAYER
    // ==========================================
    let validation;
    try {
      validation = validateIntent(parsedIntent);
    } catch (error) {
      console.error("Validation error:", error);
      return Response.json(
        {
          error: "validation_error",
          message: "Failed to validate AI output"
        },
        { status: 500 }
      );
    }

    if (!validation.valid) {
      console.error("Intent validation failed:", validation.error);
      return Response.json(
        {
          error: "invalid_intent",
          message: validation.error || "The AI extracted invalid intent"
        },
        { status: 400 }
      );
    }

    // Handle conversational responses
    if (validation.isConversation) {
      try {
        const answer = await generateConversationalAnswer(question);
        return Response.json({
          answer: answer,
          source: "ai_conversation"
        });
      } catch (error) {
        // Log minimal error details
        console.error("Conversational answer generation error:", error.message);
        return Response.json(
          {
            error: "answer_generation_failed",
            message: "Failed to generate conversational response"
          },
          { status: 500 }
        );
      }
    }

    // Check for revenue metrics (additional safety check - only for aggregate queries)
    if (parsedIntent.query_type === "aggregate" && isRevenueMetric(parsedIntent.metric)) {
      return Response.json(
        {
          error: "revenue_metric_forbidden",
          message: "Revenue and money-related metrics are not available"
        },
        { status: 400 }
      );
    }

    // ==========================================
    // DATABASE QUERY EXECUTION
    // ==========================================
    let queryResult;
    try {
      queryResult = await executeQuery(
        parsedIntent.query_type,
        parsedIntent.metric,
        parsedIntent.table,
        parsedIntent.field,
        parsedIntent.filters || {},
        crmUser,
        parsedIntent.scope || "global"
      );
    } catch (error) {
      console.error("Query execution error:", error);
      
      // Check if it's a Supabase error
      if (error.code || error.message?.includes("Supabase") || error.message?.includes("database")) {
        return Response.json(
          {
            error: "database_query_failed",
            message: "Failed to execute database query",
            details: error.message || String(error)
          },
          { status: 500 }
        );
      }
      
      // Generic query error
      return Response.json(
        {
          error: "query_execution_failed",
          message: "Failed to execute query",
          details: error.message || String(error)
        },
        { status: 500 }
      );
    }

    // ==========================================
    // PASS 2: STRICT AI ANSWER GENERATION
    // ==========================================
    let answer;
    try {
      // Handle different query types with STRICT rules
      if (parsedIntent.query_type === "aggregate") {
        // Aggregate: Single sentence with computed value
        const timeRange = parsedIntent.filters?.time_range || null;
        answer = await generateAggregateAnswer(
          question,
          parsedIntent.metric,
          queryResult.value,
          timeRange
        );
      } else if (parsedIntent.query_type === "field_lookup") {
        // Field lookup: ONLY the field value
        answer = generateFieldAnswer(
          question,
          parsedIntent.field,
          queryResult.value
        );
      } else if (parsedIntent.query_type === "record_lookup") {
        // Record lookup: Short sentence describing the record
        answer = await generateRecordAnswer(
          question,
          queryResult.record,
          parsedIntent.table
        );
      } else if (parsedIntent.query_type === "list") {
        // List: ONLY bullet points with primary display field (no AI, direct formatting)
        const records = queryResult.data || [];
        answer = generateListAnswer(
          question,
          parsedIntent.table,
          records
        );
        // Include data in response for list queries
        return Response.json({
          answer: answer,
          data: records,
          count: records.length,
          source: "crm_database"
        });
      }
    } catch (error) {
      // Log minimal error details
      console.error("Answer generation error:", error.message);
      return Response.json(
        {
          error: "answer_generation_failed",
          message: "Failed to generate natural language answer"
        },
        { status: 500 }
      );
    }

    // ==========================================
    // FINAL RESPONSE FORMAT
    // ==========================================
    const response = {
      answer: answer,
      source: "crm_database"
    };

    // Include record data for record_lookup queries
    if (parsedIntent.query_type === "record_lookup" && queryResult.record) {
      response.record = queryResult.record;
    }

    // Include field value for field_lookup queries
    if (parsedIntent.query_type === "field_lookup" && queryResult.value !== null) {
      response.value = queryResult.value;
    }

    return Response.json(response);

  } catch (error) {
    // Catch-all error handler - ensures JSON is always returned
    console.error("Loria AI Query API Error (unhandled):", error);
    console.error("Error stack:", error.stack);
    
    // Return JSON error response - NEVER HTML
    return Response.json(
      {
        error: "internal_server_error",
        message: "An unexpected error occurred while processing your request"
      },
      { status: 500 }
    );
  }
}
