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
 *   - Using a pre-defined prompt by name:
 *     $ git log | pipe-ai -p summarize
 *
 *   - Using a pre-defined prompt by path:
 *     $ git log | pipe-ai -p /path/to/custom-prompt.txt
 *
 *   - Combining pre-defined prompt with a custom message:
 *     $ git log | pipe-ai -p summarize -m "Include author names."
 *
 * Description:
 *   This script reads input from stdin or a file, takes a prompt (either via the `-m` option,
 *   the `-p` option for pre-defined prompts, or interactively), and sends the data to the
 *   OpenAI API using the configuration specified in `config.yaml`. The response from the API
 *   is then output to stdout or saved to a file if the `-o` option is used.
 */

// Import necessary modules
const fs = require('fs');
const path = require('path');
const commander = require('commander');
const yaml = require('js-yaml');
const { loadFile } = require('./lib/utils');
const { getInputData, getInteractiveUserPrompt, outputResult } = require('./lib/common');

// Initialize the command-line interface
const program = new commander.Command();

// Define the CLI options and arguments
program
  .version('1.0.0')
  .description('A CLI tool to interface with AI APIs using piped input or files.')
  .argument('[file]', 'File path to read input from')
  .option('-m, --message <prompt>', 'Prompt message for the AI (default: ask)')
  .option('-p, --prompt <name|path>', 'Name or path of a pre-defined prompt to use')
  .option('-o, --output <file>', 'Output file to save the AI response (default: stdout)')
  .option('-c, --config <name|path>', 'Path of the configuration file (default: ./config/config.yaml)')
  .parse(process.argv);

// Extract options and arguments
const options = program.opts();
const filePath = program.args[0];
const promptMessage = options.message;
const prePromptOption = options.prompt;
const outputFile = options.output;
const configPath = options.config;

/**
 * Main function to run the script.
 */
async function main() {
  try {
    // Load configuration
    const configData = loadConfiguration(configPath);

    // Get the provider from the config data
    const providerName = configData.provider;
    if (!providerName) {
      throw new Error('Provider not specified in the configuration file.');
    }

    // Dynamically require the provider module
    const providerModulePath = path.join(__dirname, 'providers', `${providerName}.js`);
    if (!fs.existsSync(providerModulePath)) {
      throw new Error(`Provider module '${providerName}' not found.`);
    }
    const providerModule = require(providerModulePath);

    // Get input data (from file or stdin)
    const inputData = await getInputData(filePath);

    // Load pre-prompt if specified
    let prePrompt = '';
    if (prePromptOption) {
      prePrompt = loadPrePrompt(prePromptOption);
    }

    // Determine if we need to get a prompt message from the user
    let prompt = '';
    if (promptMessage) {
      // Use the prompt provided via the -m option
      prompt = promptMessage;
    } else if (!prePrompt) {
      // No pre-prompt or -m option; get prompt interactively
      prompt = await getInteractiveUserPrompt();
    } else {
      // Use only the pre-prompt
      prompt = '';
    }

    // Combine pre-prompt and prompt
    const fullPrompt = [prePrompt, prompt].filter(Boolean).join('\n');

    // Inform the user that the prompt is received
    console.error('\nPrompt received. Retrieving response...');

    // Generate AI response
    const aiReply = await providerModule.getAIResponse(configData, inputData, fullPrompt);

    // Output the AI's reply
    await outputResult(aiReply, outputFile);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

/**
 * Function to load the configuration.
 *
 * @param {string} [configOption] - The configuration file path or name.
 * @returns {object} - The parsed configuration data.
 * @throws {Error} - If the configuration file is missing required fields or not found.
 */
function loadConfiguration(configOption) {
  // Load the configuration file content
  const content = loadFile(configOption || 'config', 'config');

  // Parse the YAML configuration
  const data = yaml.load(content);

  // Validate that the 'provider' key exists
  if (!data.provider) {
    throw new Error("Configuration error: 'provider' key is missing in the configuration file.");
  }

  return data;
}

/**
 * Function to load a pre-defined prompt based on name or path.
 *
 * @param {string} promptOption - The name or path of the prompt file.
 * @returns {string} - The content of the prompt file.
 * @throws {Error} - If the prompt file is not found.
 */
function loadPrePrompt(promptOption) {
  if (!promptOption) {
    throw new Error("Prompt option '-p' or '--prompt' requires a value.");
  }

  // Load the prompt file content
  return loadFile(promptOption, 'prompt');
}

// Execute the main function
main();