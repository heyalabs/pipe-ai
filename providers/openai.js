const { Configuration, OpenAIApi } = require('openai');

async function getAIResponse(configData, inputData, prompt) {
  // Create OpenAI client using the configuration object
  const openai = new OpenAIApi(new Configuration({
    ...configData.configuration,
    apiKey: configData.apiKey, // Specify apiKey last to prevent overwriting
  }));

  // Combine input data and prompt to form the messages
  const messages = [
    { role: 'system', content: inputData },
    { role: 'user', content: prompt },
  ];

  // Call the OpenAI API
  const response = await openai.createChatCompletion({
    ...configData.defaultRequestOptions,
    messages,
  });

  // Extract the AI's reply
  return response.data.choices[0].message.content;
}

module.exports = { getAIResponse };