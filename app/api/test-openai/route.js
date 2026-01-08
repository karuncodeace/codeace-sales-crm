export const runtime = "nodejs";

import { callOllamaChat } from "../../../lib/ai/ollamaClient";

/**
 * Test endpoint to verify Ollama API connection
 * GET /api/test-openai (kept route name for backward compatibility)
 */
export async function GET() {
  try {
    // No API key needed for local Ollama

    // Test Ollama API call
    const completion = await callOllamaChat([
      {
        role: "user",
        content: "Return ONLY JSON: {\"status\":\"ok\"}",
      },
    ], {
      temperature: 0,
    });

    const rawOutput = completion.choices[0]?.message?.content || "";

    // Log raw output for debugging
    console.log("Ollama test - RAW OUTPUT:", rawOutput);

    return Response.json({
      success: true,
      output: rawOutput,
      model: "qwen2.5:0.5b-instruct"
    });

  } catch (error) {
    // Log error details
    console.error("Ollama test error:", error.message);
    console.error("Error details:", error);
    
    return Response.json(
      {
        success: false,
        error: error.message || "Failed to connect to Ollama API. Make sure Ollama is running on localhost:11434"
      },
      { status: 500 }
    );
  }
}
