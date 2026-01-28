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

    // Forward request to Flask backend with fallback
    // Try remote server first, then fallback to localhost
    const endpoints = [
      'http://139.59.22.22:5001/ai-insights',
      'http://localhost:5001/ai-insights'
    ];

    let flaskResponse = null;
    let lastError = null;

    // Try each endpoint until one succeeds
    for (const endpoint of endpoints) {
      try {
        flaskResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ question }),
          // Add timeout to fail faster if endpoint is unreachable
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        // If we get a response (even if not ok), use it
        if (flaskResponse) {
          console.log(`✅ Successfully connected to: ${endpoint}`);
          break;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to connect to ${endpoint}:`, error.message);
        lastError = error;
        flaskResponse = null;
        // Continue to next endpoint
        continue;
      }
    }

    // If all endpoints failed
    if (!flaskResponse) {
      return Response.json(
        {
          error: "backend_unavailable",
          message: "AI service is currently unavailable. Tried both remote and local servers.",
          details: lastError?.message || "All endpoints failed"
        },
        { status: 503 }
      );
    }

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

    // Debug: Log full backend response to help diagnose issues
    console.log("Flask Backend Response:", JSON.stringify(data, null, 2));

    // Return response in format expected by ChatBot UI
    // Flask returns: { "answer": "...", "chart": { "intent": "analytics_visual", "chart_type": "...", etc. } }
    // OR: { "intent": "...", "answer": "...", "chart_type": "...", etc. } (flat structure)
    
    // Check if chart object exists (prioritize nested chart object)
    const hasChartObject = data.chart && typeof data.chart === 'object';
    const chartHasAnalyticsIntent = hasChartObject && data.chart.intent === "analytics_visual";
    
    // Use chart object data if it exists, otherwise use root level
    const chartData = hasChartObject ? data.chart : data;
    
    // Check if this is an analytics visualization response
    // If chart object exists with chart_type, treat it as analytics_visual
    const hasChartType = chartData.chart_type && chartData.chart_type.length > 0;
    const hasChartDataArrays = chartData.x_axis_data && chartData.y_axis_data && 
                                Array.isArray(chartData.x_axis_data) && Array.isArray(chartData.y_axis_data);
    const isAnalyticsVisual = chartHasAnalyticsIntent || hasChartType || hasChartDataArrays || (data.intent === "analytics_visual");
    
    console.log("Chart detection:", {
      hasChartObject,
      chartHasAnalyticsIntent,
      hasChartType,
      hasChartDataArrays,
      isAnalyticsVisual,
      rootIntent: data.intent
    });
    
    const response = {
      answer: data.answer || data.response || data.message,
      intent: isAnalyticsVisual ? "analytics_visual" : (data.intent || "general_intelligent"),
      source: "ai_insights"
    };

    // If this is an analytics visualization response, extract chart data
    if (isAnalyticsVisual && chartData.chart_type) {
      response.chart_type = chartData.chart_type;
      response.title = chartData.title;
      
      // Handle different backend response formats
      // Format 1: x_axis_label and y_axis_label with separate arrays
      if (chartData.x_axis_label && chartData.y_axis_label && chartData.x_axis_data && chartData.y_axis_data) {
        response.x_axis = chartData.x_axis_label;
        response.y_axis = chartData.y_axis_label;
        
        // Combine x_axis_data and y_axis_data arrays into data objects
        response.data = chartData.x_axis_data.map((label, index) => ({
          [chartData.x_axis_label]: label,
          [chartData.y_axis_label]: chartData.y_axis_data[index]
        }));
        
        console.log("✅ Transformed chart data from arrays:", {
          x_axis_label: chartData.x_axis_label,
          y_axis_label: chartData.y_axis_label,
          x_axis_data: chartData.x_axis_data,
          y_axis_data: chartData.y_axis_data,
          transformedData: response.data
        });
      }
      // Format 2: x_axis and y_axis with data array
      else if (chartData.x_axis && chartData.y_axis) {
        response.x_axis = chartData.x_axis;
        response.y_axis = chartData.y_axis;
        
        // Transform data array to match expected keys (x_axis and y_axis)
        // Backend may send { "label": "...", "value": ... } or already use correct keys
        const rawData = chartData.data || [];
        response.data = rawData.map(item => {
          // If data uses "label" and "value" keys, transform to x_axis and y_axis keys
          if (item.label !== undefined && item.value !== undefined) {
            return {
              [chartData.x_axis]: item.label,
              [chartData.y_axis]: item.value
            };
          }
          // If data already uses correct keys, return as-is
          return item;
        });
      }
      
      console.log("Chart data extracted from:", hasChartObject ? "nested 'chart' object" : "root level");
      console.log("Chart data extracted:", {
        intent: response.intent,
        chart_type: response.chart_type,
        title: response.title,
        x_axis: response.x_axis,
        y_axis: response.y_axis,
        dataLength: response.data?.length,
        hasData: !!response.data && response.data.length > 0,
        sampleData: response.data?.slice(0, 2)
      });
      
      // Warn if data array is missing
      if (!response.data || response.data.length === 0) {
        console.warn("⚠️ Chart metadata found but 'data' array is missing or empty.");
        console.warn("Backend should include 'data' array in chart object.");
      }
    }

    return Response.json(response);

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
