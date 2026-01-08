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
import { validateIntent, isRevenueMetric, validateLeadsTableScope } from "../../../../lib/aiValidation";
import { executeMetricQuery, executeQuery } from "../../../../lib/metricResolver";
import { extractIntent } from "../../../../lib/ai/intentExtractor";
import { 
  generateAnswer, 
  generateConversationalAnswer,
  generateAggregateAnswer,
  generateListAnswer,
  generateRecordAnswer,
  generateFieldAnswer,
  generateUnsupportedAnswer
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
      
      // Fallback: Check if it's a simple general message before giving up
      const questionLower = question.toLowerCase().trim();
      const generalMessagePatterns = [
        /^(hi|hello|hey|hii|hyy|hiii|hallo|hiya|greetings)(\s|$|[!?.])/i,
        /^(how are you|how r u|how are u|who are you|what are you)(\s|$|[!?.])/i,
        /^(thanks|thank you|thx|ty|ok|okay|k|sure|yep|yeah)(\s|$|[!?.])/i,
        /^(what's up|whats up|sup|how's it going|hows it going)(\s|$|[!?.])/i,
        /^(help|what can you do)(\s|$|[!?.])/i,
      ];
      
      const isGeneralMessage = generalMessagePatterns.some(pattern => pattern.test(questionLower));
      
      if (isGeneralMessage) {
        console.warn("Intent extraction failed but question is clearly a general message. Handling as general_message.");
        try {
          const { generateConversationalAnswer } = await import("../../../../lib/ai/answerGenerator");
          const answer = await generateConversationalAnswer(question);
          return Response.json({
            answer: answer,
            source: "ai_conversation"
          });
        } catch (genError) {
          console.error("Failed to generate conversational answer:", genError.message);
          return Response.json(
            {
              error: "intent_extraction_failed",
              message: "Failed to understand the question. Please try rephrasing."
            },
            { status: 400 }
          );
        }
      }
      
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

    // Fallback: Check if question mentions "today" but time_range filter is missing
    if (parsedIntent.intent_type === "crm_query" && parsedIntent.query_type === "aggregate") {
      const questionLower = question.toLowerCase();
      const hasToday = questionLower.includes("today") || 
                       questionLower.includes("arrived today") || 
                       questionLower.includes("have arrived today") ||
                       questionLower.includes("have been arrived today") ||
                       questionLower.includes("for today") ||
                       questionLower.includes("in today");
      
      if (hasToday && !parsedIntent.filters?.time_range) {
        console.warn("Question mentions 'today' but time_range filter is missing. Adding time_range filter.");
        if (!parsedIntent.filters) {
          parsedIntent.filters = {};
        }
        parsedIntent.filters.time_range = "today";
      }
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

    // Handle intent_type classification
    const intentType = parsedIntent.intent_type || (validation.isConversation ? "general_message" : null);

    // Fallback: Check if question is clearly a general message (simple greetings, etc.)
    const questionLower = question.toLowerCase().trim();
    const generalMessagePatterns = [
      /^(hi|hello|hey|hii|hyy|hiii|hallo|hiya|greetings)(\s|$|[!?.])/i,
      /^(how are you|how r u|how are u|who are you|what are you)(\s|$|[!?.])/i,
      /^(thanks|thank you|thx|ty|ok|okay|k|sure|yep|yeah)(\s|$|[!?.])/i,
      /^(what's up|whats up|sup|how's it going|hows it going)(\s|$|[!?.])/i,
      /^(help|what can you do)(\s|$|[!?.])/i,
    ];
    const isGeneralMessage = generalMessagePatterns.some(pattern => pattern.test(questionLower));

    // If it's clearly a general message but wasn't classified as such, override
    if (isGeneralMessage && intentType !== "general_message") {
      console.warn("Question is clearly a general message but was misclassified. Overriding. Question:", question);
      // Handle as general message
      try {
        const answer = await generateConversationalAnswer(question);
        return Response.json({
          answer: answer,
          source: "ai_conversation"
        });
      } catch (error) {
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

    // Handle unsupported intents
    if (intentType === "unsupported") {
      return Response.json({
        answer: generateUnsupportedAnswer(question),
        source: "ai_conversation"
      });
    }

    // Handle general_message intents (greetings, help, acknowledgements)
    if (intentType === "general_message" || validation.isConversation) {
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

    // If no intent_type was determined and it's not a general message, default to crm_query
    if (!intentType) {
      // Check if it has query_type - if not, it's likely a general message that wasn't classified
      if (!parsedIntent.query_type) {
        console.warn("No intent_type and no query_type found. Treating as general message. Question:", question);
        try {
          const answer = await generateConversationalAnswer(question);
          return Response.json({
            answer: answer,
            source: "ai_conversation"
          });
        } catch (error) {
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
      // Has query_type, so it's a crm_query
    }

    // Continue with crm_query processing
    if (intentType !== "crm_query" && parsedIntent.query_type) {
      // If it has query_type, treat it as crm_query
      parsedIntent.intent_type = "crm_query";
    } else if (intentType !== "crm_query") {
      return Response.json(
        {
          error: "invalid_intent",
          message: "Invalid intent type"
        },
        { status: 400 }
      );
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

    // Validate leads_table scope (strict column validation)
    const leadsTableScopeError = validateLeadsTableScope(parsedIntent);
    if (leadsTableScopeError) {
      return Response.json(
        {
          answer: leadsTableScopeError,
          source: "validation"
        },
        { status: 200 } // Return 200 with the error message as answer
      );
    }

    // ==========================================
    // DATABASE QUERY EXECUTION
    // ==========================================
    // Validate required fields before executing query
    if (!parsedIntent.query_type) {
      console.error("Missing query_type for CRM query. Parsed intent:", JSON.stringify(parsedIntent));
      return Response.json(
        {
          error: "invalid_intent",
          message: "Missing query_type for database query"
        },
        { status: 400 }
      );
    }

    if (!parsedIntent.table) {
      console.error("Missing table for CRM query. Parsed intent:", JSON.stringify(parsedIntent));
      return Response.json(
        {
          error: "invalid_intent",
          message: "Missing table for database query"
        },
        { status: 400 }
      );
    }

    let queryResult;
    try {
      console.log("Executing query with params:", {
        query_type: parsedIntent.query_type,
        table: parsedIntent.table,
        metric: parsedIntent.metric,
        field: parsedIntent.field,
        filters: parsedIntent.filters,
        scope: parsedIntent.scope || "global",
        crmUser: {
          id: crmUser.id,
          role: crmUser.role,
          salesPersonId: crmUser.salesPersonId
        }
      });
      
      queryResult = await executeQuery(
        parsedIntent.query_type,
        parsedIntent.metric,
        parsedIntent.table,
        parsedIntent.field,
        parsedIntent.filters || {},
        crmUser,
        parsedIntent.scope || "global"
      );
      
      console.log("Query executed successfully:", {
        query_type: parsedIntent.query_type,
        hasValue: queryResult.value !== undefined,
        hasData: queryResult.data !== undefined,
        hasRecord: queryResult.record !== undefined,
        dataLength: queryResult.data?.length,
        value: queryResult.value
      });
    } catch (error) {
      console.error("Query execution error:", error);
      console.error("Error details:", {
        query_type: parsedIntent.query_type,
        table: parsedIntent.table,
        metric: parsedIntent.metric,
        field: parsedIntent.field,
        filters: parsedIntent.filters,
        scope: parsedIntent.scope,
        error_name: error.name,
        error_message: error.message,
        error_code: error.code,
        error_details: error.details,
        error_hint: error.hint,
        error_stack: error.stack?.substring(0, 1000) // Limit stack trace length
      });
      
      // Provide more specific error messages based on error type
      let errorMessage = "Failed to execute database query.";
      let errorDetails = error.message || String(error);
      
      // Check for specific error types
      if (error.message?.includes("Invalid time_range")) {
        errorMessage = "Invalid time range specified. Please try rephrasing your question (e.g., 'today', 'this week', 'last month').";
      } else if (error.message?.includes("Table name is required") || error.message?.includes("Query type is required")) {
        errorMessage = "Missing required query parameters. Please try rephrasing your question.";
      } else if (error.message?.includes("column") && error.message?.includes("does not exist")) {
        errorMessage = "The requested data field doesn't exist. Please try a different question.";
      } else if (error.message?.includes("Failed to initialize Supabase")) {
        errorMessage = "Database connection failed. Please check server configuration.";
        errorDetails = "Supabase client initialization error";
      } else if (error.code || error.message?.includes("Supabase") || error.message?.includes("database") || error.message?.includes("PGRST")) {
        errorMessage = "Database query failed. This might be due to invalid filters or a connection issue.";
      } else if (error.message?.includes("Unknown metric") || error.message?.includes("Unknown query type")) {
        errorMessage = "The question couldn't be processed. Please try rephrasing.";
      }
      
      // Check if it's a Supabase error
      if (error.code || error.message?.includes("Supabase") || error.message?.includes("database") || error.message?.includes("PGRST") || error.message?.includes("Failed to initialize Supabase")) {
        return Response.json(
          {
            error: "database_query_failed",
            message: errorMessage,
            details: errorDetails,
            debug: process.env.NODE_ENV === "development" ? {
              error_name: error.name,
              error_code: error.code,
              error_message: error.message
            } : undefined
          },
          { status: 500 }
        );
      }
      
      // Generic query error
      return Response.json(
        {
          error: "query_execution_failed",
          message: errorMessage,
          details: errorDetails,
          debug: process.env.NODE_ENV === "development" ? {
            error_name: error.name,
            error_message: error.message
          } : undefined
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
        // Aggregate: For leads_table, return NUMBER ONLY; for others, single sentence
        const timeRange = parsedIntent.filters?.time_range || null;
        answer = await generateAggregateAnswer(
          question,
          parsedIntent.metric,
          queryResult.value,
          timeRange,
          parsedIntent.table // Pass table name for strict leads_table rules
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
        
        // Log for debugging
        console.log("List query result:", {
          table: parsedIntent.table,
          recordCount: records.length,
          records: records.slice(0, 3), // Log first 3 records for debugging
          queryResult: queryResult
        });
        
        // Generate answer
        answer = generateListAnswer(
          question,
          parsedIntent.table,
          records
        );
        
        // Ensure answer is not empty
        if (!answer || answer.trim().length === 0) {
          console.warn("Generated answer is empty, using fallback message");
          answer = "No records found matching the specified criteria.";
        }
        
        console.log("Generated list answer:", answer);
        
        // Include data in response for list queries
        const response = {
          answer: answer,
          data: records,
          count: records.length,
          source: "crm_database"
        };
        
        console.log("List query response:", {
          answerLength: answer.length,
          dataLength: records.length,
          hasAnswer: !!answer
        });
        
        return Response.json(response);
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
