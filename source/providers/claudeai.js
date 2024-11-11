// claudeai.js
// Replace the hypothetical import with the actual Claude AI SDK import
import { ClaudeAIClient } from 'claudeai' // Ensure 'claudeai' supports ES modules

/**
 * Function to get AI response from Claude AI.
 * @param {Object} configData - Configuration data containing API keys and settings.
 * @param {string} inputData - Input data (e.g., system prompt).
 * @param {string} prompt - User prompt.
 * @returns {Promise<string>} - AI's reply.
 */
export async function getAIResponse(configData, inputData, prompt) {
  // Initialize Claude AI client
  const claudeClient = new ClaudeAIClient({
    ...configData.configuration,
    apiKey: configData.apiKey // Specify apiKey last to prevent overwriting
  })

  // Combine input data and prompt
  const fullPrompt = `${inputData}\n${prompt}`

  // Call the Claude AI API
  const response = await claudeClient.generateCompletion({
    ...configData.defaultRequestOptions,
    prompt: fullPrompt
  })

  // Extract the AI's reply
  return response.completion
}
