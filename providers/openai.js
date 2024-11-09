// openai.js
import { OpenAI } from 'openai'

/**
 * Function to get AI response from OpenAI.
 * @param {Object} configData - Configuration data containing API keys and settings.
 * @param {string} inputData - Input data (e.g., system prompt).
 * @param {string} prompt - User prompt.
 * @returns {Promise<string>} - AI's reply.
 */
export async function getAIResponse(configData, inputData, prompt) {
  // Create OpenAI client
  const openai = new OpenAI({
    apiKey: configData.apiKey,
    ...configData.configuration
  })

  // Combine input data and prompt
  const messages = [
    { role: 'system', content: inputData },
    { role: 'user', content: prompt }
  ]

  // Call the OpenAI API
  const response = await openai.chat.completions.create({
    ...configData.defaultRequestOptions,
    messages
  })

  // Extract the AI's reply
  return response.choices[0].message.content
}
