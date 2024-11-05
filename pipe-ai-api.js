// pipe-ai-api.js

import yaml from 'js-yaml';
import { loadFile, log } from './lib/utils.js';
import { getInteractiveUserPrompt, getPromptFromEditor, getFilename, getDirname } from './lib/common.js';

// Derive __dirname equivalent in ES modules
const __filename = getFilename(import.meta.url);
const __dirname = getDirname(import.meta.url);

/**
 * Function to load the configuration.
 *
 * @param {string} [configOption] - The configuration file path or name.
 * @returns {object} - The parsed configuration data.
 * @throws {Error} - If the configuration file is missing required fields or not found.
 */
export function loadConfiguration(configOption) {
  // Load the configuration file content
  const content = loadFile(configOption || 'config', 'config');

  // Parse the YAML configuration
  const data = yaml.load(content);

  // Validate that the 'provider' key exists
  if (!data.provider) {
    throw new Error("The 'provider' key is missing from the configuration file.");
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
export function loadPrePrompt(promptOption) {
  if (!promptOption) {
    throw new Error("Prompt option '-p' or '--prompt' requires a value.");
  }

  // Load the prompt file content
  return loadFile(promptOption, 'prompt');
}

/**
 * Determines and retrieves the main prompt based on user-specified options.
 *
 * @param {boolean} useEditor - Flag indicating whether to use the default editor for prompt composition.
 * @param {string} promptMessage - The custom message provided via the `-m` or `--message` option.
 * @param {string} prePrompt - The pre-defined prompt content loaded via the `-p` or `--prompt` option.
 * @returns {Promise<string>} - The final prompt to be used for the AI API.
 */
export async function getPrompt(useEditor, promptMessage, prePrompt) {
  // Initialize the prompt variable to store the final prompt
  let prompt = '';

  // Step 1: Use the default editor to compose the prompt if the `--editor` flag is set
  if (useEditor) {
    try {
      // Invoke the editor and await the user's input
      prompt = await getPromptFromEditor();
    } catch (err) {
      // Handle any errors that occur while opening the editor
      cleanup(err.message);
    }
  }

  // Step 2: Append the message provided via the `-m` or `--message` option, if available
  if (promptMessage) {
    prompt += `\n${promptMessage}`;
  }

  // Step 3: If no pre-prompt, no message, and editor is not used, invoke the interactive prompt
  if (!prePrompt && !promptMessage && !useEditor) {
    try {
      // Invoke an interactive prompt to get the user's input
      prompt = await getInteractiveUserPrompt();
    } catch (err) {
      // Handle any errors that occur during the interactive prompt
      cleanup(err.message);
    }
  }

  return prompt;
}

/**
 * Function to handle SIGINT signal (Ctrl+C).
 *
 * @param {Function} cleanupCallback - The cleanup function to execute.
 */
export function handleSigint(cleanupCallback) {
  cleanupCallback('Process interrupted by SIGINT (Ctrl+C).');
}

/**
 * Function to handle SIGTERM signal.
 *
 * @param {Function} cleanupCallback - The cleanup function to execute.
 */
export function handleSigterm(cleanupCallback) {
  cleanupCallback('Process terminated by SIGTERM.');
}

/**
 * Function to cleanup resources and exit the process.
 *
 * @param {string} message - The message to display upon cleanup.
 * @param {number} [exitCode=1] - The exit code for the process.
 */
export function cleanup(message, exitCode = 1) {
  if (message) {
    log.error(`${message}`);
  }
  log.debug('# Cleaning up…');
  process.stdin.resume(); // Ensure stdin is resumed
  if (exitCode !== 0) {
    process.exit(exitCode); // Exit the process with the provided exit code
  }
}
