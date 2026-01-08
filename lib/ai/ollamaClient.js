/**
 * Ollama Client for Qwen model
 * Replaces OpenAI SDK with local Ollama API calls
 */

/**
 * Call Ollama with a simple prompt string
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} The model's response
 */
export async function callOllama(prompt) {
  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "qwen2.5:0.5b-instruct",
      prompt,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error("Ollama call failed");
  }

  const data = await response.json();
  return data.response;
}

/**
 * Call Ollama with chat-style messages (system + user)
 * Compatible with OpenAI's chat.completions.create format
 * @param {Array<{role: string, content: string}>} messages - Array of message objects
 * @param {Object} options - Optional parameters (temperature, response_format, etc.)
 * @returns {Promise<{choices: Array<{message: {content: string}}>}>} OpenAI-compatible response format
 */
export async function callOllamaChat(messages, options = {}) {
  // Use Ollama's chat API endpoint which supports messages format
  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "qwen2.5:0.5b-instruct",
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      stream: false,
      options: {
        temperature: options.temperature || 0.7
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama call failed: ${errorText}`);
  }

  const data = await response.json();
  
  // Return OpenAI-compatible format
  return {
    choices: [{
      message: {
        content: data.message?.content || data.response || ""
      }
    }]
  };
}

