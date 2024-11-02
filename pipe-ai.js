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
 *   and sends the data to the OpenAI API using the configuration specified in `config.yaml`.
 *   The response from the API is then output to stdout or saved to a file if the `-o` option is used.
 */

// Import necessary modules
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline').promises;
const commander = require('commander');
const yaml = require('js-yaml');

// Initialize the command-line interface
const program = new commander.Command();

// Define the CLI options and arguments
program
  .version('1.0.0')
  .description('A CLI tool to interface with AI APIs using piped input or files.')
  .argument('[file]', 'File path to read input from')
  .option('-m, --message <prompt>', 'Prompt message for the AI (default: ask)')
  .option('-o, --output <file>', 'Output file to save the AI response (default: stdout)')
  .option('-c, --config <path>', 'Path to the configuration file (default: ./config/config.yaml)')
  .parse(process.argv);

// Extract options and arguments
const options = program.opts();
const filePath = program.args[0];
const promptMessage = options.message;
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

    // Get prompt (from option or interactively)
    const prompt = await getPrompt(promptMessage);

    // Generate AI response
    const aiReply = await providerModule.getAIResponse(configData, inputData, prompt);

    // Output the AI's reply
    await outputResult(aiReply, outputFile);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

/**
 * Function to load the configuration based on the provided path.
 * @param {string} configOption - The configuration file path.
 * @returns {object} - The configuration data.
 */
function loadConfiguration(configOption) {
  const homeDir = os.homedir();
  const defaultConfigDir = path.join(homeDir, '.config', 'pipe-ai');
  const fallbackConfigDir = path.join(__dirname, 'config');
  let configFilePath;

  if (configOption) {
    configFilePath = path.resolve(configOption);
    if (!fs.existsSync(configFilePath)) {
      throw new Error(`Configuration file not found at ${configFilePath}`);
    }
  } else {
    // Try to load 'config.yaml' from the default directories
    const defaultConfigPath = path.join(defaultConfigDir, 'config.yaml');
    const fallbackConfigPath = path.join(fallbackConfigDir, 'config.yaml');

    if (fs.existsSync(defaultConfigPath)) {
      configFilePath = defaultConfigPath;
    } else if (fs.existsSync(fallbackConfigPath)) {
      configFilePath = fallbackConfigPath;
    } else {
      throw new Error('No configuration file found.');
    }
  }

  // Read and parse the configuration file
  const configContent = fs.readFileSync(configFilePath, 'utf8');
  const configData = yaml.load(configContent);
  return configData;
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
    console.error('No input provided. Please provide input via a file or stdin.');
    program.help()
    process.exit(1);
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