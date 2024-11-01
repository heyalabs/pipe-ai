// Hypothetical import; replace with actual Claude AI SDK import
// const { ClaudeAIClient } = require('claudeai');

async function getAIResponse(configData, inputData, prompt) {
  // Initialize Claude AI client
  const claudeClient = new ClaudeAIClient({
    ...configData.configuration,
    apiKey: configData.apiKey, // Specify apiKey last to prevent overwriting
  });

  // Combine input data and prompt
  const fullPrompt = `${inputData}\n${prompt}`;

  // Call the Claude AI API
  const response = await claudeClient.generateCompletion({
    ...configData.defaultRequestOptions,
    prompt: fullPrompt,
  });

  // Extract the AI's reply
  return response.completion;
}

module.exports = { getAIResponse };