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
const commander = require('commander');
const yaml = require('js-yaml');
const readline = require('readline');

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
  .option('-c, --config <path>', 'Path to the configuration file (default: ./config/config.yaml)')
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
      prompt = await getPrompt();
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
 * Function to get the prompt message interactively.
 * @returns {Promise<string>} - The prompt message.
 */
async function getPrompt() {
  // Determine the EOF key based on the operating system
  const eofKey = os.platform() === 'win32' ? 'Ctrl+Z (then Enter)' : 'Ctrl+D';

  // Determine the input stream for readline
  let input = process.stdin;
  if (!process.stdin.isTTY) {
    // stdin is not a TTY (e.g., being piped), so try to read from /dev/tty
    try {
      input = fs.createReadStream('/dev/tty');
    } catch (err) {
      console.error('Cannot open /dev/tty for reading. Please provide a prompt using the -m option.');
      process.exit(1);
    }
  }

  console.error(`Enter your prompt (press ${eofKey} to submit):`);

  const rl = readline.createInterface({
    input: input,
      output: null,        // Prevents echoing the input
      terminal: false,     // Disables default terminal behavior
      prompt: "> "
  });

  const lines = [];

  return new Promise((resolve) => {
      process.stderr.write('> ')

    rl.on('line', (line) => {
      lines.push(line);
    });

    rl.on('close', () => {
      const prompt = lines.join('\n');
      if (!prompt.trim()) {
        console.error('Prompt cannot be empty. Please provide a prompt using the -m option.');
        process.exit(1);
      }
      resolve(prompt);
    });
  });
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
    console.error(`Output saved to ${outputFile}`);
  } else {
    // Output the result to stdout
    console.log(result);
  }
}

/**
 * Function to load a pre-defined prompt based on name or path.
 * @param {string} promptOption - The name or path of the prompt file.
 * @returns {string} - The content of the prompt file.
 */
function loadPrePrompt(promptOption) {
  let promptFilePath;

  // Check if the promptOption is a path to an existing file
  if (fs.existsSync(promptOption)) {
    promptFilePath = promptOption;
  } else {
    // Construct possible prompt directories
    const homeDir = os.homedir();
    const userPromptsDir = path.join(homeDir, '.config', 'pipe-ai', 'prompts');
    const defaultPromptsDir = path.join(__dirname, 'prompts');

    // Construct possible prompt file paths
    const userPromptPath = path.join(userPromptsDir, `${promptOption}.txt`);
    const defaultPromptPath = path.join(defaultPromptsDir, `${promptOption}.txt`);

    if (fs.existsSync(userPromptPath)) {
      promptFilePath = userPromptPath;
    } else if (fs.existsSync(defaultPromptPath)) {
      promptFilePath = defaultPromptPath;
    } else {
      throw new Error(`Prompt file '${promptOption}' not found.`);
    }
  }

  // Read and return the content of the prompt file
  const promptContent = fs.readFileSync(promptFilePath, 'utf8');
  return promptContent;
}

// Execute the main function
main();