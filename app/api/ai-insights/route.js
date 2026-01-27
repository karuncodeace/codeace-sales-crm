export const runtime = "nodejs";

/**
 * AI Insights Proxy API Route
 * Forwards requests to the Flask backend at http://localhost:5001/ai-insights
 * 
 * This proxy route avoids CORS issues and keeps the frontend unaware of the backend URL.
 */

export async function POST(request) {
  try {
    // Parse request body
    const { question } = await request.json();

    // Validate question field
    if (!question || typeof question !== "string") {
      return Response.json(
        {
          error: "question_required",
          message: "The 'question' field is required and must be a string"
        },
        { status: 400 }
      );
    }

    // Forward request to Flask backend
    const flaskResponse = await fetch('http://localhost:5001/ai-insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question })
    });

    // Check if Flask backend responded successfully
    if (!flaskResponse.ok) {
      const errorData = await flaskResponse.json().catch(() => ({}));
      return Response.json(
        {
          error: "backend_error",
          message: errorData.message || errorData.error || `Backend returned ${flaskResponse.status}`,
          status: flaskResponse.status
        },
        { status: flaskResponse.status }
      );
    }

    // Parse Flask response
    const data = await flaskResponse.json();

    // Return response in format expected by ChatBot UI
    // Flask returns: { "intent": "...", "answer": "..." }
    // UI expects: { "answer": "..." } or { "answer": "...", "data": [...] }
    return Response.json({
      answer: data.answer || data.response || data.message,
      intent: data.intent, // Include intent for debugging if needed
      source: "ai_insights"
    });

  } catch (error) {
    console.error("AI Insights Proxy Error:", error);
    
    // Handle network errors (Flask backend not running, etc.)
    if (error.message?.includes("fetch failed") || error.message?.includes("ECONNREFUSED")) {
      return Response.json(
        {
          error: "backend_unavailable",
          message: "AI service is currently unavailable. Please ensure the backend is running on http://localhost:5001"
        },
        { status: 503 }
      );
    }

    // Generic error
    return Response.json(
      {
        error: "internal_server_error",
        message: "An unexpected error occurred while processing your request"
      },
      { status: 500 }
    );
  }
}
