#!/usr/bin/env node

/**
 * pipe-ai: A command-line tool to interface with OpenAI API using piped input or files.
 *
 * Usage:
 *   - Piping input with a prompt provided via the `-m` option:
 *     $ git log | pipe-ai -m "Summarize the git log."
 *
 *   - Piping input without a prompt provided:
 *     $ git log | pipe-ai
 *     (The program will prompt you to enter a prompt interactively.)
 *
 *   - Reading input from a file with a prompt provided via the `-m` option:
 *     $ pipe-ai <file path> -m "Your prompt here."
 *
 *   - Outputting to a file:
 *     $ git log | pipe-ai -m "Summarize the git log." -o output.txt
 *
 * Description:
 *   This script reads input from stdin or a file, takes a prompt (either via the `-m` option or interactively),
 *   and sends the data to the OpenAI API using the configuration specified in `config.js`.
 *   The response from the API is then output to stdout or saved to a file if the `-o` option is used.
 */

// Import necessary modules
const fs = require('fs');
const readline = require('readline').promises;
const { Configuration, OpenAIApi } = require('openai');
const commander = require('commander');
const config = require('config'); // Library for configuration management

// Initialize the command-line interface
const program = new commander.Command();

// Define the CLI options and arguments
program
  .version('1.0.0')
  .description('A CLI tool to interface with OpenAI API using piped input or files.')
  .argument('[file]', 'File path to read input from')
  .option('-m, --message <prompt>', 'Prompt message for the AI')
  .option('-o, --output <file>', 'Output file to save the AI response')
  .parse(process.argv);

// Extract options and arguments
const options = program.opts();
const filePath = program.args[0];
const promptMessage = options.message;
const outputFile = options.output;

/**
 * Main function to run the script.
 */
async function main() {
  try {
    // Load configuration from config.js
    const apiKey = config.get('apiKey');
    const model = config.get('model') || 'gpt-3.5-turbo';

    // Create OpenAI client
    const openai = new OpenAIApi(new Configuration({ apiKey }));

    // Get input data (from file or stdin)
    const inputData = await getInputData(filePath);

    // Get prompt (from option or interactively)
    const prompt = await getPrompt(promptMessage);

    // Combine input data and prompt to form the message
    const messages = [
      { role: 'system', content: inputData },
      { role: 'user', content: prompt },
    ];

    // Call the OpenAI API
    const response = await openai.createChatCompletion({
      model,
      messages,
    });

    // Extract the AI's reply
    const aiReply = response.data.choices[0].message.content;

    // Output the AI's reply
    await outputResult(aiReply, outputFile);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

/**
 * Function to get input data from a file or stdin.
 * @param {string} filePath - The path to the input file.
 * @returns {Promise<string>} - The input data as a string.
 */
async function getInputData(filePath) {
  if (filePath) {
    // Read from the specified file
    return await fs.promises.readFile(filePath, 'utf8');
  } else if (!process.stdin.isTTY) {
    // Read from stdin
    let data = '';
    process.stdin.setEncoding('utf8');
    for await (const chunk of process.stdin) {
      data += chunk;
    }
    return data;
  } else {
    // No input provided
    program.help();
  }
}

/**
 * Function to get the prompt message.
 * @param {string} promptMessage - The prompt message from the CLI option.
 * @returns {Promise<string>} - The prompt message.
 */
async function getPrompt(promptMessage) {
  if (promptMessage) {
    // Use the prompt provided via the -m option
    return promptMessage;
  } else {
    // Prompt the user to enter a prompt interactively
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await rl.question('Enter your prompt: ');
    rl.close();
    return answer;
  }
}

/**
 * Function to output the result to stdout or a file.
 * @param {string} result - The AI's reply.
 * @param {string} outputFile - The path to the output file.
 */
async function outputResult(result, outputFile) {
  if (outputFile) {
    // Write the result to the specified output file
    await fs.promises.writeFile(outputFile, result, 'utf8');
    console.log(`Output saved to ${outputFile}`);
  } else {
    // Output the result to stdout
    console.log(result);
  }
}

// Execute the main function
main();